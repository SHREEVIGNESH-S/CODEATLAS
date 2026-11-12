import React, { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import {
  Globe,
  Search,
  Filter,
  Send,
  Code,
  FileCode2,
  Database,
  ArrowRight,
  Copy,
  Check,
  Server,
  Terminal,
  Shield,
  Layers,
  Sparkles
} from 'lucide-react';
import { APIRoute, HTTPMethod } from '../types/codeatlas';
import { extractAPIRoutes, RawParsedFile } from '../utils/parser';

interface APIUniverseProps {
  files: RawParsedFile[];
  repoName: string;
  onExploreFile?: (filePath: string, line?: number) => void;
  onAskTutor?: (question: string) => void;
}

export const APIUniverse: React.FC<APIUniverseProps> = ({
  files,
  repoName,
  onExploreFile,
  onAskTutor
}) => {
  const [routes, setRoutes] = useState<APIRoute[]>(() => extractAPIRoutes(files));
  const [selectedRoute, setSelectedRoute] = useState<APIRoute | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMethod, setSelectedMethod] = useState<HTTPMethod | 'ALL'>('ALL');
  const [copiedCurl, setCopiedCurl] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameIdRef = useRef<number | null>(null);

  useEffect(() => {
    const extracted = extractAPIRoutes(files);
    setRoutes(extracted);
    if (extracted.length > 0 && !selectedRoute) {
      setSelectedRoute(extracted[0]);
    }
  }, [files]);

  const filteredRoutes = routes.filter(r => {
    const matchesMethod = selectedMethod === 'ALL' || r.method === selectedMethod;
    const matchesQuery =
      r.path.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.handlerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.filePath.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesMethod && matchesQuery;
  });

  const getMethodBadge = (method: HTTPMethod) => {
    switch (method) {
      case 'GET':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'POST':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'PUT':
      case 'PATCH':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'DELETE':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      default:
        return 'bg-purple-50 text-purple-700 border-purple-200';
    }
  };

  const handleCopyCurl = (route: APIRoute) => {
    const cmd = `curl -X ${route.method} "http://localhost:3000${route.path}" \\
  -H "Content-Type: application/json"${route.method !== 'GET' ? ' \\\n  -d \'{"sample": "data"}\'' : ''}`;
    navigator.clipboard.writeText(cmd);
    setCopiedCurl(true);
    setTimeout(() => setCopiedCurl(false), 2000);
  };

  // 3D API Universe Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const width = canvas.clientWidth || 600;
    const height = canvas.clientHeight || 320;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xF8FAFC);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 10, 20);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.3);
    scene.add(ambientLight);
    const dirLight = new THREE.DirectionalLight(0x2563EB, 1.2);
    dirLight.position.set(10, 20, 10);
    scene.add(dirLight);

    const universeGroup = new THREE.Group();
    scene.add(universeGroup);

    // 1. Central API Gateway Node
    const gwGeom = new THREE.IcosahedronGeometry(1.4, 1);
    const gwMat = new THREE.MeshStandardMaterial({
      color: 0x2563EB,
      emissive: 0x1D4ED8,
      emissiveIntensity: 0.6,
      roughness: 0.2,
      metalness: 0.3
    });
    const gwMesh = new THREE.Mesh(gwGeom, gwMat);
    gwMesh.position.set(0, 0, 0);
    universeGroup.add(gwMesh);

    // Gateway outer halo
    const haloGeom = new THREE.RingGeometry(1.8, 2.0, 32);
    const haloMat = new THREE.MeshBasicMaterial({
      color: 0x60A5FA,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.5
    });
    const haloMesh = new THREE.Mesh(haloGeom, haloMat);
    haloMesh.rotation.x = Math.PI / 2;
    universeGroup.add(haloMesh);

    // 2. Client Nodes (Frontend callers) on the left
    const clientGeom = new THREE.BoxGeometry(0.9, 0.9, 0.9);
    const clientMat = new THREE.MeshStandardMaterial({
      color: 0x06B6D4,
      emissive: 0x0891B2,
      emissiveIntensity: 0.5,
      roughness: 0.2
    });
    const clientMesh = new THREE.Mesh(clientGeom, clientMat);
    clientMesh.position.set(-8, 1, 0);
    universeGroup.add(clientMesh);

    // Client connection to Gateway
    const clientLineGeom = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-8, 1, 0),
      new THREE.Vector3(0, 0, 0)
    ]);
    const clientLineMat = new THREE.LineDashedMaterial({
      color: 0x06B6D4,
      dashSize: 0.5,
      gapSize: 0.2
    });
    const clientLine = new THREE.Line(clientLineGeom, clientLineMat);
    clientLine.computeLineDistances();
    universeGroup.add(clientLine);

    // 3. Database Node on the bottom
    const dbGeom = new THREE.CylinderGeometry(1.0, 1.0, 0.8, 24);
    const dbMat = new THREE.MeshStandardMaterial({
      color: 0x8B5CF6,
      emissive: 0x6D28D9,
      emissiveIntensity: 0.5,
      roughness: 0.3
    });
    const dbMesh = new THREE.Mesh(dbGeom, dbMat);
    dbMesh.position.set(0, -5, 0);
    universeGroup.add(dbMesh);

    // Database connection to Gateway
    const dbLineGeom = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, -5, 0)
    ]);
    const dbLine = new THREE.Line(dbLineGeom, new THREE.LineBasicMaterial({ color: 0x8B5CF6, opacity: 0.6, transparent: true }));
    universeGroup.add(dbLine);

    // 4. Route Nodes orbiting the gateway
    const routeNodes = routes.slice(0, 12);
    const routeMeshes: THREE.Mesh[] = [];

    routeNodes.forEach((r, idx) => {
      const angle = (idx / routeNodes.length) * Math.PI * 2;
      const radius = 6.2 + (idx % 2 === 0 ? 1.0 : -0.8);
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const y = Math.sin(idx * 2) * 1.5;

      const isSelected = selectedRoute?.id === r.id;
      const nodeGeom = new THREE.SphereGeometry(isSelected ? 0.75 : 0.5, 24, 24);

      let color = 0x10B981; // GET emerald
      if (r.method === 'POST') color = 0x2563EB; // POST blue
      else if (r.method === 'PUT' || r.method === 'PATCH') color = 0xF59E0B; // PUT amber
      else if (r.method === 'DELETE') color = 0xF43F5E; // DELETE rose

      const nodeMat = new THREE.MeshStandardMaterial({
        color,
        emissive: color,
        emissiveIntensity: isSelected ? 0.9 : 0.3,
        roughness: 0.2
      });

      const rMesh = new THREE.Mesh(nodeGeom, nodeMat);
      rMesh.position.set(x, y, z);
      universeGroup.add(rMesh);
      routeMeshes.push(rMesh);

      // Connection from Gateway to Route endpoint
      const p1 = new THREE.Vector3(0, 0, 0);
      const p2 = new THREE.Vector3(x, y, z);
      const lineGeom = new THREE.BufferGeometry().setFromPoints([p1, p2]);
      const lineMat = new THREE.LineBasicMaterial({
        color,
        transparent: true,
        opacity: isSelected ? 0.9 : 0.35
      });
      const line = new THREE.Line(lineGeom, lineMat);
      universeGroup.add(line);
    });

    let clock = new THREE.Clock();
    const animate = () => {
      const t = clock.getElapsedTime();
      universeGroup.rotation.y = t * 0.05;
      gwMesh.rotation.x = t * 0.1;
      gwMesh.rotation.y = t * 0.15;

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
  }, [routes, selectedRoute]);

  return (
    <div className="space-y-6">
      
      {/* Top Banner & Stats */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center font-bold">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[#101828] flex items-center gap-2">
                API Universe Explorer
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-cyan-50 text-cyan-700 border border-cyan-200">
                  {routes.length} Endpoints Discovered
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                Spatial map of HTTP routes, request/response contracts, middleware layers, and client consumers
              </p>
            </div>
          </div>

          {/* Quick Filters */}
          <div className="flex flex-wrap items-center gap-1.5 bg-slate-50 p-1.5 rounded-xl border border-slate-200">
            {(['ALL', 'GET', 'POST', 'PUT', 'DELETE'] as const).map(m => (
              <button
                key={m}
                onClick={() => setSelectedMethod(m)}
                className={`text-xs font-bold px-2.5 py-1 rounded-lg transition cursor-pointer ${
                  selectedMethod === m
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        {/* Search input */}
        <div className="mt-4 pt-4 border-t border-slate-100 flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter by endpoint path, handler name, or file..."
              className="w-full text-xs pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800"
            />
          </div>
        </div>
      </div>

      {/* 3D Visual API Universe Canvas */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="font-bold text-sm text-[#101828] flex items-center gap-2">
              <span>3D Gateway & Endpoint Topology</span>
            </h3>
            <p className="text-[11px] text-slate-500">
              Interactive spatial network showing clients, central router, and downstream data layers
            </p>
          </div>
          <div className="flex items-center gap-3 text-[11px] font-semibold">
            <span className="flex items-center gap-1 text-cyan-600">
              <span className="w-2 h-2 rounded-full bg-cyan-500" /> Client Caller
            </span>
            <span className="flex items-center gap-1 text-blue-600">
              <span className="w-2 h-2 rounded-full bg-blue-600" /> API Gateway
            </span>
            <span className="flex items-center gap-1 text-purple-600">
              <span className="w-2 h-2 rounded-full bg-purple-500" /> Database Store
            </span>
          </div>
        </div>

        <div className="relative w-full h-[260px] rounded-xl overflow-hidden bg-slate-50 border border-slate-200/70">
          <canvas ref={canvasRef} className="w-full h-full block" />
        </div>
      </div>

      {/* Routes List & Detail Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left: Discovered Routes List */}
        <div className="lg:col-span-5 bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col max-h-[560px]">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-sm text-[#101828]">
              Discovered Endpoints ({filteredRoutes.length})
            </h3>
            <span className="text-[11px] text-slate-400">Click to inspect contract</span>
          </div>

          <div className="space-y-2 overflow-y-auto flex-1 pr-1">
            {filteredRoutes.map((r) => {
              const isSelected = selectedRoute?.id === r.id;
              return (
                <button
                  key={r.id}
                  onClick={() => setSelectedRoute(r)}
                  className={`w-full p-3 rounded-xl border text-left transition cursor-pointer ${
                    isSelected
                      ? 'bg-blue-50/70 border-blue-400 ring-2 ring-blue-500/10'
                      : 'bg-slate-50/40 border-slate-200/80 hover:bg-slate-50 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className={`text-[10px] uppercase font-extrabold px-2 py-0.5 rounded border ${getMethodBadge(r.method)}`}>
                      {r.method}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">
                      line {r.line}
                    </span>
                  </div>
                  <div className="font-mono text-xs font-bold text-[#101828] truncate mb-1">
                    {r.path}
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span className="truncate">fn: {r.handlerName}</span>
                    <span className="text-slate-400 text-[10px] font-mono truncate max-w-[120px]">
                      {r.filePath.split('/').pop()}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Selected Route Contract Details */}
        <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col justify-between">
          {selectedRoute ? (
            <div className="space-y-5">
              
              {/* Route Header */}
              <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className={`text-[11px] uppercase font-extrabold px-2.5 py-0.5 rounded-md border ${getMethodBadge(selectedRoute.method)}`}>
                      {selectedRoute.method}
                    </span>
                    <span className="text-xs font-mono font-bold text-[#101828]">
                      {selectedRoute.path}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span>Handler: <strong className="text-slate-800 font-mono">{selectedRoute.handlerName}</strong></span>
                    <span>•</span>
                    <button
                      onClick={() => onExploreFile?.(selectedRoute.filePath, selectedRoute.line)}
                      className="text-blue-600 hover:underline flex items-center gap-1 font-mono cursor-pointer"
                    >
                      <FileCode2 className="w-3 h-3" />
                      {selectedRoute.filePath}:{selectedRoute.line}
                    </button>
                  </div>
                </div>

                <button
                  onClick={() => handleCopyCurl(selectedRoute)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-700 transition cursor-pointer"
                >
                  {copiedCurl ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-700">Copied cURL</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-slate-500" />
                      <span>Copy cURL</span>
                    </>
                  )}
                </button>
              </div>

              {/* Path & Query Parameters */}
              <div>
                <h4 className="text-xs font-bold text-slate-700 mb-2 flex items-center gap-1.5">
                  <Terminal className="w-3.5 h-3.5 text-blue-500" />
                  Parameters ({selectedRoute.parameters.length})
                </h4>
                {selectedRoute.parameters.length > 0 ? (
                  <div className="space-y-1.5">
                    {selectedRoute.parameters.map((p, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-200/80 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-slate-800">{p.name}</span>
                          <span className="text-[10px] uppercase font-bold text-slate-500 bg-slate-200/60 px-1.5 py-0.5 rounded">
                            {p.in}
                          </span>
                          <span className="text-slate-400 font-mono text-[11px]">({p.type})</span>
                        </div>
                        <span className="text-slate-500 text-[11px]">{p.description}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">No path or query parameters required.</p>
                )}
              </div>

              {/* Request & Response Schemas */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <h4 className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Send className="w-3.5 h-3.5 text-indigo-500" />
                    Request Contract
                  </h4>
                  <pre className="p-3 rounded-xl bg-slate-900 text-slate-100 font-mono text-[11px] overflow-x-auto">
                    {selectedRoute.requestSchema ? JSON.stringify(selectedRoute.requestSchema, null, 2) : '// No body payload (GET)'}
                  </pre>
                </div>

                <div className="space-y-1.5">
                  <h4 className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-emerald-500" />
                    Response Contract
                  </h4>
                  <pre className="p-3 rounded-xl bg-slate-900 text-slate-100 font-mono text-[11px] overflow-x-auto">
                    {JSON.stringify(selectedRoute.responseSchema || { status: '200 OK' }, null, 2)}
                  </pre>
                </div>
              </div>

              {/* Middleware Pipeline */}
              {selectedRoute.middleware.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-slate-700 mb-2 flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-amber-500" />
                    Middleware Pipeline
                  </h4>
                  <div className="flex flex-wrap items-center gap-2">
                    {selectedRoute.middleware.map((mw, idx) => (
                      <span key={idx} className="text-xs font-mono bg-amber-50 text-amber-800 px-2.5 py-1 rounded-lg border border-amber-200">
                        {mw}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Calling Client Components */}
              <div>
                <h4 className="text-xs font-bold text-slate-700 mb-2 flex items-center gap-1.5">
                  <FileCode2 className="w-3.5 h-3.5 text-cyan-500" />
                  Frontend & Client Callers ({selectedRoute.callingClientComponents.length})
                </h4>
                {selectedRoute.callingClientComponents.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {selectedRoute.callingClientComponents.map((c, idx) => (
                      <button
                        key={idx}
                        onClick={() => onExploreFile?.(c)}
                        className="text-xs font-mono bg-cyan-50 text-cyan-800 px-2.5 py-1 rounded-lg border border-cyan-200 hover:bg-cyan-100 flex items-center gap-1.5 cursor-pointer"
                      >
                        <FileCode2 className="w-3.5 h-3.5" />
                        {c}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">No direct in-repo client fetch invocations detected.</p>
                )}
              </div>

            </div>
          ) : (
            <div className="text-center py-16 text-slate-400 text-xs">
              Select an endpoint to inspect its contract
            </div>
          )}

          <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[11px] text-slate-400">
              Static route analysis inferred from route declarations and AST decorators.
            </span>
            {selectedRoute && (
              <button
                onClick={() => onAskTutor?.(`Explain how route ${selectedRoute.method} ${selectedRoute.path} works in this repository.`)}
                className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
              >
                Ask Tutor About Route <Sparkles className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

      </div>

    </div>
  );
};
