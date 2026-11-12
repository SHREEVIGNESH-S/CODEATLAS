import React, { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import {
  Bug,
  AlertTriangle,
  Play,
  RotateCcw,
  CheckCircle2,
  FileCode2,
  Layers,
  ArrowRight,
  Sparkles,
  ExternalLink,
  ShieldAlert,
  Search,
  HelpCircle,
  Activity
} from 'lucide-react';
import { ArchitectureGraph, BugReport, CodeNode } from '../types/codeatlas';
import { RawParsedFile } from '../utils/parser';

interface BugDetectiveProps {
  graph: ArchitectureGraph;
  files: RawParsedFile[];
  repoName: string;
  onExploreFile?: (filePath: string, line?: number) => void;
  onAskTutor?: (question: string) => void;
}

const PRESET_ERRORS = [
  {
    label: 'TypeError in Request Dispatcher',
    error: 'TypeError: Cannot read properties of undefined (reading \'handle\')',
    stack: `TypeError: Cannot read properties of undefined (reading 'handle')
    at Function.app.handle (lib/application.js:158:14)
    at Server.app (lib/express.js:38:9)
    at Server.emit (events.js:315:20)
    at parserOnIncoming (_http_server.js:874:12)`,
    code: `app.handle = function handle(req, res, callback) {
  var router = this._router;
  router.handle(req, res, done);
};`
  },
  {
    label: 'Unhandled Promise in Route Middleware',
    error: 'UnhandledPromiseRejection: Invalid authentication token header',
    stack: `Error: Invalid authentication token header
    at verifySession (src/auth/session.ts:42:11)
    at Layer.handle [as handle_request] (lib/router/layer.js:95:5)
    at next (lib/router/route.js:144:13)`,
    code: `const token = req.headers['authorization'];
if (!token) throw new Error('Invalid authentication token header');`
  },
  {
    label: 'Assertion Failure in Query Parser',
    error: 'AssertionError [ERR_ASSERTION]: expected query object to have property \'filter\'',
    stack: `AssertionError [ERR_ASSERTION]: expected query object to have property 'filter'
    at queryParser (lib/middleware/query.js:45:10)
    at dispatch (lib/router/index.js:284:14)`,
    code: `assert.ok(req.query && typeof req.query === 'object');`
  }
];

export const BugDetective: React.FC<BugDetectiveProps> = ({
  graph,
  files,
  repoName,
  onExploreFile,
  onAskTutor
}) => {
  const [errorMessage, setErrorMessage] = useState(PRESET_ERRORS[0].error);
  const [stackTrace, setStackTrace] = useState(PRESET_ERRORS[0].stack);
  const [codeSnippet, setCodeSnippet] = useState(PRESET_ERRORS[0].code);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [bugReport, setBugReport] = useState<BugReport | null>(null);
  const [activeTab, setActiveTab] = useState<'causes' | 'path' | 'steps' | 'tests'>('causes');

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const animFrameIdRef = useRef<number | null>(null);

  // Trigger initial diagnosis on mount
  useEffect(() => {
    handleAnalyze();
  }, []);

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    try {
      const res = await fetch('/api/bug-detective', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repoName,
          errorMessage,
          stackTrace,
          codeSnippet,
          graph,
          files
        })
      });
      const data = await res.json();
      if (data.success && data.report) {
        setBugReport(data.report);
      }
    } catch (err) {
      console.error('Failed to analyze error:', err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSelectPreset = (preset: typeof PRESET_ERRORS[0]) => {
    setErrorMessage(preset.error);
    setStackTrace(preset.stack);
    setCodeSnippet(preset.code);
  };

  // 3D Investigation Path Visualization
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const width = canvas.clientWidth || 600;
    const height = canvas.clientHeight || 340;

    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(0xF8FAFC);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 8, 22);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    rendererRef.current = renderer;

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
    scene.add(ambientLight);
    const dirLight = new THREE.DirectionalLight(0x2563eb, 1.5);
    dirLight.position.set(10, 20, 10);
    scene.add(dirLight);

    // Subtle floor grid
    const grid = new THREE.GridHelper(30, 20, 0x93C5FD, 0xE2E8F0);
    grid.position.y = -2;
    scene.add(grid);

    // Render nodes
    const nodeGroup = new THREE.Group();
    scene.add(nodeGroup);

    const rootCauseId = bugReport?.rootCauseNodeId;
    const pathIds = new Set(bugReport?.investigationPathNodeIds || []);

    const displayNodes = graph.nodes.slice(0, 18);
    const nodePositions = new Map<string, THREE.Vector3>();

    displayNodes.forEach((node, i) => {
      const isRoot = node.id === rootCauseId;
      const isInPath = pathIds.has(node.id);

      // Circular ring layout
      const angle = (i / displayNodes.length) * Math.PI * 2;
      const radius = isRoot ? 1.5 : isInPath ? 5.5 : 9.5;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const y = isRoot ? 1.5 : (Math.sin(i * 1.5) * 1.2);

      const pos = new THREE.Vector3(x, y, z);
      nodePositions.set(node.id, pos);

      // Node geometry & material
      const size = isRoot ? 0.9 : isInPath ? 0.65 : 0.45;
      const geom = new THREE.SphereGeometry(size, 24, 24);
      
      let color = 0x3B82F6; // default blue
      let emissive = 0x1E40AF;
      if (isRoot) {
        color = 0xEF4444; // root cause red
        emissive = 0x991B1B;
      } else if (isInPath) {
        color = 0xF59E0B; // investigation path amber
        emissive = 0xB45309;
      }

      const mat = new THREE.MeshStandardMaterial({
        color,
        emissive,
        emissiveIntensity: isRoot ? 0.8 : isInPath ? 0.5 : 0.15,
        roughness: 0.2,
        metalness: 0.3
      });

      const mesh = new THREE.Mesh(geom, mat);
      mesh.position.copy(pos);
      nodeGroup.add(mesh);

      // Add beacon ring around root error
      if (isRoot) {
        const ringGeom = new THREE.RingGeometry(1.2, 1.4, 32);
        const ringMat = new THREE.MeshBasicMaterial({
          color: 0xEF4444,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.7
        });
        const ringMesh = new THREE.Mesh(ringGeom, ringMat);
        ringMesh.position.copy(pos);
        ringMesh.rotation.x = Math.PI / 2;
        nodeGroup.add(ringMesh);
      }
    });

    // Draw connection lines for investigation path
    const pathCurveGroup = new THREE.Group();
    scene.add(pathCurveGroup);

    if (rootCauseId && nodePositions.has(rootCauseId)) {
      const rootPos = nodePositions.get(rootCauseId)!;
      pathIds.forEach(targetId => {
        if (targetId !== rootCauseId && nodePositions.has(targetId)) {
          const tgtPos = nodePositions.get(targetId)!;
          const midPoint = new THREE.Vector3()
            .addVectors(rootPos, tgtPos)
            .multiplyScalar(0.5)
            .add(new THREE.Vector3(0, 1.5, 0));

          const curve = new THREE.QuadraticBezierCurve3(rootPos, midPoint, tgtPos);
          const points = curve.getPoints(24);
          const lineGeom = new THREE.BufferGeometry().setFromPoints(points);
          const lineMat = new THREE.LineBasicMaterial({
            color: 0xF59E0B,
            linewidth: 2,
            transparent: true,
            opacity: 0.85
          });
          const line = new THREE.Line(lineGeom, lineMat);
          pathCurveGroup.add(line);
        }
      });
    }

    // Animation loop
    let clock = new THREE.Clock();
    const animate = () => {
      const elapsedTime = clock.getElapsedTime();
      nodeGroup.rotation.y = elapsedTime * 0.08;
      pathCurveGroup.rotation.y = elapsedTime * 0.08;

      renderer.render(scene, camera);
      animFrameIdRef.current = requestAnimationFrame(animate);
    };
    animate();

    const handleResize = () => {
      if (!canvas) return;
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
      renderer.dispose();
    };
  }, [bugReport, graph]);

  return (
    <div className="space-y-6">
      
      {/* Top Header & Presets */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center font-bold">
              <Bug className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[#101828] flex items-center gap-2">
                AI Bug Detective
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200">
                  Root Cause Engine
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                Ground stack traces in repository AST, trace faulty execution paths, and isolate causes
              </p>
            </div>
          </div>

          {/* Preset Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-slate-400">Presets:</span>
            {PRESET_ERRORS.map((p, idx) => (
              <button
                key={idx}
                onClick={() => handleSelectPreset(p)}
                className="text-xs px-2.5 py-1.5 rounded-lg bg-slate-50 hover:bg-blue-50 hover:text-blue-700 text-slate-600 border border-slate-200 font-medium transition cursor-pointer"
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Input Form */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
              Error Message
            </label>
            <input
              type="text"
              value={errorMessage}
              onChange={(e) => setErrorMessage(e.target.value)}
              placeholder="e.g. TypeError: Cannot read properties of undefined"
              className="w-full text-xs font-mono p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-blue-500" />
              Stack Trace
            </label>
            <textarea
              rows={3}
              value={stackTrace}
              onChange={(e) => setStackTrace(e.target.value)}
              placeholder="Paste stack trace frames..."
              className="w-full text-xs font-mono p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800 resize-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <FileCode2 className="w-3.5 h-3.5 text-cyan-500" />
              Relevant Snippet (Optional)
            </label>
            <textarea
              rows={3}
              value={codeSnippet}
              onChange={(e) => setCodeSnippet(e.target.value)}
              placeholder="Paste offending code excerpt..."
              className="w-full text-xs font-mono p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800 resize-none"
            />
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4">
          <div className="text-xs text-slate-500 flex items-center gap-2">
            <Activity className="w-3.5 h-3.5 text-blue-600 animate-pulse" />
            <span>Scanning against <strong>{files.length}</strong> repository files and <strong>{graph.nodes.length}</strong> symbols</span>
          </div>
          
          <button
            onClick={handleAnalyze}
            disabled={isAnalyzing}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm shadow-blue-500/20 transition cursor-pointer disabled:opacity-50"
          >
            {isAnalyzing ? (
              <>
                <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                <span>Tracing Root Cause...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                <span>Run Bug Detective</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Analysis Results & 3D Investigation Workspace */}
      {bugReport && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Column: 3D Investigation Path Canvas */}
          <div className="lg:col-span-5 bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="font-bold text-sm text-[#101828] flex items-center gap-2">
                  <span>3D Investigation Path</span>
                </h3>
                <p className="text-[11px] text-slate-500">
                  Spatial visualization of error source and propagation
                </p>
              </div>
              <div className="flex items-center gap-2 text-[10px] font-semibold">
                <span className="flex items-center gap-1 text-red-600">
                  <span className="w-2 h-2 rounded-full bg-red-500" /> Root Cause
                </span>
                <span className="flex items-center gap-1 text-amber-600">
                  <span className="w-2 h-2 rounded-full bg-amber-500" /> Investigation Path
                </span>
              </div>
            </div>

            {/* 3D Canvas */}
            <div className="relative w-full h-[280px] rounded-xl overflow-hidden bg-slate-50 border border-slate-200/70">
              <canvas ref={canvasRef} className="w-full h-full block" />
              
              <div className="absolute bottom-2.5 left-2.5 bg-white/90 backdrop-blur-xs px-2.5 py-1.5 rounded-lg border border-slate-200 text-[11px] text-slate-600">
                Confidence: <strong className="text-blue-600">{bugReport.confidenceScore}%</strong>
              </div>
            </div>

            {/* Matched Elements Bar */}
            <div className="mt-4 pt-3 border-t border-slate-100 space-y-2">
              <div className="text-[11px] font-bold text-slate-700">Matched Stack Coordinates:</div>
              <div className="flex flex-wrap gap-1.5">
                {bugReport.matchedFiles.map((f, i) => (
                  <button
                    key={i}
                    onClick={() => onExploreFile?.(f)}
                    className="text-[11px] font-mono bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md border border-blue-200 hover:bg-blue-100 flex items-center gap-1 cursor-pointer"
                  >
                    <FileCode2 className="w-3 h-3" />
                    {f}
                  </button>
                ))}
                {bugReport.matchedFunctions.map((fn, i) => (
                  <span key={i} className="text-[11px] font-mono bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md border border-slate-200">
                    fn: {fn}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Grounded Evidence & Suggested Steps */}
          <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col">
            
            {/* Tab navigation */}
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-4">
              <button
                onClick={() => setActiveTab('causes')}
                className={`text-xs font-bold px-3 py-1.5 rounded-lg transition cursor-pointer ${
                  activeTab === 'causes' ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'text-slate-500 hover:bg-slate-50'
                }`}
              >
                Likely Causes ({bugReport.likelyCauses.length})
              </button>
              <button
                onClick={() => setActiveTab('steps')}
                className={`text-xs font-bold px-3 py-1.5 rounded-lg transition cursor-pointer ${
                  activeTab === 'steps' ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'text-slate-500 hover:bg-slate-50'
                }`}
              >
                Investigation Steps ({bugReport.suggestedInvestigationSteps.length})
              </button>
              <button
                onClick={() => setActiveTab('tests')}
                className={`text-xs font-bold px-3 py-1.5 rounded-lg transition cursor-pointer ${
                  activeTab === 'tests' ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'text-slate-500 hover:bg-slate-50'
                }`}
              >
                Relevant Tests ({bugReport.relevantTests.length})
              </button>
            </div>

            {/* TAB 1: LIKELY CAUSES */}
            {activeTab === 'causes' && (
              <div className="space-y-4 flex-1">
                {bugReport.likelyCauses.map((cause, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-blue-300 transition"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${
                          cause.probability === 'high' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}>
                          {cause.probability} Probability
                        </span>
                        <h4 className="font-bold text-xs text-[#101828]">{cause.title}</h4>
                      </div>
                      <span className="text-[11px] font-mono text-slate-500">
                        {cause.targetFile}:{cause.lineRange}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 leading-relaxed mb-3">
                      {cause.description}
                    </p>

                    {/* Code Excerpt */}
                    <div className="p-2.5 rounded-lg bg-slate-900 text-slate-200 font-mono text-[11px] overflow-x-auto">
                      <div className="text-[9px] uppercase tracking-wider text-slate-400 mb-1">
                        Grounded Excerpt ({cause.targetFile}):
                      </div>
                      <pre className="text-slate-100">{cause.codeExcerpt}</pre>
                    </div>

                    <div className="mt-3 flex items-center justify-end gap-2">
                      <button
                        onClick={() => onExploreFile?.(cause.targetFile)}
                        className="text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1 cursor-pointer"
                      >
                        Inspect in Explorer <ArrowRight className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => onAskTutor?.(`How do I fix the error "${bugReport.errorMessage}" in ${cause.targetFile}?`)}
                        className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
                      >
                        Ask Tutor for Patch <Sparkles className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* TAB 2: INVESTIGATION STEPS */}
            {activeTab === 'steps' && (
              <div className="space-y-3 flex-1">
                {bugReport.suggestedInvestigationSteps.map((step, idx) => (
                  <div key={idx} className="flex items-start gap-3 p-3.5 rounded-xl bg-blue-50/40 border border-blue-200/60">
                    <div className="w-6 h-6 rounded-lg bg-blue-600 text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                      {idx + 1}
                    </div>
                    <div className="text-xs text-slate-700 font-medium leading-relaxed">
                      {step}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* TAB 3: RELEVANT TESTS */}
            {activeTab === 'tests' && (
              <div className="space-y-3 flex-1">
                <p className="text-xs text-slate-500 mb-2">
                  Execute or inspect these test specifications to reproduce and verify the defect:
                </p>
                {bugReport.relevantTests.map((t, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 font-mono text-xs text-slate-800">
                    <span className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      {t}
                    </span>
                    <button
                      onClick={() => onExploreFile?.(t)}
                      className="text-xs font-sans text-blue-600 hover:underline font-semibold cursor-pointer"
                    >
                      View Spec
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Uncertainties & Caveats */}
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2 text-[11px] text-slate-400">
              <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
              <span>Static AST analysis verified. No live production memory heap was accessed.</span>
            </div>

          </div>

        </div>
      )}

    </div>
  );
};
