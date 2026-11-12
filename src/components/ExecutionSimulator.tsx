import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  RotateCcw,
  Gauge,
  Cpu,
  FileCode2,
  CheckCircle2,
  Sparkles,
  GitBranch,
  ArrowRight,
  Variable,
  Layers,
  HelpCircle,
  Activity
} from 'lucide-react';
import { ArchitectureGraph, CodeNode, ExecutionFlowTrace, ExecutionStep } from '../types/codeatlas';
import { buildExecutionFlow, RawParsedFile } from '../utils/parser';

interface ExecutionSimulatorProps {
  graph: ArchitectureGraph;
  files: RawParsedFile[];
  repoName: string;
  onExploreFile?: (filePath: string, line?: number) => void;
  onAskTutor?: (question: string) => void;
}

export const ExecutionSimulator: React.FC<ExecutionSimulatorProps> = ({
  graph,
  files,
  repoName,
  onExploreFile,
  onAskTutor
}) => {
  // Available functions in repository
  const availableFunctions = graph.nodes.filter(n => n.type === 'function');
  const [selectedFunctionId, setSelectedFunctionId] = useState<string>(
    availableFunctions[0]?.id || graph.nodes[0]?.id || ''
  );

  const [trace, setTrace] = useState<ExecutionFlowTrace>(() =>
    buildExecutionFlow(graph, files, selectedFunctionId)
  );

  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1); // 0.5x, 1x, 2x
  const [explanationLevel, setExplanationLevel] = useState<'simple' | 'detailed' | 'technical'>('detailed');

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Re-build trace when target function changes
  useEffect(() => {
    if (selectedFunctionId) {
      const newTrace = buildExecutionFlow(graph, files, selectedFunctionId);
      setTrace(newTrace);
      setCurrentStepIndex(0);
      setIsPlaying(false);
    }
  }, [selectedFunctionId, graph, files]);

  // Handle Play/Pause timer loop
  useEffect(() => {
    if (isPlaying) {
      const intervalMs = 2000 / playbackSpeed;
      timerRef.current = setInterval(() => {
        setCurrentStepIndex(prev => {
          if (prev >= trace.steps.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, intervalMs);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, playbackSpeed, trace.steps.length]);

  const activeStep: ExecutionStep = trace.steps[currentStepIndex] || trace.steps[0];

  const handleNext = () => {
    if (currentStepIndex < trace.steps.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1);
    }
  };

  const handleReset = () => {
    setIsPlaying(false);
    setCurrentStepIndex(0);
  };

  const getStepTypeBadge = (type: ExecutionStep['type']) => {
    switch (type) {
      case 'entry':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'branch':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'call':
        return 'bg-cyan-50 text-cyan-700 border-cyan-200';
      case 'mutation':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'return':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner & Function Selector */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[#101828] flex items-center gap-2">
                Execution Flow Simulator
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                  Step-by-Step Tracer
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                Simulate call stack allocation, branch evaluation, variable state transitions, and return lifecycles
              </p>
            </div>
          </div>

          {/* Function Selector Dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-400">Target Function:</span>
            <select
              value={selectedFunctionId}
              onChange={(e) => setSelectedFunctionId(e.target.value)}
              className="text-xs font-mono font-bold px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800 cursor-pointer"
            >
              {availableFunctions.map((fn) => (
                <option key={fn.id} value={fn.id}>
                  {fn.name}() — {fn.path.split('/').pop()}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Playback Controls Bar */}
        <div className="mt-5 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrev}
              disabled={currentStepIndex === 0}
              className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 disabled:opacity-40 transition cursor-pointer"
              title="Previous Step"
            >
              <SkipBack className="w-4 h-4" />
            </button>

            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm shadow-blue-500/20 transition cursor-pointer"
            >
              {isPlaying ? (
                <>
                  <Pause className="w-4 h-4" /> Pause
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" /> Play Trace
                </>
              )}
            </button>

            <button
              onClick={handleNext}
              disabled={currentStepIndex === trace.steps.length - 1}
              className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 disabled:opacity-40 transition cursor-pointer"
              title="Next Step"
            >
              <SkipForward className="w-4 h-4" />
            </button>

            <button
              onClick={handleReset}
              className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 transition cursor-pointer ml-1"
              title="Reset to Step 1"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            <div className="text-xs font-mono font-bold text-slate-700 pl-3">
              Step {currentStepIndex + 1} of {trace.steps.length}
            </div>
          </div>

          {/* Speed Selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-400 flex items-center gap-1">
              <Gauge className="w-3.5 h-3.5" /> Speed:
            </span>
            {[0.5, 1, 2].map(speed => (
              <button
                key={speed}
                onClick={() => setPlaybackSpeed(speed)}
                className={`text-xs font-bold px-2.5 py-1 rounded-lg transition cursor-pointer ${
                  playbackSpeed === speed
                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                {speed}x
              </button>
            ))}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-slate-100 rounded-full h-1.5 mt-4 overflow-hidden">
          <div
            className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
            style={{ width: `${((currentStepIndex + 1) / trace.steps.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Main Simulation Viewport */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Code View with Active Execution Pointer */}
        <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-sm text-[#101828] flex items-center gap-2">
                <span>Active Instruction Pointer</span>
                <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${getStepTypeBadge(activeStep.type)}`}>
                  {activeStep.type}
                </span>
              </h3>
              <p className="text-[11px] text-slate-500 font-mono">
                {activeStep.filePath}:{activeStep.line}
              </p>
            </div>

            <button
              onClick={() => onExploreFile?.(activeStep.filePath, activeStep.line)}
              className="text-xs font-semibold text-blue-600 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <FileCode2 className="w-3.5 h-3.5" /> View in File Explorer
            </button>
          </div>

          {/* Stepped Code Block */}
          <div className="rounded-xl bg-slate-900 text-slate-100 p-4 font-mono text-xs overflow-x-auto space-y-1">
            {trace.steps.map((st, idx) => {
              const isActive = idx === currentStepIndex;
              const isPast = idx < currentStepIndex;

              return (
                <div
                  key={idx}
                  onClick={() => setCurrentStepIndex(idx)}
                  className={`flex items-center gap-3 py-1.5 px-2.5 rounded-lg transition cursor-pointer ${
                    isActive
                      ? 'bg-blue-600/30 border border-blue-500 text-white font-bold'
                      : isPast
                      ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  <span className={`w-6 text-[10px] select-none text-right font-mono ${
                    isActive ? 'text-cyan-400' : 'text-slate-600'
                  }`}>
                    {st.line}
                  </span>

                  <span className="w-4 select-none">
                    {isActive ? '▶' : isPast ? '✓' : ' '}
                  </span>

                  <pre className="flex-1 overflow-x-auto m-0 p-0">{st.statement}</pre>
                </div>
              );
            })}
          </div>

          {/* Live Variable & Frame State */}
          <div className="mt-5 pt-4 border-t border-slate-100">
            <h4 className="text-xs font-bold text-slate-700 mb-2 flex items-center gap-1.5">
              <Variable className="w-3.5 h-3.5 text-blue-500" />
              Runtime Activation Record & Frame State
            </h4>

            {activeStep.variableState ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {Object.entries(activeStep.variableState).map(([k, v]) => (
                  <div key={k} className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      {k}
                    </div>
                    <div className="font-mono text-xs font-bold text-slate-800 truncate">
                      {v}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">No mutations on this execution step.</p>
            )}
          </div>
        </div>

        {/* Right Column: 3-Level AI Explanation Panel */}
        <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col justify-between">
          <div className="space-y-4">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-sm text-[#101828] flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-blue-600" />
                  3-Level Explanation
                </h3>
                <p className="text-[11px] text-slate-500">
                  Select depth perspective for step {currentStepIndex + 1}
                </p>
              </div>

              {/* 3-Level Depth Pills */}
              <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl border border-slate-200">
                {(['simple', 'detailed', 'technical'] as const).map(lvl => (
                  <button
                    key={lvl}
                    onClick={() => setExplanationLevel(lvl)}
                    className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-lg transition cursor-pointer ${
                      explanationLevel === lvl
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
            </div>

            {/* Explanation Content Box */}
            <div className="p-4 rounded-xl bg-gradient-to-br from-[#EEF5FF] to-blue-50/50 border border-blue-200/70">
              <div className="text-[10px] font-bold uppercase tracking-wider text-blue-700 mb-1">
                {explanationLevel === 'simple' && 'Intuitive Metaphor & Analogy'}
                {explanationLevel === 'detailed' && 'Logical Execution & Control Flow'}
                {explanationLevel === 'technical' && 'Runtime Memory & Stack Mechanics'}
              </div>

              <p className="text-xs text-slate-800 leading-relaxed font-medium">
                {explanationLevel === 'simple' && activeStep.simpleExplanation}
                {explanationLevel === 'detailed' && activeStep.detailedExplanation}
                {explanationLevel === 'technical' && activeStep.technicalExplanation}
              </p>
            </div>

            {/* Contextual Description */}
            <div className="space-y-1.5">
              <div className="text-xs font-bold text-slate-700">Operational Breakdown:</div>
              <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-200/70">
                {activeStep.description}
              </p>
            </div>

            {/* Step summary pills */}
            <div className="pt-2 space-y-2">
              <div className="text-[11px] font-bold text-slate-700">Execution Topology:</div>
              <div className="flex flex-wrap items-center gap-1.5 text-xs font-mono">
                {trace.steps.map((s, idx) => (
                  <span
                    key={idx}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                      idx === currentStepIndex
                        ? 'bg-blue-600 text-white border-blue-600 ring-2 ring-blue-500/20'
                        : idx < currentStepIndex
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-slate-50 text-slate-400 border-slate-200'
                    }`}
                  >
                    {s.type}
                  </span>
                ))}
              </div>
            </div>

          </div>

          <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[11px] text-slate-400">
              Static symbolic execution simulation.
            </span>
            <button
              onClick={() => onAskTutor?.(`Explain step ${currentStepIndex + 1} (${activeStep.statement}) in ${trace.rootFunctionName}`)}
              className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
            >
              Ask AI Tutor <Sparkles className="w-3 h-3" />
            </button>
          </div>
        </div>

      </div>

    </div>
  );
};
