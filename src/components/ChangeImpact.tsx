import React, { useState, useMemo } from 'react';
import {
  ArchitectureGraph,
  CodeNode,
  ChangeImpactResult
} from '../types/codeatlas';
import { computeChangeImpact } from '../utils/parser';
import {
  ShieldAlert,
  AlertTriangle,
  ArrowRight,
  GitPullRequest,
  CheckCircle2,
  Cpu,
  Layers,
  FileCode,
  Search,
  Sparkles,
  Network
} from 'lucide-react';

interface ChangeImpactProps {
  graph: ArchitectureGraph;
  selectedNode: CodeNode | null;
  onSelectNode: (node: CodeNode) => void;
  onAskTutor: (question: string) => void;
}

export const ChangeImpact: React.FC<ChangeImpactProps> = ({
  graph,
  selectedNode,
  onSelectNode,
  onAskTutor
}) => {
  const [targetId, setTargetId] = useState<string>(
    selectedNode?.id || graph.nodes[0]?.id || ''
  );
  const [filterQuery, setFilterQuery] = useState('');

  // Update target when selected node prop changes
  React.useEffect(() => {
    if (selectedNode) {
      setTargetId(selectedNode.id);
    }
  }, [selectedNode]);

  // Compute impact for the selected target
  const impactResult: ChangeImpactResult | null = useMemo(() => {
    if (!targetId || graph.nodes.length === 0) return null;
    try {
      return computeChangeImpact(graph, targetId);
    } catch {
      return null;
    }
  }, [graph, targetId]);

  const candidateNodes = useMemo(() => {
    return graph.nodes.filter(
      (n) =>
        n.name.toLowerCase().includes(filterQuery.toLowerCase()) ||
        n.path.toLowerCase().includes(filterQuery.toLowerCase())
    );
  }, [graph.nodes, filterQuery]);

  const getRiskBadge = (risk: string) => {
    switch (risk) {
      case 'Critical':
        return 'bg-rose-100 text-rose-800 border-rose-300';
      case 'High':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'Medium':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      default:
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 space-y-8">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-6 border-b border-slate-200/80">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-xs font-semibold text-amber-800 mb-2">
            <ShieldAlert className="w-3.5 h-3.5" />
            Static Analysis & Semantic Blast Radius Engine
          </div>
          <h2 className="text-2xl font-bold text-[#101828]">Change Impact Analysis</h2>
          <p className="text-sm text-slate-500 mt-1 max-w-2xl">
            Simulate modifying any file or function. Calculate upstream dependents, propagation risk, and detect breaking contracts before merging code.
          </p>
        </div>

        {impactResult && (
          <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200">
            <div className="text-right">
              <div className="text-[10px] uppercase font-bold text-slate-400">Blast Radius</div>
              <div className="text-xl font-extrabold text-slate-900">
                {impactResult.blastRadiusScore} / 100
              </div>
            </div>
            <div
              className={`px-3 py-1 rounded-xl text-xs font-bold border uppercase tracking-wider ${getRiskBadge(
                impactResult.riskLevel
              )}`}
            >
              {impactResult.riskLevel} Risk
            </div>
          </div>
        )}
      </div>

      {/* Target Selector */}
      <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-200/80">
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
          Select Target Component to Test:
        </label>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search components or files..."
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <select
            value={targetId}
            onChange={(e) => setTargetId(e.target.value)}
            className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 sm:max-w-xs cursor-pointer"
          >
            {candidateNodes.map((n) => (
              <option key={n.id} value={n.id}>
                [{n.type.toUpperCase()}] {n.name} ({n.path.split('/').pop()})
              </option>
            ))}
          </select>
        </div>
      </div>

      {impactResult ? (
        <div className="space-y-8">
          
          {/* Target Profile Card */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm border border-blue-100">
                <FileCode className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-[#101828]">{impactResult.targetName}</h3>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-100 text-blue-800">
                    {impactResult.targetType}
                  </span>
                </div>
                <div className="text-xs font-mono text-slate-500 mt-0.5">
                  {impactResult.targetPath}
                </div>
              </div>
            </div>

            <button
              onClick={() =>
                onAskTutor(
                  `If I refactor ${impactResult.targetName} in ${impactResult.targetPath}, what potential breaking changes could occur across dependent files?`
                )
              }
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-xs transition cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Ask AI Tutor About Refactoring Risk
            </button>
          </div>

          {/* Visual Dependency Impact Flow */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Network className="w-4 h-4 text-blue-600" />
                Upstream Dependency Propagation (Blast Radius Graph)
              </h4>
              <span className="text-xs text-slate-500">
                {impactResult.directDependents.length} Direct • {impactResult.transitiveDependents.length} Transitive
              </span>
            </div>

            <div className="p-6 bg-slate-50/70 rounded-2xl border border-slate-200/80 overflow-x-auto">
              <div className="flex items-center gap-4 min-w-[700px]">
                
                {/* 1. Target Node */}
                <div className="w-60 p-4 rounded-xl bg-blue-600 text-white shadow-md space-y-1">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-blue-200">
                    Target Modified
                  </div>
                  <div className="font-bold text-sm truncate" title={impactResult.targetName}>
                    {impactResult.targetName}
                  </div>
                  <div className="text-[10px] text-blue-100 font-mono truncate">
                    {impactResult.targetPath}
                  </div>
                </div>

                <div className="flex flex-col items-center text-slate-400">
                  <ArrowRight className="w-5 h-5 text-blue-500" />
                  <span className="text-[9px] font-bold uppercase mt-1">Impacts</span>
                </div>

                {/* 2. Direct Dependents */}
                <div className="w-64 space-y-2">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Direct Dependents ({impactResult.directDependents.length})
                  </div>
                  {impactResult.directDependents.length === 0 ? (
                    <div className="p-3 bg-white rounded-xl border border-slate-200 text-xs text-slate-400 italic">
                      No direct upstream dependents
                    </div>
                  ) : (
                    impactResult.directDependents.slice(0, 3).map((dep) => (
                      <div
                        key={dep.id}
                        className="p-2.5 bg-white rounded-xl border border-amber-200 shadow-xs text-xs space-y-0.5"
                      >
                        <div className="font-bold text-slate-800 truncate">{dep.name}</div>
                        <div className="text-[10px] text-slate-400 font-mono truncate">{dep.path}</div>
                      </div>
                    ))
                  )}
                </div>

                <div className="flex flex-col items-center text-slate-400">
                  <ArrowRight className="w-5 h-5 text-amber-500" />
                  <span className="text-[9px] font-bold uppercase mt-1">Cascades</span>
                </div>

                {/* 3. Transitive Dependents */}
                <div className="w-64 space-y-2">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Transitive Affected ({impactResult.transitiveDependents.length})
                  </div>
                  {impactResult.transitiveDependents.length === 0 ? (
                    <div className="p-3 bg-white rounded-xl border border-slate-200 text-xs text-slate-400 italic">
                      Zero ripple propagation
                    </div>
                  ) : (
                    impactResult.transitiveDependents.slice(0, 3).map((tdep) => (
                      <div
                        key={tdep.id}
                        className="p-2.5 bg-white rounded-xl border border-slate-200 shadow-xs text-xs space-y-0.5 opacity-90"
                      >
                        <div className="font-bold text-slate-700 truncate">{tdep.name}</div>
                        <div className="text-[10px] text-slate-400 font-mono truncate">{tdep.path}</div>
                      </div>
                    ))
                  )}
                </div>

              </div>
            </div>
          </div>

          {/* Explicit Distinction: Static Analysis vs AI Inferred Suggestions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            
            {/* Box A: Deterministic Static Analysis */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="text-xs font-bold uppercase tracking-wider text-blue-700 flex items-center gap-1.5">
                  <Cpu className="w-4 h-4" />
                  Deterministic Static AST Relations
                </span>
                <span className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-semibold border border-blue-200">
                  AST Verified
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Hard relationships detected directly via module imports, inheritance, and call graph expressions.
              </p>

              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {impactResult.detectedRelationships.map((rel, idx) => (
                  <div
                    key={idx}
                    className="p-2 bg-slate-50 rounded-lg border border-slate-100 text-xs font-mono flex items-center justify-between"
                  >
                    <span className="text-slate-800">{rel.source}</span>
                    <span className="text-blue-600 text-[10px] px-1.5 py-0.5 bg-blue-50 rounded">
                      {rel.kind}
                    </span>
                    <span className="text-slate-800">{rel.target}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Box B: AI-Inferred Semantic Suggestions */}
            <div className="bg-white p-5 rounded-2xl border border-indigo-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-700 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4" />
                  AI-Inferred Semantic Risks
                </span>
                <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full font-semibold border border-indigo-200">
                  Semantic Inference
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Behavioral and contract vulnerabilities predicted by the reasoning engine based on architectural roles.
              </p>

              <div className="space-y-2">
                {impactResult.inferredSemanticImpacts.map((imp, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 bg-indigo-50/50 rounded-lg border border-indigo-100 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-indigo-950">{imp.file}</span>
                      <span
                        className={`text-[9px] uppercase font-bold px-1.5 py-0.2 rounded ${
                          imp.severity === 'high'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {imp.severity} risk
                      </span>
                    </div>
                    <p className="text-slate-600 text-[11px] leading-relaxed">{imp.reason}</p>
                  </div>
                ))}
              </div>
            </div>

          </div>

        </div>
      ) : (
        <div className="p-8 text-center text-slate-400 text-xs">
          Select a component above to view change impact.
        </div>
      )}

    </div>
  );
};
