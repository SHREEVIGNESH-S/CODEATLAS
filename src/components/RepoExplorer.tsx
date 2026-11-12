import React, { useState } from 'react';
import { RawParsedFile } from '../utils/parser';
import { ArchitectureGraph, CodeNode } from '../types/codeatlas';
import {
  Folder,
  FileCode,
  ChevronRight,
  ChevronDown,
  Layers,
  Copy,
  Check,
  Search,
  MessageSquareCode,
  ShieldAlert,
  Cpu
} from 'lucide-react';

interface RepoExplorerProps {
  files: RawParsedFile[];
  graph: ArchitectureGraph;
  activeFilePath?: string;
  targetLine?: number;
  onSelectNode: (node: CodeNode) => void;
  onAskTutorAboutFile: (filePath: string) => void;
}

export const RepoExplorer: React.FC<RepoExplorerProps> = ({
  files,
  graph,
  activeFilePath,
  targetLine,
  onSelectNode,
  onAskTutorAboutFile
}) => {
  const [selectedPath, setSelectedPath] = useState<string>(
    activeFilePath || files[0]?.path || ''
  );
  const [copied, setCopied] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Update when prop changes
  React.useEffect(() => {
    if (activeFilePath && files.some((f) => f.path === activeFilePath)) {
      setSelectedPath(activeFilePath);
    }
  }, [activeFilePath, files]);

  const activeFile = files.find((f) => f.path === selectedPath) || files[0];

  // Extracted symbols for this file
  const fileSymbols = graph.nodes.filter(
    (n) => n.path === activeFile?.path && (n.type === 'function' || n.type === 'class')
  );

  const filteredFiles = files.filter((f) =>
    f.path.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCopyCode = () => {
    if (!activeFile) return;
    navigator.clipboard.writeText(activeFile.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm flex flex-col h-[750px] overflow-hidden">
      
      {/* Top Bar */}
      <div className="px-6 py-3.5 bg-slate-50/90 border-b border-slate-200/80 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
          <Folder className="w-4 h-4 text-blue-600" />
          <span>Repository Explorer</span>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          <span className="font-mono text-blue-700">{activeFile?.path}</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onAskTutorAboutFile(activeFile.path)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-xs font-semibold border border-blue-200 transition cursor-pointer"
          >
            <MessageSquareCode className="w-3.5 h-3.5" />
            Explain File with AI
          </button>

          <button
            onClick={handleCopyCode}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white text-slate-700 hover:bg-slate-100 rounded-lg text-xs font-semibold border border-slate-200 transition cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
            {copied ? 'Copied' : 'Copy Code'}
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        
        {/* Left Column: File Tree */}
        <div className="w-64 border-r border-slate-200/80 bg-[#F8FAFC] flex flex-col">
          <div className="p-3 border-b border-slate-200/80">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Filter files..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
            {filteredFiles.map((file) => {
              const isSelected = file.path === activeFile?.path;
              return (
                <button
                  key={file.path}
                  onClick={() => setSelectedPath(file.path)}
                  className={`w-full text-left px-2.5 py-2 rounded-lg text-xs flex items-center gap-2 transition cursor-pointer ${
                    isSelected
                      ? 'bg-blue-600 text-white font-medium shadow-xs'
                      : 'text-slate-700 hover:bg-slate-200/60'
                  }`}
                >
                  <FileCode className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-blue-100' : 'text-slate-400'}`} />
                  <span className="truncate font-mono">{file.path}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Center Column: Source Code Viewer with Line Numbers */}
        <div className="flex-1 overflow-y-auto bg-slate-900 text-slate-100 p-4 font-mono text-xs leading-relaxed select-text">
          {activeFile ? (
            <div className="table w-full">
              {activeFile.content.split('\n').map((line, idx) => {
                const lineNum = idx + 1;
                const isTarget = targetLine && Math.abs(lineNum - targetLine) < 2;

                return (
                  <div
                    key={idx}
                    className={`table-row hover:bg-slate-800/60 ${
                      isTarget ? 'bg-blue-950/70 border-l-2 border-blue-400' : ''
                    }`}
                  >
                    <span className="table-cell pr-4 text-right select-none text-slate-600 w-10 text-[11px]">
                      {lineNum}
                    </span>
                    <span className="table-cell whitespace-pre">{line || ' '}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-slate-500 italic p-4">No file selected</div>
          )}
        </div>

        {/* Right Column: Extracted AST Symbols */}
        <div className="w-72 border-l border-slate-200/80 bg-white flex flex-col p-4 overflow-y-auto">
          <div className="pb-3 border-b border-slate-100 mb-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-blue-600" />
              Extracted AST Symbols ({fileSymbols.length})
            </h4>
          </div>

          {fileSymbols.length === 0 ? (
            <div className="text-xs text-slate-400 italic py-4">
              No top-level functions or classes detected in this file.
            </div>
          ) : (
            <div className="space-y-2">
              {fileSymbols.map((sym) => (
                <div
                  key={sym.id}
                  onClick={() => onSelectNode(sym)}
                  className="p-3 bg-slate-50 hover:bg-blue-50/70 hover:border-blue-300 rounded-xl border border-slate-200/80 transition cursor-pointer group"
                >
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-blue-100 text-blue-800">
                      {sym.type}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      L{sym.lineStart}-L{sym.lineEnd}
                    </span>
                  </div>

                  <div className="font-bold text-xs text-slate-900 group-hover:text-blue-700 truncate">
                    {sym.name}
                  </div>

                  <p className="text-[11px] text-slate-500 mt-1 line-clamp-2 leading-snug">
                    {sym.description}
                  </p>

                  <div className="flex items-center justify-between text-[10px] text-slate-400 pt-2 mt-2 border-t border-slate-200/60">
                    <span>{sym.complexity} complexity</span>
                    <span className="text-blue-600 font-semibold group-hover:underline">
                      Inspect →
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

    </div>
  );
};
