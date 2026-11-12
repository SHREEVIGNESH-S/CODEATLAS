import React, { useState, useMemo, useRef } from 'react';
import {
  CodeNode,
  CodeEdge,
  ArchitectureGraph,
  ArchitectureLayer,
  NodeType
} from '../types/codeatlas';
import {
  Search,
  Filter,
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Sparkles,
  GitCommit,
  Layers,
  ArrowRight,
  ShieldAlert,
  MessageSquareCode,
  FileCode,
  Check,
  Box,
  Compass,
  Eye
} from 'lucide-react';
import { ThreeArchitectureCity } from './ThreeArchitectureCity';

interface ArchitectureMapProps {
  graph: ArchitectureGraph;
  onSelectNode: (node: CodeNode | null) => void;
  selectedNode: CodeNode | null;
  onAskTutorAboutNode: (node: CodeNode) => void;
  onAnalyzeImpactOfNode: (node: CodeNode) => void;
}

export const ArchitectureMap: React.FC<ArchitectureMapProps> = ({
  graph,
  onSelectNode,
  selectedNode,
  onAskTutorAboutNode,
  onAnalyzeImpactOfNode
}) => {
  // View mode: default to the new 3D Living Software Universe!
  const [viewMode, setViewMode] = useState<'3d' | '2d'>('3d');

  // 2D Controls state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLayer, setSelectedLayer] = useState<ArchitectureLayer | 'all'>('all');
  const [selectedType, setSelectedType] = useState<NodeType | 'all'>('all');
  const [connectionFilter, setConnectionFilter] = useState<'all' | 'imports' | 'calls' | 'inherits'>('all');
  const [zoomLevel, setZoomLevel] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  // If 3D view mode is active, render the Three.js Living Software Universe!
  if (viewMode === '3d') {
    return (
      <div className="space-y-3">
        {/* View Mode Switcher Header */}
        <div className="flex items-center justify-between bg-white px-4 py-2.5 rounded-xl border border-slate-200/90 shadow-xs">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Explorer Viewport:
            </span>
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
              <button
                onClick={() => setViewMode('3d')}
                className="px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 bg-blue-600 text-white shadow-xs cursor-pointer"
              >
                <Box className="w-3.5 h-3.5" />
                3D Living Universe
              </button>
              <button
                onClick={() => setViewMode('2d')}
                className="px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 text-slate-600 hover:text-slate-900 cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5" />
                2D Flow Map
              </button>
            </div>
          </div>

          <div className="text-xs text-slate-500 font-medium hidden sm:flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Interactive 3D Spatial Environment Active</span>
          </div>
        </div>

        {/* 3D City Visualization Component */}
        <ThreeArchitectureCity
          graph={graph}
          selectedNode={selectedNode}
          onSelectNode={onSelectNode}
          onAskTutorAboutNode={onAskTutorAboutNode}
          onAnalyzeImpactOfNode={onAnalyzeImpactOfNode}
          onSwitchTo2D={() => setViewMode('2d')}
        />
      </div>
    );
  }

  // Filter nodes based on search, layer, and type for 2D mode
  const filteredNodes = graph.nodes.filter((node) => {
    const matchSearch =
      node.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      node.path.toLowerCase().includes(searchTerm.toLowerCase());
    const matchLayer = selectedLayer === 'all' || node.layer === selectedLayer;
    const matchType = selectedType === 'all' || node.type === selectedType;
    return matchSearch && matchLayer && matchType;
  });

  const filteredNodeIds = new Set(filteredNodes.map((n) => n.id));

  // Compute 2D layout coordinates for nodes grouped by architectural layer columns
  const layerColumns: Record<ArchitectureLayer, number> = {
    entry: 0,
    route: 1,
    controller: 2,
    service: 3,
    model: 4,
    utility: 5,
    external: 6
  };

  const nodePositions = new Map<string, { x: number; y: number }>();
  const layerCounters: Record<string, number> = {};

  graph.nodes.forEach((node) => {
    const colIndex = layerColumns[node.layer] ?? 3;
    const rowIndex = layerCounters[node.layer] || 0;
    layerCounters[node.layer] = rowIndex + 1;

    const colWidth = 260;
    const rowHeight = 125;
    const baseX = 80 + colIndex * colWidth;
    const baseY = 80 + rowIndex * rowHeight;

    const staggerX = (rowIndex % 2 === 1 ? 15 : 0);
    nodePositions.set(node.id, { x: baseX + staggerX, y: baseY });
  });

  // Relevant edges between currently visible nodes with connection filtering
  const activeEdges = graph.edges.filter((edge) => {
    const matchVisible = filteredNodeIds.has(edge.source) && filteredNodeIds.has(edge.target);
    const matchType = connectionFilter === 'all' || edge.type === connectionFilter;
    return matchVisible && matchType;
  });

  // Connected node ids for hover highlighting
  const connectedNodeIds = new Set<string>();
  if (hoveredNodeId) {
    connectedNodeIds.add(hoveredNodeId);
    for (const edge of graph.edges) {
      if (edge.source === hoveredNodeId) connectedNodeIds.add(edge.target);
      if (edge.target === hoveredNodeId) connectedNodeIds.add(edge.source);
    }
  }

  // Drag pan handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.node-card')) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPanOffset({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const resetView = () => {
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
  };

  const getTypeBadge = (type: NodeType) => {
    switch (type) {
      case 'file':
        return { label: 'FILE', bg: 'bg-blue-100 text-blue-800 border-blue-200' };
      case 'function':
        return { label: 'FN', bg: 'bg-cyan-100 text-cyan-800 border-cyan-200' };
      case 'class':
        return { label: 'CLASS', bg: 'bg-emerald-100 text-emerald-800 border-emerald-200' };
      case 'module':
        return { label: 'MOD', bg: 'bg-indigo-100 text-indigo-800 border-indigo-200' };
      default:
        return { label: 'DEP', bg: 'bg-slate-100 text-slate-800 border-slate-200' };
    }
  };

  const getComplexityColor = (comp: string) => {
    if (comp === 'high') return 'text-rose-600 bg-rose-50 border-rose-200';
    if (comp === 'medium') return 'text-amber-600 bg-amber-50 border-amber-200';
    return 'text-emerald-600 bg-emerald-50 border-emerald-200';
  };

  return (
    <div className="space-y-3">
      {/* View Mode Switcher Header */}
      <div className="flex items-center justify-between bg-white px-4 py-2.5 rounded-xl border border-slate-200/90 shadow-xs">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Explorer Viewport:
          </span>
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setViewMode('3d')}
              className="px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 text-slate-600 hover:text-slate-900 cursor-pointer"
            >
              <Box className="w-3.5 h-3.5" />
              3D Living Universe
            </button>
            <button
              onClick={() => setViewMode('2d')}
              className="px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 bg-blue-600 text-white shadow-xs cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5" />
              2D Flow Map
            </button>
          </div>
        </div>

        <div className="text-xs text-slate-500 font-medium hidden sm:flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-blue-600" />
          <span>Structured Flow Diagram View</span>
        </div>
      </div>

      <div className="relative w-full h-[750px] bg-[#F8FAFC] rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden flex flex-col">
        
        {/* Top Toolbar */}
        <div className="p-3.5 bg-white/95 backdrop-blur-md border-b border-slate-200/80 flex flex-wrap items-center justify-between gap-3 z-20">
          
          {/* Search Input */}
          <div className="flex items-center gap-2 flex-1 max-w-sm">
            <div className="relative w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search components or files..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
              />
            </div>
          </div>

          {/* Layer Filters */}
          <div className="flex items-center gap-1.5 overflow-x-auto py-1">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mr-1 flex items-center gap-1">
              <Filter className="w-3 h-3" />
              Layer:
            </span>
            {(['all', 'entry', 'route', 'controller', 'service', 'model', 'utility'] as const).map((layer) => (
              <button
                key={layer}
                onClick={() => setSelectedLayer(layer)}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold capitalize transition cursor-pointer ${
                  selectedLayer === layer
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {layer}
              </button>
            ))}
          </div>

          {/* View Controls */}
          <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
            <button
              onClick={() => setZoomLevel((z) => Math.min(1.8, z + 0.15))}
              aria-label="Zoom in"
              className="p-1.5 hover:bg-white rounded text-slate-600 hover:text-slate-900 transition cursor-pointer"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setZoomLevel((z) => Math.max(0.4, z - 0.15))}
              aria-label="Zoom out"
              className="p-1.5 hover:bg-white rounded text-slate-600 hover:text-slate-900 transition cursor-pointer"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={resetView}
              aria-label="Reset zoom and position"
              className="p-1.5 hover:bg-white rounded text-slate-600 hover:text-slate-900 transition cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

        </div>

        {/* Layer Headers Ribbon */}
        <div className="bg-slate-50/80 border-b border-slate-200/60 px-6 py-1.5 flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-slate-400 z-10">
          <div className="flex items-center gap-6">
            <span className="flex items-center gap-1.5"><Layers className="w-3 h-3 text-blue-500" /> Architectural Flow:</span>
            <span>Entry & Bootstrap</span>
            <span>→</span>
            <span>Routing Layer</span>
            <span>→</span>
            <span>Controllers</span>
            <span>→</span>
            <span>Services & Core</span>
            <span>→</span>
            <span>Data Models</span>
            <span>→</span>
            <span>Utilities</span>
          </div>
          <div className="text-slate-500 font-mono">
            {filteredNodes.length} nodes • {activeEdges.length} connections
          </div>
        </div>

        {/* Interactive Graph Canvas Area */}
        <div
          ref={containerRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          className={`relative flex-1 overflow-hidden select-none cursor-${isDragging ? 'grabbing' : 'grab'}`}
          style={{
            backgroundImage: `radial-gradient(#CBD5E1 1px, transparent 1px)`,
            backgroundSize: '24px 24px',
          }}
        >
          {/* Transform Container */}
          <div
            className="absolute inset-0 transition-transform duration-75 origin-top-left"
            style={{
              transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomLevel})`
            }}
          >
            {/* SVG Canvas for Edges */}
            <svg className="absolute inset-0 w-[4000px] h-[3000px] pointer-events-none z-0">
              <defs>
                <linearGradient id="edge-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#06B6D4" stopOpacity="0.8" />
                </linearGradient>

                <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="2" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>

              {activeEdges.map((edge) => {
                const srcPos = nodePositions.get(edge.source);
                const tgtPos = nodePositions.get(edge.target);
                if (!srcPos || !tgtPos) return null;

                const srcX = srcPos.x + 200;
                const srcY = srcPos.y + 35;
                const tgtX = tgtPos.x;
                const tgtY = tgtPos.y + 35;

                const dx = Math.abs(tgtX - srcX) * 0.5;
                const pathData = `M ${srcX} ${srcY} C ${srcX + dx} ${srcY}, ${tgtX - dx} ${tgtY}, ${tgtX} ${tgtY}`;

                const isHighlighted =
                  hoveredNodeId === edge.source ||
                  hoveredNodeId === edge.target ||
                  selectedNode?.id === edge.source ||
                  selectedNode?.id === edge.target;

                return (
                  <g key={edge.id}>
                    <path
                      d={pathData}
                      fill="none"
                      stroke={isHighlighted ? '#2563EB' : edge.type === 'calls' ? '#06B6D4' : '#94A3B8'}
                      strokeWidth={isHighlighted ? 2.5 : 1.2}
                      strokeDasharray={edge.type === 'imports' ? 'none' : '4,4'}
                      opacity={isHighlighted ? 0.9 : 0.35}
                      className="transition-all duration-200"
                    />

                    {isHighlighted && (
                      <circle r="3.5" fill="#22D3EE" filter="url(#glow)">
                        <animateMotion path={pathData} dur="1.8s" repeatCount="indefinite" />
                      </circle>
                    )}
                  </g>
                );
              })}
            </svg>

            {/* Node Cards */}
            {filteredNodes.map((node) => {
              const pos = nodePositions.get(node.id) || { x: 50, y: 50 };
              const isSelected = selectedNode?.id === node.id;
              const isHovered = hoveredNodeId === node.id;
              const isConnected = connectedNodeIds.has(node.id);
              const badge = getTypeBadge(node.type);

              return (
                <div
                  key={node.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectNode(node);
                  }}
                  onMouseEnter={() => setHoveredNodeId(node.id)}
                  onMouseLeave={() => setHoveredNodeId(null)}
                  style={{
                    transform: `translate3d(${pos.x}px, ${pos.y}px, 0)`,
                    width: '210px'
                  }}
                  className={`node-card absolute p-3 rounded-xl border bg-white transition-all duration-200 cursor-pointer ${
                    isSelected
                      ? 'ring-2 ring-blue-600 border-blue-600 shadow-lg shadow-blue-500/15 -translate-y-0.5 z-30'
                      : isHovered
                      ? 'border-blue-400 shadow-md -translate-y-0.5 z-20'
                      : isConnected
                      ? 'border-blue-300 bg-blue-50/40 z-10'
                      : 'border-slate-200/90 shadow-xs hover:border-slate-300 z-10'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1.5 mb-1.5">
                    <span
                      className={`px-1.5 py-0.5 text-[9px] font-bold rounded uppercase tracking-wider border ${badge.bg}`}
                    >
                      {badge.label}
                    </span>
                    <span
                      className={`px-1.5 py-0.5 text-[9px] font-bold rounded uppercase border ${getComplexityColor(
                        node.complexity
                      )}`}
                    >
                      {node.complexity} comp
                    </span>
                  </div>

                  <div className="font-bold text-xs text-[#101828] truncate mb-0.5" title={node.name}>
                    {node.name}
                  </div>

                  <div className="text-[10px] text-slate-400 truncate font-mono mb-2">
                    {node.path.split('/').pop()} : {node.lineStart}
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1.5 border-t border-slate-100">
                    <span className="flex items-center gap-1">
                      <Layers className="w-2.5 h-2.5 text-blue-500" />
                      {node.layer}
                    </span>
                    <span>{node.dependencies.length} deps</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Node Details Drawer */}
        {selectedNode && (
          <div className="absolute right-0 top-0 bottom-0 w-80 sm:w-96 bg-white/95 backdrop-blur-md border-l border-slate-200 shadow-xl z-40 flex flex-col p-5 overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase border ${getTypeBadge(selectedNode.type).bg}`}>
                  {selectedNode.type}
                </span>
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  {selectedNode.layer} Layer
                </span>
              </div>
              <button
                onClick={() => onSelectNode(null)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="mt-4">
              <h3 className="text-lg font-bold text-[#101828] break-all">{selectedNode.name}</h3>
              <p className="text-xs font-mono text-slate-500 mt-1">
                {selectedNode.path} (Lines {selectedNode.lineStart} - {selectedNode.lineEnd})
              </p>
              <p className="text-xs text-slate-600 mt-2.5 leading-relaxed bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                {selectedNode.description}
              </p>
            </div>

            {selectedNode.type === 'function' && (
              <div className="mt-4 p-3 bg-blue-50/60 rounded-xl border border-blue-100 text-xs space-y-1">
                <div className="font-bold text-blue-900 flex items-center justify-between">
                  <span>Signature</span>
                  <span className="text-[10px] font-mono text-blue-600">→ {selectedNode.returnType || 'void'}</span>
                </div>
                <div className="font-mono text-slate-700">
                  {selectedNode.name}({selectedNode.parameters?.join(', ') || ''})
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2 mt-4">
              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                <div className="text-[10px] uppercase font-semibold text-slate-400">Cyclomatic</div>
                <div className="text-sm font-bold text-slate-900 mt-0.5">
                  {selectedNode.metrics.cyclomatic} ({selectedNode.complexity})
                </div>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                <div className="text-[10px] uppercase font-semibold text-slate-400">Lines of Code</div>
                <div className="text-sm font-bold text-slate-900 mt-0.5">
                  {selectedNode.metrics.lines}
                </div>
              </div>
            </div>

            {selectedNode.codeSnippet && (
              <div className="mt-4">
                <div className="text-xs font-bold text-slate-900 mb-1 flex items-center justify-between">
                  <span>Source Code Excerpt</span>
                  <span className="text-[10px] font-mono text-slate-400">preview</span>
                </div>
                <pre className="p-3 bg-slate-900 text-slate-100 rounded-xl text-[11px] font-mono overflow-x-auto max-h-48 border border-slate-800">
                  {selectedNode.codeSnippet}
                </pre>
              </div>
            )}

            <div className="mt-6 pt-4 border-t border-slate-100 space-y-2">
              <button
                onClick={() => onAskTutorAboutNode(selectedNode)}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-xs transition cursor-pointer"
              >
                <MessageSquareCode className="w-4 h-4" />
                Ask AI Code Tutor About This Node
              </button>

              <button
                onClick={() => onAnalyzeImpactOfNode(selectedNode)}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-xl transition cursor-pointer"
              >
                <ShieldAlert className="w-4 h-4 text-amber-500" />
                Analyze Change Impact
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
