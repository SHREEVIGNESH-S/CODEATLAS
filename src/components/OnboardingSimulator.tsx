import React, { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import {
  Compass,
  CheckCircle2,
  Lock,
  ChevronRight,
  Sparkles,
  Trophy,
  ArrowRight,
  BookOpen,
  Award,
  HelpCircle,
  Clock,
  Layers,
  FileCode2,
  RotateCcw
} from 'lucide-react';
import { ArchitectureGraph, OnboardingSkillLevel, OnboardingStage, RepoMetadata } from '../types/codeatlas';
import { generateOnboardingStages } from '../utils/parser';

interface OnboardingSimulatorProps {
  graph: ArchitectureGraph;
  metadata: RepoMetadata;
  onExploreFile?: (filePath: string, line?: number) => void;
  onAskTutor?: (question: string) => void;
}

export const OnboardingSimulator: React.FC<OnboardingSimulatorProps> = ({
  graph,
  metadata,
  onExploreFile,
  onAskTutor
}) => {
  const [skillLevel, setSkillLevel] = useState<OnboardingSkillLevel>('Intermediate');
  const [stages, setStages] = useState<OnboardingStage[]>(() =>
    generateOnboardingStages(graph, metadata, 'Intermediate')
  );
  const [activeStageIndex, setActiveStageIndex] = useState<number>(0);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, number>>({});
  const [showFeedback, setShowFeedback] = useState<Record<string, boolean>>({});

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameIdRef = useRef<number | null>(null);

  // Re-generate or fetch stages when level or repo changes
  useEffect(() => {
    const updated = generateOnboardingStages(graph, metadata, skillLevel);
    setStages(updated);
    setActiveStageIndex(0);
    setQuizAnswers({});
    setShowFeedback({});
  }, [skillLevel, graph, metadata]);

  const activeStage = stages[activeStageIndex] || stages[0];

  const handleSelectOption = (challengeId: string, optionIndex: number) => {
    setQuizAnswers(prev => ({ ...prev, [challengeId]: optionIndex }));
    setShowFeedback(prev => ({ ...prev, [challengeId]: true }));

    // If correct, update challenge completion
    const challenge = activeStage.challenges.find(c => c.id === challengeId);
    if (challenge && challenge.correctAnswer === optionIndex) {
      setStages(prev =>
        prev.map((s, sIdx) => {
          if (sIdx !== activeStageIndex) return s;
          const newChallenges = s.challenges.map(c =>
            c.id === challengeId ? { ...c, isCompleted: true } : c
          );
          const allCompleted = newChallenges.every(c => c.isCompleted);
          return {
            ...s,
            challenges: newChallenges,
            isCompleted: allCompleted
          };
        })
      );

      // Unlock next stage if this stage completed
      if (activeStageIndex + 1 < stages.length) {
        setStages(prev =>
          prev.map((s, idx) =>
            idx === activeStageIndex + 1 ? { ...s, isUnlocked: true } : s
          )
        );
      }
    }
  };

  const handleCompleteManualChallenge = (challengeId: string) => {
    setStages(prev =>
      prev.map((s, sIdx) => {
        if (sIdx !== activeStageIndex) return s;
        const newChallenges = s.challenges.map(c =>
          c.id === challengeId ? { ...c, isCompleted: true } : c
        );
        const allCompleted = newChallenges.every(c => c.isCompleted);
        return {
          ...s,
          challenges: newChallenges,
          isCompleted: allCompleted
        };
      })
    );

    if (activeStageIndex + 1 < stages.length) {
      setStages(prev =>
        prev.map((s, idx) =>
          idx === activeStageIndex + 1 ? { ...s, isUnlocked: true } : s
        )
      );
    }
  };

  // 3D Milestone Pathway Visualization
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const width = canvas.clientWidth || 600;
    const height = canvas.clientHeight || 260;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xF8FAFC);

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 1000);
    camera.position.set(0, 7, 18);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.4);
    scene.add(ambientLight);
    const dirLight = new THREE.DirectionalLight(0x2563EB, 1.2);
    dirLight.position.set(5, 15, 10);
    scene.add(dirLight);

    // Pathway Platform Nodes
    const pathGroup = new THREE.Group();
    scene.add(pathGroup);

    const platformMeshes: THREE.Mesh[] = [];
    const stageCount = stages.length;
    const spacing = 3.6;
    const startX = -((stageCount - 1) * spacing) / 2;

    stages.forEach((stage, idx) => {
      const x = startX + idx * spacing;
      const y = Math.sin(idx * 0.8) * 0.6;
      const z = (idx - 2) * 0.4;

      const isCurrent = idx === activeStageIndex;
      const isDone = stage.isCompleted;
      const isLocked = !stage.isUnlocked;

      // Platform cylinder base
      const geom = new THREE.CylinderGeometry(1.0, 1.2, 0.4, 32);
      let color = 0x94A3B8; // locked grey
      let emissive = 0x334155;
      if (isDone) {
        color = 0x10B981; // emerald completed
        emissive = 0x047857;
      } else if (isCurrent) {
        color = 0x2563EB; // active blue
        emissive = 0x1D4ED8;
      } else if (!isLocked) {
        color = 0x38BDF8; // unlocked cyan
        emissive = 0x0284C7;
      }

      const mat = new THREE.MeshStandardMaterial({
        color,
        emissive,
        emissiveIntensity: isCurrent ? 0.6 : isDone ? 0.4 : 0.1,
        roughness: 0.3,
        metalness: 0.2
      });

      const mesh = new THREE.Mesh(geom, mat);
      mesh.position.set(x, y, z);
      pathGroup.add(mesh);
      platformMeshes.push(mesh);

      // Add a beacon crystal on active platform
      if (isCurrent) {
        const crystalGeom = new THREE.OctahedronGeometry(0.5, 0);
        const crystalMat = new THREE.MeshStandardMaterial({
          color: 0x60A5FA,
          emissive: 0x2563EB,
          emissiveIntensity: 0.8,
          roughness: 0.1,
          metalness: 0.4
        });
        const crystal = new THREE.Mesh(crystalGeom, crystalMat);
        crystal.position.set(x, y + 1.2, z);
        pathGroup.add(crystal);
      }

      // Connecting bridge tube to next platform
      if (idx < stageCount - 1) {
        const nextX = startX + (idx + 1) * spacing;
        const nextY = Math.sin((idx + 1) * 0.8) * 0.6;
        const nextZ = ((idx + 1) - 2) * 0.4;

        const p1 = new THREE.Vector3(x, y + 0.1, z);
        const p2 = new THREE.Vector3(nextX, nextY + 0.1, nextZ);
        const curve = new THREE.LineCurve3(p1, p2);
        const tubeGeom = new THREE.TubeGeometry(curve, 12, 0.08, 8, false);
        const tubeMat = new THREE.MeshStandardMaterial({
          color: isDone ? 0x10B981 : 0xCBD5E1,
          roughness: 0.5
        });
        const tube = new THREE.Mesh(tubeGeom, tubeMat);
        pathGroup.add(tube);
      }
    });

    let clock = new THREE.Clock();
    const animate = () => {
      const t = clock.getElapsedTime();
      pathGroup.rotation.y = Math.sin(t * 0.3) * 0.06;

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
  }, [stages, activeStageIndex]);

  const totalChallenges = stages.reduce((acc, s) => acc + s.challenges.length, 0);
  const completedChallenges = stages.reduce(
    (acc, s) => acc + s.challenges.filter(c => c.isCompleted).length,
    0
  );
  const progressPercent = Math.round((completedChallenges / totalChallenges) * 100) || 0;

  return (
    <div className="space-y-6">
      
      {/* Top Banner & Skill Level Toggle */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[#101828] flex items-center gap-2">
                Developer Onboarding Simulator
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                  5-Stage Mastery
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                Progressive guided learning journey through {metadata.name} architecture and code contracts
              </p>
            </div>
          </div>

          {/* Level Switcher */}
          <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-200">
            <span className="text-xs font-bold text-slate-400 pl-2">Level:</span>
            {(['Beginner', 'Intermediate', 'Advanced'] as OnboardingSkillLevel[]).map((lvl) => (
              <button
                key={lvl}
                onClick={() => setSkillLevel(lvl)}
                className={`text-xs font-bold px-3 py-1.5 rounded-lg transition cursor-pointer ${
                  skillLevel === lvl
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {lvl}
              </button>
            ))}
          </div>
        </div>

        {/* Overall Progress Bar */}
        <div className="mt-5 pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
            <Trophy className="w-4 h-4 text-amber-500" />
            <span>Onboarding Progress: <strong>{progressPercent}% Complete</strong></span>
            <span className="text-slate-400">({completedChallenges}/{totalChallenges} challenges passed)</span>
          </div>

          <div className="w-full sm:w-64 bg-slate-100 rounded-full h-2.5 overflow-hidden">
            <div
              className="bg-indigo-600 h-2.5 rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* 3D Milestone Pathway Visualization */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-sm text-[#101828] flex items-center gap-2">
            <span>3D Spatial Pathway Roadmap</span>
          </h3>
          <span className="text-xs text-slate-500">Click any unlocked stage below to jump in</span>
        </div>

        <div className="relative w-full h-[220px] rounded-xl overflow-hidden bg-slate-50 border border-slate-200/70">
          <canvas ref={canvasRef} className="w-full h-full block" />
        </div>

        {/* 5 Stage Horizontal Selector Pills */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mt-4">
          {stages.map((stage, idx) => {
            const isSelected = idx === activeStageIndex;
            const isCompleted = stage.isCompleted;
            const isLocked = !stage.isUnlocked;

            return (
              <button
                key={stage.stageNumber}
                onClick={() => {
                  if (!isLocked) setActiveStageIndex(idx);
                }}
                disabled={isLocked}
                className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                  isSelected
                    ? 'bg-indigo-50/80 border-indigo-400 ring-2 ring-indigo-500/20'
                    : isCompleted
                    ? 'bg-emerald-50/40 border-emerald-200 hover:bg-emerald-50/70'
                    : isLocked
                    ? 'bg-slate-50 border-slate-200 opacity-60 cursor-not-allowed'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Stage {stage.stageNumber}
                  </span>
                  {isCompleted ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  ) : isLocked ? (
                    <Lock className="w-3.5 h-3.5 text-slate-400" />
                  ) : (
                    <div className="w-2 h-2 rounded-full bg-indigo-600" />
                  )}
                </div>
                <div className="font-bold text-xs text-[#101828] truncate">
                  {stage.title.split('—')[1] || stage.title}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Stage Details & Challenges */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Stage Overview Card */}
        <div className="lg:col-span-4 bg-white p-6 rounded-2xl border border-slate-200/90 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
              Active Stage {activeStage.stageNumber}
            </span>
            <span className="text-xs text-slate-400 flex items-center gap-1 font-medium">
              <Clock className="w-3 h-3" /> ~{activeStage.estimatedMinutes} mins
            </span>
          </div>

          <div>
            <h3 className="font-bold text-base text-[#101828] mb-1">
              {activeStage.subtitle}
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              {activeStage.description}
            </p>
          </div>

          <div className="pt-3 border-t border-slate-100">
            <div className="text-[11px] font-bold text-slate-700 mb-2">Key Learning Concepts:</div>
            <div className="flex flex-wrap gap-1.5">
              {activeStage.keyConcepts.map((c, i) => (
                <span
                  key={i}
                  className="text-[11px] bg-slate-50 text-slate-700 px-2 py-0.5 rounded-md border border-slate-200 font-medium"
                >
                  {c}
                </span>
              ))}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100">
            <div className="text-[11px] font-bold text-slate-700 mb-2">Target Codebase Files:</div>
            <div className="space-y-1.5">
              {activeStage.associatedFiles.map((file, i) => (
                <button
                  key={i}
                  onClick={() => onExploreFile?.(file)}
                  className="w-full flex items-center justify-between p-2 rounded-lg bg-slate-50 hover:bg-indigo-50/60 border border-slate-200 text-xs text-slate-700 font-mono transition text-left cursor-pointer"
                >
                  <span className="flex items-center gap-1.5 truncate">
                    <FileCode2 className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                    {file}
                  </span>
                  <ArrowRight className="w-3 h-3 text-slate-400" />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Stage Challenges List */}
        <div className="lg:col-span-8 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-base text-[#101828]">
              Interactive Challenges & Assessments ({activeStage.challenges.length})
            </h3>
            <span className="text-xs text-slate-500">Submit answers to unlock progression</span>
          </div>

          {activeStage.challenges.map((challenge, cIdx) => {
            const isCompleted = challenge.isCompleted;
            const selectedOpt = quizAnswers[challenge.id];
            const hasSubmitted = showFeedback[challenge.id];
            const isCorrect = selectedOpt === challenge.correctAnswer;

            return (
              <div
                key={challenge.id}
                className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-xs space-y-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                        Challenge {cIdx + 1}
                      </span>
                      {isCompleted && (
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Passed
                        </span>
                      )}
                    </div>
                    <h4 className="font-bold text-sm text-[#101828]">
                      {challenge.title}
                    </h4>
                  </div>

                  {challenge.targetPath && (
                    <button
                      onClick={() => onExploreFile?.(challenge.targetPath!)}
                      className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 shrink-0 cursor-pointer"
                    >
                      Inspect Source <ArrowRight className="w-3 h-3" />
                    </button>
                  )}
                </div>

                <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-200/70">
                  {challenge.scenario}
                </p>

                {challenge.hint && (
                  <div className="text-[11px] text-slate-500 flex items-center gap-1.5 italic">
                    <HelpCircle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    Hint: {challenge.hint}
                  </div>
                )}

                {/* Question Options if available */}
                {challenge.options && challenge.options.length > 0 ? (
                  <div className="space-y-2">
                    {challenge.options.map((opt, optIdx) => {
                      const isOptionSelected = selectedOpt === optIdx;
                      let btnStyle = 'border-slate-200 hover:bg-slate-50 text-slate-700';

                      if (hasSubmitted) {
                        if (optIdx === challenge.correctAnswer) {
                          btnStyle = 'bg-emerald-50 border-emerald-300 text-emerald-800 font-bold';
                        } else if (isOptionSelected) {
                          btnStyle = 'bg-red-50 border-red-300 text-red-800';
                        }
                      }

                      return (
                        <button
                          key={optIdx}
                          onClick={() => handleSelectOption(challenge.id, optIdx)}
                          disabled={isCompleted}
                          className={`w-full text-left p-3 rounded-xl border text-xs transition flex items-center gap-2.5 cursor-pointer ${btnStyle}`}
                        >
                          <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold flex items-center justify-center shrink-0">
                            {String.fromCharCode(65 + optIdx)}
                          </span>
                          <span className="flex-1">{opt}</span>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  // Manual code verification action
                  <div className="flex items-center justify-end">
                    <button
                      onClick={() => handleCompleteManualChallenge(challenge.id)}
                      disabled={isCompleted}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs transition cursor-pointer disabled:opacity-50"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{isCompleted ? 'Challenge Verified' : 'Mark Task Inspected & Complete'}</span>
                    </button>
                  </div>
                )}

                {/* Feedback / Explanation Drawer */}
                {hasSubmitted && (
                  <div className={`p-3 rounded-xl text-xs leading-relaxed border ${
                    isCorrect ? 'bg-emerald-50/60 border-emerald-200 text-emerald-800' : 'bg-red-50/60 border-red-200 text-red-800'
                  }`}>
                    <div className="font-bold mb-1">
                      {isCorrect ? '✓ Correct Answer!' : '✗ Incomplete / Incorrect'}
                    </div>
                    <div>{challenge.explanation}</div>
                  </div>
                )}

              </div>
            );
          })}
        </div>

      </div>

    </div>
  );
};
