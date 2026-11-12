import React, { useState } from 'react';
import { Search, Github, Loader2, CheckCircle2, GitBranch, Star, FileCode, Cpu, ShieldCheck } from 'lucide-react';
import { RepoMetadata } from '../types/codeatlas';

interface RepoAnalyzerProps {
  onAnalyze: (url: string) => Promise<void>;
  isLoading: boolean;
  metadata: RepoMetadata | null;
  onEnterWorkspace: () => void;
}

const PRESET_REPOS = [
  { name: 'expressjs/express', desc: 'Node.js Web Framework', lang: 'JavaScript', stars: '64.8k' },
  { name: 'pallets/flask', desc: 'Python Microframework', lang: 'Python', stars: '67.3k' },
  { name: 'facebook/react', desc: 'UI Component Library', lang: 'TypeScript', stars: '228k' },
  { name: 'tiangolo/fastapi', desc: 'Modern Python API Engine', lang: 'Python', stars: '75.4k' },
];

export const RepoAnalyzer: React.FC<RepoAnalyzerProps> = ({
  onAnalyze,
  isLoading,
  metadata,
  onEnterWorkspace,
}) => {
  const [repoUrl, setRepoUrl] = useState('https://github.com/expressjs/express');
  const [scanStep, setScanStep] = useState(0);

  const scanSteps = [
    'Connecting to GitHub REST API...',
    'Traversing repository tree & filtering source modules...',
    'Extracting functions, classes, and AST call graphs...',
    'Calculating cyclomatic complexity & layer topology...',
    'Synthesizing architecture map and learning checkpoints...'
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!repoUrl.trim() || isLoading) return;

    // Simulate progress steps during scan
    setScanStep(0);
    const interval = setInterval(() => {
      setScanStep((prev) => (prev < scanSteps.length - 1 ? prev + 1 : prev));
    }, 600);

    try {
      await onAnalyze(repoUrl);
    } finally {
      clearInterval(interval);
    }
  };

  const handleSelectPreset = (name: string) => {
    const url = `https://github.com/${name}`;
    setRepoUrl(url);
    onAnalyze(url);
  };

  return (
    <section id="analyzer" className="py-12 bg-white border-b border-slate-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-xs font-semibold text-blue-700 mb-3">
            <Github className="w-3.5 h-3.5" />
            Repository Connection Engine
          </div>
          <h2 className="text-3xl font-bold tracking-tight text-[#101828]">
            Connect Any Public GitHub Repository
          </h2>
          <p className="mt-2 text-slate-600 text-base">
            Paste any repository URL or select a verified benchmark to generate a real-time architectural blueprint.
          </p>
        </div>

        {/* Input Box Card */}
        <div className="max-w-3xl mx-auto bg-gradient-to-b from-[#F8FAFC] to-white p-4 sm:p-6 rounded-2xl border border-slate-200/90 shadow-sm">
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Search className="w-5 h-5" />
              </div>
              <input
                type="url"
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                placeholder="https://github.com/owner/repository"
                required
                className="w-full pl-10 pr-4 py-3 bg-white text-slate-900 placeholder-slate-400 text-sm font-medium rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition shadow-inner"
              />
            </div>
            
            <button
              type="submit"
              disabled={isLoading}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold text-sm rounded-xl shadow-sm transition disabled:opacity-50 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Cpu className="w-4 h-4" />
                  Analyze Repository
                </>
              )}
            </button>
          </form>

          {/* Quick Benchmark Pills */}
          <div className="mt-4 pt-4 border-t border-slate-200/60 flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-slate-500 mr-1">Presets:</span>
            {PRESET_REPOS.map((item) => (
              <button
                key={item.name}
                type="button"
                onClick={() => handleSelectPreset(item.name)}
                className="inline-flex items-center gap-1.5 px-3 py-1 bg-white hover:bg-blue-50 hover:border-blue-300 border border-slate-200 text-xs font-medium text-slate-700 hover:text-blue-700 rounded-lg transition cursor-pointer"
              >
                <span>{item.name}</span>
                <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                  {item.lang}
                </span>
              </button>
            ))}
          </div>

          {/* Scanning Progress Animation */}
          {isLoading && (
            <div className="mt-6 p-4 rounded-xl bg-blue-50/70 border border-blue-100 space-y-3">
              <div className="flex items-center justify-between text-xs font-semibold text-blue-900">
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                  Codebase Synthesis in Progress
                </span>
                <span>{Math.round(((scanStep + 1) / scanSteps.length) * 100)}%</span>
              </div>
              
              {/* Progress bar */}
              <div className="w-full bg-blue-200/60 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-blue-600 h-full rounded-full transition-all duration-500"
                  style={{ width: `${((scanStep + 1) / scanSteps.length) * 100}%` }}
                />
              </div>

              <div className="text-xs text-blue-700 flex items-center gap-2 font-mono">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                {scanSteps[scanStep]}
              </div>
            </div>
          )}
        </div>

        {/* Repository Stats Dashboard Card when loaded */}
        {metadata && !isLoading && (
          <div className="mt-8 max-w-4xl mx-auto bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-lg shadow-sm">
                  {metadata.name.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-bold text-[#101828]">
                      {metadata.owner}/{metadata.name}
                    </h3>
                    <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs font-semibold rounded-md border border-blue-200/70">
                      {metadata.language}
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-500 mt-0.5 line-clamp-1">
                    {metadata.description}
                  </p>
                </div>
              </div>

              <button
                onClick={onEnterWorkspace}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow-xs transition cursor-pointer"
              >
                Open Architecture Workspace
                <GitBranch className="w-4 h-4" />
              </button>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-5">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-center">
                <div className="flex items-center justify-center text-amber-500 mb-1">
                  <Star className="w-4 h-4" />
                </div>
                <div className="text-base font-bold text-slate-900">{metadata.stars.toLocaleString()}</div>
                <div className="text-[11px] text-slate-500">GitHub Stars</div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-center">
                <div className="flex items-center justify-center text-blue-500 mb-1">
                  <GitBranch className="w-4 h-4" />
                </div>
                <div className="text-base font-bold text-slate-900">{metadata.forks.toLocaleString()}</div>
                <div className="text-[11px] text-slate-500">Forks</div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-center">
                <div className="flex items-center justify-center text-indigo-500 mb-1">
                  <FileCode className="w-4 h-4" />
                </div>
                <div className="text-base font-bold text-slate-900">{metadata.totalFiles}</div>
                <div className="text-[11px] text-slate-500">Source Files</div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-center">
                <div className="flex items-center justify-center text-cyan-500 mb-1">
                  <FileCode className="w-4 h-4" />
                </div>
                <div className="text-base font-bold text-slate-900">{metadata.totalLines.toLocaleString()}</div>
                <div className="text-[11px] text-slate-500">Lines of Code</div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-center">
                <div className="flex items-center justify-center text-emerald-500 mb-1">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div className="text-base font-bold text-emerald-700">{metadata.healthScore}%</div>
                <div className="text-[11px] text-slate-500">Code Health</div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-center">
                <div className="flex items-center justify-center text-purple-500 mb-1">
                  <Cpu className="w-4 h-4" />
                </div>
                <div className="text-base font-bold text-purple-700">{metadata.architectureQualityScore}/100</div>
                <div className="text-[11px] text-slate-500">Arch Quality</div>
              </div>
            </div>
          </div>
        )}

      </div>
    </section>
  );
};
