import React, { useState, useEffect } from 'react';
import { EXPRESS_REPO } from './utils/demoData';
import { buildArchitectureGraph, RawParsedFile } from './utils/parser';
import { ArchitectureGraph, CodeNode, LearningMilestone, RepoMetadata } from './types/codeatlas';
import { Navigation, ActiveTab } from './components/Navigation';
import { Header } from './components/Header';
import { Hero } from './components/Hero';
import { RepoAnalyzer } from './components/RepoAnalyzer';
import { ArchitectureMap } from './components/ArchitectureMap';
import { AICodeTutor } from './components/AICodeTutor';
import { LearningPath } from './components/LearningPath';
import { ChangeImpact } from './components/ChangeImpact';
import { RepoExplorer } from './components/RepoExplorer';
import { BugDetective } from './components/BugDetective';
import { OnboardingSimulator } from './components/OnboardingSimulator';
import { APIUniverse } from './components/APIUniverse';
import { ExecutionSimulator } from './components/ExecutionSimulator';
import { SettingsModal } from './components/SettingsModal';
import {
  Sparkles,
  Network,
  Cpu,
  ShieldAlert,
  BookOpen,
  ArrowRight,
  GitBranch,
  Layers,
  Bug,
  Compass,
  Globe,
  Maximize2,
  Minimize2
} from 'lucide-react';

export default function App() {
  const initialGraph = buildArchitectureGraph(EXPRESS_REPO.files);

  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');
  const [metadata, setMetadata] = useState<RepoMetadata>(EXPRESS_REPO.metadata);
  const [graph, setGraph] = useState<ArchitectureGraph>(initialGraph);
  const [files, setFiles] = useState<RawParsedFile[]>(EXPRESS_REPO.files);
  const [milestones, setMilestones] = useState<LearningMilestone[]>(EXPRESS_REPO.learningMilestones);
  const [presetQuestions, setPresetQuestions] = useState<string[]>(EXPRESS_REPO.presetQuestions);

  const [selectedNode, setSelectedNode] = useState<CodeNode | null>(null);
  const [targetFilePath, setTargetFilePath] = useState<string>(EXPRESS_REPO.files[0]?.path || '');
  const [targetLine, setTargetLine] = useState<number | undefined>(undefined);

  const [isLoading, setIsLoading] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [analysisDepth, setAnalysisDepth] = useState<'standard' | 'deep'>('standard');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Deep linking via URL params ?tab=... or ?autostart=1
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('autostart') === '1') {
      setActiveTab('architecture');
    } else if (params.get('tab')) {
      const t = params.get('tab') as ActiveTab;
      const validTabs: ActiveTab[] = [
        'overview',
        'explorer',
        'architecture',
        'bug-detective',
        'onboarding',
        'api-universe',
        'execution-flow',
        'tutor',
        'learning',
        'impact'
      ];
      if (validTabs.includes(t)) {
        setActiveTab(t);
      }
    }
  }, []);

  const handleAnalyzeRepo = async (repoUrl: string) => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoUrl, depth: analysisDepth })
      });

      const data = await res.json();
      if (data.success) {
        setMetadata(data.metadata);
        setGraph(data.graph);
        setFiles(data.files);
        setMilestones(data.learningMilestones || []);
        setPresetQuestions(data.presetQuestions || []);
        setSelectedNode(null);
        if (data.files?.[0]) {
          setTargetFilePath(data.files[0].path);
        }
      } else {
        throw new Error(data.error || 'Failed to analyze repository');
      }
    } catch (err: any) {
      console.error('Error analyzing repository:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAskTutorAboutNode = (node: CodeNode) => {
    setSelectedNode(node);
    setActiveTab('tutor');
  };

  const handleAnalyzeImpactOfNode = (node: CodeNode) => {
    setSelectedNode(node);
    setActiveTab('impact');
  };

  const handleViewFile = (filePath: string, lineStart?: number) => {
    setTargetFilePath(filePath);
    setTargetLine(lineStart);
    setActiveTab('explorer');
  };

  const getPageTitle = (tab: ActiveTab) => {
    switch (tab) {
      case 'overview':
        return 'Overview';
      case 'architecture':
        return 'Architecture Map';
      case 'bug-detective':
        return 'AI Bug Detective';
      case 'onboarding':
        return 'Developer Onboarding Simulator';
      case 'api-universe':
        return 'API Universe Explorer';
      case 'execution-flow':
        return 'Execution Flow Simulator';
      case 'tutor':
        return 'AI Code Tutor';
      case 'learning':
        return 'Learning Path';
      case 'impact':
        return 'Change Impact';
      case 'explorer':
        return 'Repository Explorer';
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex text-[#101828]">
      
      {/* Desktop Sidebar Navigation (Collapsible Rail) */}
      <div className="hidden lg:block shrink-0 sticky top-0 h-screen transition-all duration-300">
        <Navigation
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          metadata={metadata}
          onOpenSettings={() => setIsSettingsOpen(true)}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        />
      </div>

      {/* Mobile Drawer Overlay */}
      {isMobileNavOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/30 backdrop-blur-xs flex lg:hidden"
          onClick={() => setIsMobileNavOpen(false)}
        >
          <div
            className="w-64 bg-white h-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <Navigation
              activeTab={activeTab}
              onSelectTab={(tab) => {
                setActiveTab(tab);
                setIsMobileNavOpen(false);
              }}
              metadata={metadata}
              onOpenSettings={() => {
                setIsSettingsOpen(true);
                setIsMobileNavOpen(false);
              }}
            />
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 transition-all duration-300">
        
        <Header
          metadata={metadata}
          onOpenMobileNav={() => setIsMobileNavOpen(true)}
          activeTitle={getPageTitle(activeTab)}
          onQuickAnalyze={() => {
            setActiveTab('overview');
            const el = document.getElementById('analyzer');
            el?.scrollIntoView({ behavior: 'smooth' });
          }}
        />

        <main className={`flex-1 p-4 sm:p-6 lg:p-8 w-full ${activeTab === 'architecture' ? 'max-w-full p-2 lg:p-4' : 'max-w-7xl mx-auto space-y-8'}`}>
          
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-10">
              
              <Hero
                onExploreClick={() => {
                  const el = document.getElementById('analyzer');
                  el?.scrollIntoView({ behavior: 'smooth' });
                }}
                onHowItWorksClick={() => setActiveTab('architecture')}
              />

              <RepoAnalyzer
                onAnalyze={handleAnalyzeRepo}
                isLoading={isLoading}
                metadata={metadata}
                onEnterWorkspace={() => setActiveTab('architecture')}
              />

              {/* Workspace Quick Launch Suite */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-bold text-[#101828]">
                      {metadata.name} Intelligence Workspace
                    </h3>
                    <p className="text-xs text-slate-500">
                      Select an advanced analysis engine to inspect architecture, bugs, APIs, or execution
                    </p>
                  </div>
                  <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200">
                    4 New Engines Active
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  
                  {/* Card 1: 3D Architecture */}
                  <button
                    onClick={() => setActiveTab('architecture')}
                    className="p-5 bg-white rounded-2xl border border-slate-200/90 shadow-xs hover:border-blue-400 hover:shadow-md transition text-left cursor-pointer group"
                  >
                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold mb-3 group-hover:bg-blue-600 group-hover:text-white transition">
                      <Network className="w-5 h-5" />
                    </div>
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="font-bold text-sm text-[#101828]">Architecture Map</h4>
                      <span className="text-[9px] uppercase font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">3D City</span>
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Immersive 3D software universe with modules, files, classes, and dependency streams.
                    </p>
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 mt-3 group-hover:translate-x-0.5 transition">
                      Launch 3D Map <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </button>

                  {/* Card 2: AI Bug Detective */}
                  <button
                    onClick={() => setActiveTab('bug-detective')}
                    className="p-5 bg-white rounded-2xl border border-slate-200/90 shadow-xs hover:border-red-400 hover:shadow-md transition text-left cursor-pointer group"
                  >
                    <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center font-bold mb-3 group-hover:bg-red-600 group-hover:text-white transition">
                      <Bug className="w-5 h-5" />
                    </div>
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="font-bold text-sm text-[#101828]">AI Bug Detective</h4>
                      <span className="text-[9px] uppercase font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded">New</span>
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Grounded stack trace triage with 3D error path highlighting and root cause isolation.
                    </p>
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 mt-3 group-hover:translate-x-0.5 transition">
                      Investigate Bugs <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </button>

                  {/* Card 3: Onboarding Simulator */}
                  <button
                    onClick={() => setActiveTab('onboarding')}
                    className="p-5 bg-white rounded-2xl border border-slate-200/90 shadow-xs hover:border-indigo-400 hover:shadow-md transition text-left cursor-pointer group"
                  >
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold mb-3 group-hover:bg-indigo-600 group-hover:text-white transition">
                      <Compass className="w-5 h-5" />
                    </div>
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="font-bold text-sm text-[#101828]">Onboarding Sim</h4>
                      <span className="text-[9px] uppercase font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">5-Stage</span>
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Progressive onboarding roadmap with 3 skill levels and interactive challenge checkpoints.
                    </p>
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 mt-3 group-hover:translate-x-0.5 transition">
                      Start Onboarding <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </button>

                  {/* Card 4: API Universe */}
                  <button
                    onClick={() => setActiveTab('api-universe')}
                    className="p-5 bg-white rounded-2xl border border-slate-200/90 shadow-xs hover:border-cyan-400 hover:shadow-md transition text-left cursor-pointer group"
                  >
                    <div className="w-10 h-10 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center font-bold mb-3 group-hover:bg-cyan-600 group-hover:text-white transition">
                      <Globe className="w-5 h-5" />
                    </div>
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="font-bold text-sm text-[#101828]">API Universe</h4>
                      <span className="text-[9px] uppercase font-bold text-cyan-600 bg-cyan-50 px-1.5 py-0.5 rounded">Gateway</span>
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Spatial route topology, client consumers, request contracts, and cURL generation.
                    </p>
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-cyan-600 mt-3 group-hover:translate-x-0.5 transition">
                      Explore Routes <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </button>

                  {/* Card 5: Execution Flow Simulator */}
                  <button
                    onClick={() => setActiveTab('execution-flow')}
                    className="p-5 bg-white rounded-2xl border border-slate-200/90 shadow-xs hover:border-purple-400 hover:shadow-md transition text-left cursor-pointer group"
                  >
                    <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold mb-3 group-hover:bg-purple-600 group-hover:text-white transition">
                      <Cpu className="w-5 h-5" />
                    </div>
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="font-bold text-sm text-[#101828]">Execution Flow</h4>
                      <span className="text-[9px] uppercase font-bold text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded">Tracer</span>
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Step-by-step playback player with 3-level AI explanations (simple, detailed, technical).
                    </p>
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-purple-600 mt-3 group-hover:translate-x-0.5 transition">
                      Trace Function <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </button>

                  {/* Card 6: AI Code Tutor */}
                  <button
                    onClick={() => setActiveTab('tutor')}
                    className="p-5 bg-white rounded-2xl border border-slate-200/90 shadow-xs hover:border-emerald-400 hover:shadow-md transition text-left cursor-pointer group"
                  >
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold mb-3 group-hover:bg-emerald-600 group-hover:text-white transition">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <h4 className="font-bold text-sm text-[#101828] mb-1">AI Code Tutor</h4>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Conversational architecture tutor grounded in actual repository files and line numbers.
                    </p>
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 mt-3 group-hover:translate-x-0.5 transition">
                      Chat with Tutor <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </button>

                  {/* Card 7: Learning Path */}
                  <button
                    onClick={() => setActiveTab('learning')}
                    className="p-5 bg-white rounded-2xl border border-slate-200/90 shadow-xs hover:border-blue-400 hover:shadow-md transition text-left cursor-pointer group"
                  >
                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold mb-3 group-hover:bg-blue-600 group-hover:text-white transition">
                      <BookOpen className="w-5 h-5" />
                    </div>
                    <h4 className="font-bold text-sm text-[#101828] mb-1">Learning Path</h4>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Structured milestone lessons with code comprehension quizzes.
                    </p>
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 mt-3 group-hover:translate-x-0.5 transition">
                      Open Milestones <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </button>

                  {/* Card 8: Change Impact */}
                  <button
                    onClick={() => setActiveTab('impact')}
                    className="p-5 bg-white rounded-2xl border border-slate-200/90 shadow-xs hover:border-amber-400 hover:shadow-md transition text-left cursor-pointer group"
                  >
                    <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold mb-3 group-hover:bg-amber-600 group-hover:text-white transition">
                      <ShieldAlert className="w-5 h-5" />
                    </div>
                    <h4 className="font-bold text-sm text-[#101828] mb-1">Change Impact</h4>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Simulate modifications and calculate blast radius before merging code changes.
                    </p>
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600 mt-3 group-hover:translate-x-0.5 transition">
                      Simulate Impact <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </button>

                </div>
              </div>

            </div>
          )}

          {/* TAB 2: ARCHITECTURE MAP */}
          {activeTab === 'architecture' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between px-2">
                <div>
                  <h2 className="text-2xl font-bold text-[#101828]">
                    Interactive Architecture Explorer
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Living Software Universe for {metadata.owner}/{metadata.name} • Pan, rotate, zoom, inspect nodes
                  </p>
                </div>
              </div>

              <ArchitectureMap
                graph={graph}
                onSelectNode={(node) => setSelectedNode(node)}
                selectedNode={selectedNode}
                onAskTutorAboutNode={handleAskTutorAboutNode}
                onAnalyzeImpactOfNode={handleAnalyzeImpactOfNode}
              />
            </div>
          )}

          {/* TAB 3: AI BUG DETECTIVE (NEW) */}
          {activeTab === 'bug-detective' && (
            <BugDetective
              graph={graph}
              files={files}
              repoName={`${metadata.owner}/${metadata.name}`}
              onExploreFile={handleViewFile}
              onAskTutor={(q) => {
                setActiveTab('tutor');
              }}
            />
          )}

          {/* TAB 4: DEVELOPER ONBOARDING SIMULATOR (NEW) */}
          {activeTab === 'onboarding' && (
            <OnboardingSimulator
              graph={graph}
              metadata={metadata}
              onExploreFile={handleViewFile}
              onAskTutor={(q) => {
                setActiveTab('tutor');
              }}
            />
          )}

          {/* TAB 5: API UNIVERSE EXPLORER (NEW) */}
          {activeTab === 'api-universe' && (
            <APIUniverse
              files={files}
              repoName={`${metadata.owner}/${metadata.name}`}
              onExploreFile={handleViewFile}
              onAskTutor={(q) => {
                setActiveTab('tutor');
              }}
            />
          )}

          {/* TAB 6: EXECUTION FLOW SIMULATOR (NEW) */}
          {activeTab === 'execution-flow' && (
            <ExecutionSimulator
              graph={graph}
              files={files}
              repoName={`${metadata.owner}/${metadata.name}`}
              onExploreFile={handleViewFile}
              onAskTutor={(q) => {
                setActiveTab('tutor');
              }}
            />
          )}

          {/* TAB 7: AI CODE TUTOR */}
          {activeTab === 'tutor' && (
            <div className="space-y-4">
              <AICodeTutor
                repoName={`${metadata.owner}/${metadata.name}`}
                presetQuestions={presetQuestions}
                activeNode={selectedNode}
                codeFiles={files}
                onViewFile={handleViewFile}
              />
            </div>
          )}

          {/* TAB 8: LEARNING PATH */}
          {activeTab === 'learning' && (
            <div className="space-y-4">
              <LearningPath
                milestones={milestones}
                repoName={`${metadata.owner}/${metadata.name}`}
                onExploreFile={handleViewFile}
              />
            </div>
          )}

          {/* TAB 9: CHANGE IMPACT */}
          {activeTab === 'impact' && (
            <div className="space-y-4">
              <ChangeImpact
                graph={graph}
                selectedNode={selectedNode}
                onSelectNode={setSelectedNode}
                onAskTutor={(q) => {
                  setActiveTab('tutor');
                }}
              />
            </div>
          )}

          {/* TAB 10: REPOSITORY EXPLORER */}
          {activeTab === 'explorer' && (
            <div className="space-y-4">
              <RepoExplorer
                files={files}
                graph={graph}
                activeFilePath={targetFilePath}
                targetLine={targetLine}
                onSelectNode={(node) => {
                  setSelectedNode(node);
                  setActiveTab('architecture');
                }}
                onAskTutorAboutFile={(fp) => {
                  setActiveTab('tutor');
                }}
              />
            </div>
          )}

        </main>
      </div>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        analysisDepth={analysisDepth}
        setAnalysisDepth={setAnalysisDepth}
      />

    </div>
  );
}
