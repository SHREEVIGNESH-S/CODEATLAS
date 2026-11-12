import React from 'react';
import {
  LayoutDashboard,
  FolderTree,
  Network,
  GraduationCap,
  Route,
  ShieldAlert,
  Settings,
  Github,
  Sparkles,
  ExternalLink,
  Bug,
  Compass,
  Globe,
  Cpu,
  PanelLeftClose,
  PanelLeftOpen,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { RepoMetadata } from '../types/codeatlas';

export type ActiveTab =
  | 'overview'
  | 'explorer'
  | 'architecture'
  | 'bug-detective'
  | 'onboarding'
  | 'api-universe'
  | 'execution-flow'
  | 'tutor'
  | 'learning'
  | 'impact';

interface NavigationProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  metadata: RepoMetadata | null;
  onOpenSettings: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const Navigation: React.FC<NavigationProps> = ({
  activeTab,
  onSelectTab,
  metadata,
  onOpenSettings,
  isCollapsed = false,
  onToggleCollapse
}) => {
  const primaryNavItems: Array<{
    id: ActiveTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: string;
  }> = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'architecture', label: 'Architecture Map', icon: Network, badge: '3D' },
    { id: 'bug-detective', label: 'Bug Detective', icon: Bug, badge: 'New' },
    { id: 'onboarding', label: 'Onboarding Sim', icon: Compass, badge: '5-Stage' },
    { id: 'api-universe', label: 'API Universe', icon: Globe, badge: 'REST' },
    { id: 'execution-flow', label: 'Execution Flow', icon: Cpu, badge: 'Tracer' },
    { id: 'tutor', label: 'AI Code Tutor', icon: GraduationCap },
    { id: 'learning', label: 'Learning Path', icon: Route },
    { id: 'impact', label: 'Change Impact', icon: ShieldAlert },
    { id: 'explorer', label: 'Repo Explorer', icon: FolderTree }
  ];

  return (
    <aside
      className={`bg-white border-r border-slate-200/90 flex flex-col shrink-0 min-h-screen transition-all duration-300 z-30 ${
        isCollapsed ? 'w-16' : 'w-64'
      }`}
    >
      
      {/* Brand Header */}
      <div className={`p-4 border-b border-slate-100 flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center text-white shadow-sm shadow-blue-500/20 shrink-0">
            <Network className="w-5 h-5" />
          </div>
          {!isCollapsed && (
            <div className="truncate">
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-base tracking-tight text-[#101828]">
                  CODE<span className="text-blue-600">ATLAS</span>
                </span>
                <span className="text-[9px] uppercase tracking-wider font-bold bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded border border-blue-200">
                  v2.0
                </span>
              </div>
              <span className="text-[11px] text-slate-400 font-medium">Software Intelligence</span>
            </div>
          )}
        </div>

        {/* Collapse toggle button */}
        {onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            className={`p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer ${
              isCollapsed ? 'hidden' : 'block'
            }`}
            title="Collapse sidebar"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Active Repository Card (when expanded) */}
      {!isCollapsed && metadata && (
        <div className="p-3.5 mx-3 my-3 bg-gradient-to-br from-[#EEF5FF] to-blue-50/60 rounded-xl border border-blue-200/70">
          <div className="text-[10px] font-bold uppercase tracking-wider text-blue-700 mb-1 flex items-center justify-between">
            <span>Target Repository</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
          </div>
          <div className="font-bold text-xs text-[#101828] truncate">
            {metadata.owner}/{metadata.name}
          </div>
          <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-1">
            <span>{metadata.language}</span>
            <span>•</span>
            <span>{metadata.stars.toLocaleString()} ★</span>
          </div>
        </div>
      )}

      {/* Collapsed Repository Status Indicator */}
      {isCollapsed && metadata && (
        <div className="flex justify-center my-3 relative group">
          <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 text-xs font-bold cursor-default">
            {metadata.name.charAt(0).toUpperCase()}
          </div>
          <div className="absolute left-14 top-1 bg-slate-900 text-white text-[11px] px-2 py-1 rounded-md shadow-md opacity-0 pointer-events-none group-hover:opacity-100 transition z-50 whitespace-nowrap">
            {metadata.owner}/{metadata.name}
          </div>
        </div>
      )}

      {/* Navigation Links */}
      <nav className="flex-1 px-2.5 py-2 space-y-1 overflow-y-auto">
        {primaryNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <div key={item.id} className="relative group">
              <button
                onClick={() => onSelectTab(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                  isCollapsed ? 'justify-center px-0' : ''
                } ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                {!isCollapsed && (
                  <>
                    <span className="truncate flex-1 text-left">{item.label}</span>
                    {item.badge && (
                      <span
                        className={`text-[9px] uppercase font-bold px-1.5 py-0.2 rounded ${
                          isActive
                            ? 'bg-blue-500/40 text-white border border-blue-400'
                            : 'bg-blue-50 text-blue-600 border border-blue-200'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </>
                )}
              </button>

              {/* Floating Tooltip when Collapsed */}
              {isCollapsed && (
                <div className="absolute left-14 top-2 bg-slate-900 text-white text-xs px-2.5 py-1 rounded-md shadow-md opacity-0 pointer-events-none group-hover:opacity-100 transition z-50 whitespace-nowrap flex items-center gap-1.5">
                  <span>{item.label}</span>
                  {item.badge && (
                    <span className="text-[9px] uppercase font-bold bg-blue-500 px-1 rounded text-white">
                      {item.badge}
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Expand Button when Collapsed */}
      {isCollapsed && onToggleCollapse && (
        <div className="p-2 flex justify-center border-t border-slate-100">
          <button
            onClick={onToggleCollapse}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
            title="Expand sidebar"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Bottom Footer Actions */}
      <div className={`p-3 border-t border-slate-100 space-y-1 ${isCollapsed ? 'items-center' : ''}`}>
        <div className="relative group">
          <button
            onClick={onOpenSettings}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition cursor-pointer ${
              isCollapsed ? 'justify-center px-0' : ''
            }`}
          >
            <Settings className="w-4 h-4 text-slate-400 shrink-0" />
            {!isCollapsed && <span>Settings</span>}
          </button>
          {isCollapsed && (
            <div className="absolute left-14 top-2 bg-slate-900 text-white text-xs px-2 py-1 rounded-md shadow-md opacity-0 pointer-events-none group-hover:opacity-100 transition z-50 whitespace-nowrap">
              Settings
            </div>
          )}
        </div>

        {metadata && (
          <div className="relative group">
            <a
              href={metadata.url}
              target="_blank"
              rel="noreferrer"
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition ${
                isCollapsed ? 'justify-center px-0' : ''
              }`}
            >
              <span className="flex items-center gap-2">
                <Github className="w-3.5 h-3.5 shrink-0" />
                {!isCollapsed && <span>GitHub Repo</span>}
              </span>
              {!isCollapsed && <ExternalLink className="w-3 h-3 text-slate-400" />}
            </a>
            {isCollapsed && (
              <div className="absolute left-14 top-2 bg-slate-900 text-white text-xs px-2 py-1 rounded-md shadow-md opacity-0 pointer-events-none group-hover:opacity-100 transition z-50 whitespace-nowrap">
                GitHub Repo
              </div>
            )}
          </div>
        )}
      </div>

    </aside>
  );
};
