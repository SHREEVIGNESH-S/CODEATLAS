import React from 'react';
import {
  Menu,
  Sparkles,
  GitBranch,
  Github,
  Sun,
  ShieldCheck,
  Search
} from 'lucide-react';
import { RepoMetadata } from '../types/codeatlas';

interface HeaderProps {
  metadata: RepoMetadata | null;
  onOpenMobileNav: () => void;
  activeTitle: string;
  onQuickAnalyze: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  metadata,
  onOpenMobileNav,
  activeTitle,
  onQuickAnalyze
}) => {
  return (
    <header className="h-16 bg-white/95 backdrop-blur-md border-b border-slate-200/90 px-4 sm:px-6 flex items-center justify-between gap-4 sticky top-0 z-30">
      
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileNav}
          className="lg:hidden p-2 rounded-lg text-slate-500 hover:bg-slate-100 cursor-pointer"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2">
          <h1 className="font-bold text-base text-[#101828] capitalize">
            {activeTitle}
          </h1>
          {metadata && (
            <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-xs font-mono font-medium border border-slate-200">
              <GitBranch className="w-3 h-3 text-blue-600" />
              {metadata.owner}/{metadata.name}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2.5">
        
        {/* Quick New Repo Button */}
        <button
          onClick={onQuickAnalyze}
          className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 font-semibold text-xs rounded-xl border border-slate-200 transition cursor-pointer"
        >
          <Search className="w-3.5 h-3.5 text-slate-400" />
          Switch Repo
        </button>

        {/* Light Theme Active Indicator */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-50 border border-amber-200/80 text-[11px] font-semibold text-amber-800">
          <Sun className="w-3.5 h-3.5 text-amber-500" />
          <span className="hidden md:inline">Solar Light</span>
        </div>

        {/* AI Grounded Indicator */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-blue-50 border border-blue-200/80 text-[11px] font-semibold text-blue-800">
          <Sparkles className="w-3.5 h-3.5 text-blue-600" />
          <span className="hidden md:inline">AI Grounded</span>
        </div>

      </div>

    </header>
  );
};
