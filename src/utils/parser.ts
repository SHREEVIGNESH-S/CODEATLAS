import {
  CodeNode,
  CodeEdge,
  ArchitectureGraph,
  ArchitectureLayer,
  ChangeImpactResult,
  ComplexityLevel,
  NodeType,
  APIParameter,
  APIRoute,
  BugReport,
  ExecutionFlowTrace,
  ExecutionStep,
  OnboardingStage,
  OnboardingSkillLevel,
  RepoMetadata
} from '../types/codeatlas';

export interface RawParsedFile {
  path: string;
  content: string;
  language: 'javascript' | 'typescript' | 'python' | 'other';
}

export function detectLanguage(path: string): 'javascript' | 'typescript' | 'python' | 'other' {
  const lower = path.toLowerCase();
  if (lower.endsWith('.ts') || lower.endsWith('.tsx')) return 'typescript';
  if (lower.endsWith('.js') || lower.endsWith('.jsx') || lower.endsWith('.mjs') || lower.endsWith('.cjs')) return 'javascript';
  if (lower.endsWith('.py')) return 'python';
  return 'other';
}

export function inferLayer(path: string, code = ''): ArchitectureLayer {
  const p = path.toLowerCase();
  if (p.includes('index') || p.includes('main') || p.includes('app.') || p.includes('server.')) return 'entry';
  if (p.includes('route') || p.includes('router') || p.includes('endpoint') || p.includes('api/')) return 'route';
  if (p.includes('controller') || p.includes('handler')) return 'controller';
  if (p.includes('service') || p.includes('engine') || p.includes('reconciler') || p.includes('pipeline')) return 'service';
  if (p.includes('model') || p.includes('schema') || p.includes('entity') || p.includes('store') || p.includes('state')) return 'model';
  if (p.includes('util') || p.includes('helper') || p.includes('lib') || p.includes('common')) return 'utility';
  
  if (/app\.(get|post|use)|@router|Blueprint/i.test(code)) return 'route';
  if (/class\s+\w+(Controller|Handler)/i.test(code)) return 'controller';
  if (/class\s+\w+(Model|Entity|Schema)/i.test(code)) return 'model';
  
  return 'service';
}

export function estimateComplexity(code: string): { score: number; level: ComplexityLevel } {
  // Count decision points: if, for, while, switch, case, catch, ||, &&, elif
  const matches = code.match(/\b(if|for|while|switch|case|catch|elif)\b|&&|\|\||\?/g);
  const score = matches ? matches.length + 1 : 1;
  let level: ComplexityLevel = 'low';
  if (score >= 8) level = 'high';
  else if (score >= 4) level = 'medium';
  return { score, level };
}

export interface ExtractedSymbol {
  name: string;
  type: NodeType;
  lineStart: number;
  lineEnd: number;
  snippet: string;
  description: string;
  calls: string[];
  parameters?: string[];
  returnType?: string;
  parentClass?: string;
}

export function extractJSTSSymbols(code: string, filePath: string): ExtractedSymbol[] {
  const lines = code.split('\n');
  const symbols: ExtractedSymbol[] = [];

  // Match functions: function name(params): returnType { ... }
  const fnRegex = /(?:export\s+)?(?:async\s+)?function\s+([A-Za-z0-9_$]+)\s*\(([^)]*)\)(?:\s*:\s*([A-Za-z0-9_<>[\],\s]+))?/g;
  let match: RegExpExecArray | null;
  while ((match = fnRegex.exec(code)) !== null) {
    const name = match[1];
    const rawParams = match[2] || '';
    const rawReturn = match[3]?.trim();
    const parameters = rawParams.split(',').map(p => p.trim().split(':')[0].trim()).filter(Boolean);
    const lineStart = code.substring(0, match.index).split('\n').length;
    const snippet = lines.slice(lineStart - 1, Math.min(lines.length, lineStart + 15)).join('\n');
    symbols.push({
      name,
      type: 'function',
      lineStart,
      lineEnd: Math.min(lines.length, lineStart + 20),
      snippet,
      description: `Function ${name}(${parameters.join(', ')}) handling execution flow in ${filePath}`,
      calls: extractCalls(snippet, name),
      parameters: parameters.length > 0 ? parameters : undefined,
      returnType: rawReturn || (name.startsWith('is') || name.startsWith('has') ? 'boolean' : name.startsWith('get') ? 'any' : 'void')
    });
  }

  // Arrow functions: const name = (params): returnType => { ... }
  const arrowRegex = /(?:export\s+)?(?:const|let|var)\s+([A-Za-z0-9_$]+)\s*=\s*(?:async\s*)?\(([^)]*)\)\s*(?::\s*([^{=>]+))?\s*=>/g;
  while ((match = arrowRegex.exec(code)) !== null) {
    const name = match[1];
    const rawParams = match[2] || '';
    const rawReturn = match[3]?.trim();
    const parameters = rawParams.split(',').map(p => p.trim().split(':')[0].trim()).filter(Boolean);
    const lineStart = code.substring(0, match.index).split('\n').length;
    const snippet = lines.slice(lineStart - 1, Math.min(lines.length, lineStart + 15)).join('\n');
    symbols.push({
      name,
      type: 'function',
      lineStart,
      lineEnd: Math.min(lines.length, lineStart + 20),
      snippet,
      description: `Arrow function ${name}(${parameters.join(', ')}) defined in ${filePath}`,
      calls: extractCalls(snippet, name),
      parameters: parameters.length > 0 ? parameters : undefined,
      returnType: rawReturn || 'void'
    });
  }

  // Classes: class Name extends Base { ... }
  const classRegex = /(?:export\s+)?class\s+([A-Za-z0-9_$]+)(?:\s+extends\s+([A-Za-z0-9_$]+))?/g;
  while ((match = classRegex.exec(code)) !== null) {
    const name = match[1];
    const parentClass = match[2];
    const lineStart = code.substring(0, match.index).split('\n').length;
    const snippet = lines.slice(lineStart - 1, Math.min(lines.length, lineStart + 25)).join('\n');
    symbols.push({
      name,
      type: 'class',
      lineStart,
      lineEnd: Math.min(lines.length, lineStart + 40),
      snippet,
      description: `Class ${name}${parentClass ? ` extending ${parentClass}` : ''} encapsulation unit in ${filePath}`,
      calls: extractCalls(snippet, name),
      parentClass
    });
  }

  return symbols;
}

export function extractPythonSymbols(code: string, filePath: string): ExtractedSymbol[] {
  const lines = code.split('\n');
  const symbols: ExtractedSymbol[] = [];

  // Match Python def func_name(args) -> return_type:
  const defRegex = /(?:async\s+)?def\s+([A-Za-z0-9_]+)\s*\(([^)]*)\)(?:\s*->\s*([A-Za-z0-9_[\],\s]+))?:/g;
  let match: RegExpExecArray | null;
  while ((match = defRegex.exec(code)) !== null) {
    const name = match[1];
    const rawParams = match[2] || '';
    const rawReturn = match[3]?.trim();
    const parameters = rawParams.split(',').map(p => p.trim().split(':')[0].trim()).filter(p => p && p !== 'self' && p !== 'cls');
    const lineStart = code.substring(0, match.index).split('\n').length;
    const snippet = lines.slice(lineStart - 1, Math.min(lines.length, lineStart + 18)).join('\n');
    symbols.push({
      name,
      type: 'function',
      lineStart,
      lineEnd: Math.min(lines.length, lineStart + 25),
      snippet,
      description: `Python function ${name}(${parameters.join(', ')}) in ${filePath}`,
      calls: extractCalls(snippet, name),
      parameters: parameters.length > 0 ? parameters : undefined,
      returnType: rawReturn || 'Any'
    });
  }

  // Match Python class ClassName(Base):
  const classRegex = /class\s+([A-Za-z0-9_]+)(?:\(([^)]*)\))?:/g;
  while ((match = classRegex.exec(code)) !== null) {
    const name = match[1];
    const parentClass = match[2]?.trim();
    const lineStart = code.substring(0, match.index).split('\n').length;
    const snippet = lines.slice(lineStart - 1, Math.min(lines.length, lineStart + 30)).join('\n');
    symbols.push({
      name,
      type: 'class',
      lineStart,
      lineEnd: Math.min(lines.length, lineStart + 50),
      snippet,
      description: `Python class ${name}${parentClass ? ` inheriting from ${parentClass}` : ''} in ${filePath}`,
      calls: extractCalls(snippet, name),
      parentClass
    });
  }

  return symbols;
}

export function extractImports(code: string, lang: 'javascript' | 'typescript' | 'python' | 'other'): string[] {
  const imports: string[] = [];
  if (lang === 'javascript' || lang === 'typescript') {
    // import ... from 'path'
    const importRegex = /from\s+['"]([^'"]+)['"]/g;
    let match: RegExpExecArray | null;
    while ((match = importRegex.exec(code)) !== null) {
      imports.push(match[1]);
    }
    // require('path')
    const reqRegex = /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
    while ((match = reqRegex.exec(code)) !== null) {
      imports.push(match[1]);
    }
  } else if (lang === 'python') {
    // import module / from module import ...
    const pyImp1 = /^\s*import\s+([A-Za-z0-9_.]+)/gm;
    let match: RegExpExecArray | null;
    while ((match = pyImp1.exec(code)) !== null) {
      imports.push(match[1]);
    }
    const pyImp2 = /^\s*from\s+([A-Za-z0-9_.]+)\s+import/gm;
    while ((match = pyImp2.exec(code)) !== null) {
      imports.push(match[1]);
    }
  }
  return Array.from(new Set(imports));
}

function extractCalls(snippet: string, selfName: string): string[] {
  const calls: string[] = [];
  const callRegex = /\b([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(/g;
  let match: RegExpExecArray | null;
  const reserved = new Set(['if', 'for', 'while', 'switch', 'catch', 'function', 'return', 'typeof', 'import', 'require', 'print', 'len', 'range', selfName]);
  while ((match = callRegex.exec(snippet)) !== null) {
    const fn = match[1];
    if (!reserved.has(fn) && fn.length > 2) {
      calls.push(fn);
    }
  }
  return Array.from(new Set(calls)).slice(0, 8);
}

export function buildArchitectureGraph(files: RawParsedFile[]): ArchitectureGraph {
  const nodes: CodeNode[] = [];
  const edges: CodeEdge[] = [];
  const nodeMap = new Map<string, CodeNode>();

  const layerCounts: Record<ArchitectureLayer, number> = {
    entry: 0,
    route: 0,
    controller: 0,
    service: 0,
    model: 0,
    utility: 0,
    external: 0
  };

  // 1. Create File Nodes
  for (const f of files) {
    const lang = detectLanguage(f.path);
    const layer = inferLayer(f.path, f.content);
    layerCounts[layer]++;
    const lines = f.content.split('\n');
    const complexityInfo = estimateComplexity(f.content);

    const fileNode: CodeNode = {
      id: `file::${f.path}`,
      name: f.path.split('/').pop() || f.path,
      type: 'file',
      path: f.path,
      layer,
      lineStart: 1,
      lineEnd: lines.length,
      complexity: complexityInfo.level,
      description: `Source file ${f.path} (${lines.length} lines, ${lang})`,
      codeSnippet: lines.slice(0, 30).join('\n'),
      dependencies: [],
      dependents: [],
      metrics: {
        lines: lines.length,
        cyclomatic: complexityInfo.score,
        afferentCoupling: 0,
        efferentCoupling: 0
      }
    };

    nodes.push(fileNode);
    nodeMap.set(fileNode.id, fileNode);

    // 2. Extract and create symbol nodes (functions, classes)
    const symbols = lang === 'python'
      ? extractPythonSymbols(f.content, f.path)
      : (lang === 'javascript' || lang === 'typescript')
        ? extractJSTSSymbols(f.content, f.path)
        : [];

    for (const sym of symbols) {
      const symComplexity = estimateComplexity(sym.snippet);
      const symId = `${sym.type}::${f.path}::${sym.name}`;
      const symNode: CodeNode = {
        id: symId,
        name: sym.name,
        type: sym.type,
        path: f.path,
        layer,
        lineStart: sym.lineStart,
        lineEnd: sym.lineEnd,
        complexity: symComplexity.level,
        description: sym.description,
        codeSnippet: sym.snippet,
        dependencies: [`file::${f.path}`],
        dependents: [],
        metrics: {
          lines: sym.lineEnd - sym.lineStart + 1,
          cyclomatic: symComplexity.score,
          afferentCoupling: 0,
          efferentCoupling: 1
        }
      };
      nodes.push(symNode);
      nodeMap.set(symId, symNode);

      // Edge from file to symbol (contains/declares)
      edges.push({
        id: `decl::${fileNode.id}->${symId}`,
        source: fileNode.id,
        target: symId,
        type: 'instantiates',
        weight: 1
      });
      fileNode.dependencies.push(symId);
      symNode.dependents.push(fileNode.id);
    }

    // 3. Extract file imports to connect file-to-file and discover external dependencies
    const rawImports = extractImports(f.content, lang);
    for (const imp of rawImports) {
      const isLocal = imp.startsWith('.') || imp.startsWith('/');
      if (isLocal) {
        // Find matching file in our dataset if local import
        let targetFileNode: CodeNode | undefined;
        for (const candidate of nodes) {
          if (candidate.type === 'file') {
            const cPath = candidate.path;
            const cleanImp = imp.replace(/^\.\//, '').replace(/^\.\.\//, '');
            if (cPath.includes(cleanImp) || cleanImp.includes(candidate.name.replace(/\.[^/.]+$/, ''))) {
              targetFileNode = candidate;
              break;
            }
          }
        }

        if (targetFileNode && targetFileNode.id !== fileNode.id) {
          const edgeId = `imp::${fileNode.id}->${targetFileNode.id}`;
          if (!edges.some(e => e.id === edgeId)) {
            edges.push({
              id: edgeId,
              source: fileNode.id,
              target: targetFileNode.id,
              type: 'imports',
              weight: 2,
              label: 'imports'
            });
            fileNode.dependencies.push(targetFileNode.id);
            targetFileNode.dependents.push(fileNode.id);
          }
        }
      } else {
        // External dependency (e.g. 'http', 'events', 'werkzeug', 'lodash')
        const depPkg = imp.split('/')[0];
        const depId = `dep::${depPkg}`;
        let depNode = nodeMap.get(depId);
        if (!depNode) {
          depNode = {
            id: depId,
            name: depPkg,
            type: 'dependency',
            path: `node_modules/${depPkg}`,
            layer: 'external',
            lineStart: 1,
            lineEnd: 1,
            complexity: 'low',
            description: `External library dependency ${depPkg}`,
            dependencies: [],
            dependents: [],
            isExternal: true,
            metrics: { lines: 0, cyclomatic: 1, afferentCoupling: 0, efferentCoupling: 0 }
          };
          nodes.push(depNode);
          nodeMap.set(depId, depNode);
          layerCounts.external++;
        }

        const edgeId = `ext::${fileNode.id}->${depId}`;
        if (!edges.some(e => e.id === edgeId)) {
          edges.push({
            id: edgeId,
            source: fileNode.id,
            target: depId,
            type: 'imports',
            weight: 1,
            label: 'external'
          });
          fileNode.dependencies.push(depId);
          depNode.dependents.push(fileNode.id);
        }
      }
    }
  }

  // 4. Create Module Nodes based on directory structures
  const moduleGroups = new Map<string, CodeNode[]>();
  for (const node of nodes) {
    if (node.type === 'file') {
      const parts = node.path.split('/');
      const modName = parts.length > 2 ? parts[parts.length - 2] : parts.length > 1 ? parts[0] : 'core';
      if (!moduleGroups.has(modName)) {
        moduleGroups.set(modName, []);
      }
      moduleGroups.get(modName)!.push(node);
      node.parentModule = modName;
    }
  }

  for (const [modName, fileMembers] of moduleGroups.entries()) {
    const modId = `mod::${modName}`;
    const modNode: CodeNode = {
      id: modId,
      name: modName.toUpperCase(),
      type: 'module',
      path: modName,
      layer: fileMembers[0]?.layer || 'service',
      lineStart: 1,
      lineEnd: fileMembers.reduce((sum, f) => sum + f.metrics.lines, 0),
      complexity: fileMembers.some(f => f.complexity === 'high') ? 'high' : 'medium',
      description: `Core Module ${modName} containing ${fileMembers.length} files`,
      dependencies: [],
      dependents: [],
      metrics: {
        lines: fileMembers.reduce((sum, f) => sum + f.metrics.lines, 0),
        cyclomatic: fileMembers.reduce((sum, f) => sum + f.metrics.cyclomatic, 0),
        afferentCoupling: 0,
        efferentCoupling: 0
      }
    };
    nodes.push(modNode);
    nodeMap.set(modId, modNode);

    // Link module to contained files
    for (const f of fileMembers) {
      edges.push({
        id: `mod_contains::${modId}->${f.id}`,
        source: modId,
        target: f.id,
        type: 'instantiates',
        weight: 1,
        label: 'contains'
      });
      modNode.dependencies.push(f.id);
      f.dependents.push(modId);
    }
  }

  // 5. Connect function calls across symbols & resolve callers/callees
  const funcNodes = nodes.filter(n => n.type === 'function');
  const funcMap = new Map<string, CodeNode>();
  for (const fn of funcNodes) {
    funcMap.set(fn.name, fn);
    fn.callers = [];
    fn.callees = [];
  }

  for (const fn of funcNodes) {
    if (fn.codeSnippet) {
      for (const targetFn of funcNodes) {
        if (targetFn.id !== fn.id && fn.codeSnippet.includes(`${targetFn.name}(`)) {
          const edgeId = `call::${fn.id}->${targetFn.id}`;
          if (!edges.some(e => e.id === edgeId)) {
            edges.push({
              id: edgeId,
              source: fn.id,
              target: targetFn.id,
              type: 'calls',
              weight: 2,
              label: 'calls'
            });
            fn.dependencies.push(targetFn.id);
            targetFn.dependents.push(fn.id);
            fn.callees!.push(targetFn.name);
            targetFn.callers!.push(fn.name);
          }
        }
      }
    }
  }

  // 6. Connect Class inheritance
  const classNodes = nodes.filter(n => n.type === 'class');
  for (const cls of classNodes) {
    for (const targetCls of classNodes) {
      if (cls.id !== targetCls.id && cls.codeSnippet && cls.codeSnippet.includes(`extends ${targetCls.name}`)) {
        const edgeId = `inherit::${cls.id}->${targetCls.id}`;
        if (!edges.some(e => e.id === edgeId)) {
          edges.push({
            id: edgeId,
            source: cls.id,
            target: targetCls.id,
            type: 'inherits',
            weight: 3,
            label: 'inherits'
          });
          cls.dependencies.push(targetCls.id);
          targetCls.dependents.push(cls.id);
        }
      }
    }
  }

  // Compute afferent & efferent coupling
  for (const node of nodes) {
    node.metrics.efferentCoupling = node.dependencies.length;
    node.metrics.afferentCoupling = node.dependents.length;
  }

  const filesCount = nodes.filter(n => n.type === 'file').length;
  const funcsCount = nodes.filter(n => n.type === 'function').length;
  const classesCount = nodes.filter(n => n.type === 'class').length;
  const modulesCount = nodes.filter(n => n.type === 'module').length;
  const totalComplexity = nodes.reduce((sum, n) => sum + n.metrics.cyclomatic, 0);

  return {
    nodes,
    edges,
    stats: {
      files: filesCount,
      functions: funcsCount,
      classes: classesCount,
      modules: modulesCount,
      avgComplexity: nodes.length > 0 ? Math.round((totalComplexity / nodes.length) * 10) / 10 : 1,
      layerCounts
    }
  };
}

export function computeChangeImpact(graph: ArchitectureGraph, targetId: string): ChangeImpactResult {
  const targetNode = graph.nodes.find(n => n.id === targetId) || graph.nodes[0];
  if (!targetNode) {
    throw new Error(`Target node ${targetId} not found in graph`);
  }

  // Breadth-first search traversing UPSTREAM dependents (nodes that depend on target)
  const directDependents: CodeNode[] = [];
  const transitiveDependents: CodeNode[] = [];
  const visited = new Set<string>([targetNode.id]);
  const queue: { nodeId: string; depth: number }[] = [];

  for (const depId of targetNode.dependents) {
    if (!visited.has(depId)) {
      visited.add(depId);
      const depNode = graph.nodes.find(n => n.id === depId);
      if (depNode) {
        directDependents.push(depNode);
        queue.push({ nodeId: depId, depth: 1 });
      }
    }
  }

  while (queue.length > 0) {
    const { nodeId, depth } = queue.shift()!;
    const currNode = graph.nodes.find(n => n.id === nodeId);
    if (!currNode) continue;

    for (const upstreamId of currNode.dependents) {
      if (!visited.has(upstreamId)) {
        visited.add(upstreamId);
        const upNode = graph.nodes.find(n => n.id === upstreamId);
        if (upNode) {
          if (depth >= 1) {
            transitiveDependents.push(upNode);
          }
          queue.push({ nodeId: upstreamId, depth: depth + 1 });
        }
      }
    }
  }

  const affectedLayers = Array.from(
    new Set([targetNode.layer, ...directDependents.map(n => n.layer), ...transitiveDependents.map(n => n.layer)])
  );

  // Compute blast radius score (0-100)
  const totalNodes = graph.nodes.length || 1;
  const directWeight = directDependents.length * 15;
  const transitiveWeight = transitiveDependents.length * 8;
  const complexityMultiplier = targetNode.complexity === 'high' ? 1.5 : targetNode.complexity === 'medium' ? 1.2 : 1.0;
  const rawScore = Math.min(100, Math.round((directWeight + transitiveWeight) * complexityMultiplier));
  const blastRadiusScore = Math.max(12, rawScore);

  let riskLevel: 'Low' | 'Medium' | 'High' | 'Critical' = 'Low';
  if (blastRadiusScore >= 75) riskLevel = 'Critical';
  else if (blastRadiusScore >= 50) riskLevel = 'High';
  else if (blastRadiusScore >= 25) riskLevel = 'Medium';

  // Inferred semantic impacts
  const inferredSemanticImpacts = [
    {
      file: targetNode.path,
      reason: `Direct modifications to ${targetNode.name} alter return signatures and internal contracts.`,
      severity: targetNode.complexity === 'high' ? ('high' as const) : ('medium' as const)
    },
    ...directDependents.slice(0, 4).map(d => ({
      file: d.path,
      reason: `Consumes ${targetNode.name}; potential breaking interface divergence on signature change.`,
      severity: d.layer === 'entry' || d.layer === 'route' ? ('high' as const) : ('medium' as const)
    }))
  ];

  const detectedRelationships = graph.edges
    .filter(e => e.target === targetNode.id || e.source === targetNode.id)
    .map(e => ({
      source: graph.nodes.find(n => n.id === e.source)?.name || e.source,
      target: graph.nodes.find(n => n.id === e.target)?.name || e.target,
      kind: e.type
    }));

  return {
    targetId: targetNode.id,
    targetName: targetNode.name,
    targetPath: targetNode.path,
    targetType: targetNode.type,
    blastRadiusScore,
    riskLevel,
    directDependents,
    transitiveDependents,
    inferredSemanticImpacts,
    detectedRelationships,
    affectedLayers
  };
}

// -------------------------------------------------------------
// ADVANCED FEATURE 1: API UNIVERSE ROUTE EXTRACTION
// -------------------------------------------------------------
export function extractAPIRoutes(files: RawParsedFile[]): APIRoute[] {
  const routes: APIRoute[] = [];
  const clientCallers = new Map<string, string[]>(); // route path -> caller files

  // 1. Detect client calls (fetch, axios, api calls) across files
  for (const f of files) {
    const fetchMatches = f.content.matchAll(/(?:fetch|axios\.(?:get|post|put|delete|patch))\s*\(\s*['"`]([^'"`]+)['"`]/g);
    for (const match of fetchMatches) {
      const url = match[1];
      if (!clientCallers.has(url)) clientCallers.set(url, []);
      clientCallers.get(url)!.push(f.path);
    }
  }

  // 2. Detect backend routes in JS/TS and Python
  for (const f of files) {
    const lang = detectLanguage(f.path);
    const lines = f.content.split('\n');

    if (lang === 'javascript' || lang === 'typescript') {
      // app.get('/path', handler) or router.post('/path', mw, handler)
      const routeRegex = /(?:app|router)\.(get|post|put|delete|patch|use|all)\s*\(\s*['"]([^'"]+)['"]\s*,\s*([^)]+)\)/g;
      let match: RegExpExecArray | null;

      while ((match = routeRegex.exec(f.content)) !== null) {
        const method = match[1].toUpperCase() as any;
        const routePath = match[2];
        const handlersString = match[3];
        const line = f.content.substring(0, match.index).split('\n').length;

        // Parse path parameters e.g. /users/:id or /items/:itemId
        const paramMatches = routePath.match(/:([a-zA-Z0-9_]+)/g) || [];
        const parameters: APIParameter[] = paramMatches.map(p => ({
          name: p.replace(':', ''),
          in: 'path' as const,
          type: 'string',
          required: true,
          description: `Identifier extracted from URL path segment ${p}`
        }));

        if (method === 'POST' || method === 'PUT' || method === 'PATCH') {
          parameters.push({
            name: 'payload',
            in: 'body' as const,
            type: 'object',
            required: true,
            description: 'JSON request payload payload body'
          });
        }

        const handlerTokens = handlersString.split(',').map(s => s.trim().replace(/^async\s*/, ''));
        const mainHandler = handlerTokens[handlerTokens.length - 1] || 'anonymousHandler';
        const middleware = handlerTokens.slice(0, handlerTokens.length - 1);

        const category: 'auth' | 'users' | 'data' | 'system' | 'custom' =
          routePath.includes('auth') || routePath.includes('login') || routePath.includes('token') ? 'auth' :
          routePath.includes('user') || routePath.includes('account') ? 'users' :
          routePath.includes('status') || routePath.includes('health') || routePath.includes('metric') ? 'system' :
          routePath.includes('data') || routePath.includes('item') || routePath.includes('query') ? 'data' : 'custom';

        const callers = clientCallers.get(routePath) || [];

        routes.push({
          id: `api::${f.path}::${method}::${routePath}`,
          method,
          path: routePath,
          handlerName: mainHandler.slice(0, 32),
          filePath: f.path,
          line,
          parameters,
          requestSchema: method !== 'GET' ? { 'Content-Type': 'application/json', body: 'Record<string, any>' } : undefined,
          responseSchema: { status: '200 OK', 'Content-Type': 'application/json', result: 'any' },
          middleware: middleware.filter(m => m.length > 0 && m.length < 30),
          callingClientComponents: callers,
          isExternal: false,
          category
        });
      }
    } else if (lang === 'python') {
      // @app.route('/path', methods=['GET', 'POST']) or @router.get('/path')
      const pyRouteRegex = /@(?:app|router|bp)\.(?:route\s*\(\s*['"]([^'"]+)['"](?:.*methods\s*=\s*\[([^\]]+)\])?|([a-z]+)\s*\(\s*['"]([^'"]+)['"])\)\s*\n\s*(?:async\s+)?def\s+([A-Za-z0-9_]+)/g;
      let match: RegExpExecArray | null;

      while ((match = pyRouteRegex.exec(f.content)) !== null) {
        const routePath = match[1] || match[4] || '/';
        const methodRaw = match[3] || (match[2] ? match[2].replace(/['"\s]/g, '') : 'GET');
        const method = (methodRaw.split(',')[0] || 'GET').toUpperCase() as any;
        const handlerName = match[5] || 'handler';
        const line = f.content.substring(0, match.index).split('\n').length;

        const paramMatches = routePath.match(/<(?:\w+:)?([a-zA-Z0-9_]+)>/g) || [];
        const parameters: APIParameter[] = paramMatches.map(p => ({
          name: p.replace(/[<>]/g, '').split(':').pop() || 'id',
          in: 'path' as const,
          type: 'string',
          required: true,
          description: `Route path parameter ${p}`
        }));

        const category: 'auth' | 'users' | 'data' | 'system' | 'custom' =
          routePath.includes('auth') || routePath.includes('login') ? 'auth' :
          routePath.includes('user') ? 'users' :
          routePath.includes('health') || routePath.includes('status') ? 'system' : 'data';

        routes.push({
          id: `api::${f.path}::${method}::${routePath}`,
          method,
          path: routePath,
          handlerName,
          filePath: f.path,
          line,
          parameters,
          requestSchema: method !== 'GET' ? { 'Content-Type': 'application/json' } : undefined,
          responseSchema: { 'Content-Type': 'application/json' },
          middleware: [],
          callingClientComponents: clientCallers.get(routePath) || [],
          isExternal: false,
          category
        });
      }
    }
  }

  // If no explicit route decorators found, generate logical endpoints from discovered controller/route files
  if (routes.length === 0) {
    const routeFiles = files.filter(f => f.path.includes('route') || f.path.includes('api') || f.path.includes('router') || f.path.includes('app'));
    const baseFile = routeFiles[0] || files[0];
    if (baseFile) {
      routes.push(
        {
          id: `api::${baseFile.path}::GET::/`,
          method: 'GET',
          path: '/',
          handlerName: 'rootHandler',
          filePath: baseFile.path,
          line: 1,
          parameters: [],
          responseSchema: { message: 'Welcome to service' },
          middleware: ['loggerMiddleware'],
          callingClientComponents: [],
          isExternal: false,
          category: 'system'
        },
        {
          id: `api::${baseFile.path}::GET::/api/v1/health`,
          method: 'GET',
          path: '/api/v1/health',
          handlerName: 'healthCheck',
          filePath: baseFile.path,
          line: 15,
          parameters: [],
          responseSchema: { status: 'healthy', timestamp: 'ISO8601' },
          middleware: [],
          callingClientComponents: [],
          isExternal: false,
          category: 'system'
        },
        {
          id: `api::${baseFile.path}::GET::/api/v1/resources`,
          method: 'GET',
          path: '/api/v1/resources',
          handlerName: 'listResources',
          filePath: baseFile.path,
          line: 35,
          parameters: [
            { name: 'limit', in: 'query', type: 'number', required: false, description: 'Page limit' },
            { name: 'offset', in: 'query', type: 'number', required: false, description: 'Offset counter' }
          ],
          responseSchema: { items: 'Array<Resource>', total: 'number' },
          middleware: ['authGuard'],
          callingClientComponents: [],
          isExternal: false,
          category: 'data'
        },
        {
          id: `api::${baseFile.path}::POST::/api/v1/resources`,
          method: 'POST',
          path: '/api/v1/resources',
          handlerName: 'createResource',
          filePath: baseFile.path,
          line: 55,
          parameters: [
            { name: 'payload', in: 'body', type: 'object', required: true, description: 'Resource attributes' }
          ],
          requestSchema: { title: 'string', description: 'string' },
          responseSchema: { id: 'string', created: 'boolean' },
          middleware: ['authGuard', 'validateBody'],
          callingClientComponents: [],
          isExternal: false,
          category: 'data'
        }
      );
    }
  }

  return routes;
}

// -------------------------------------------------------------
// ADVANCED FEATURE 2: AI BUG DETECTIVE
// -------------------------------------------------------------
export function diagnoseBug(
  graph: ArchitectureGraph,
  files: RawParsedFile[],
  errorMessage: string,
  stackTrace: string,
  codeSnippet?: string
): BugReport {
  const combinedInput = `${errorMessage}\n${stackTrace}\n${codeSnippet || ''}`.toLowerCase();
  
  // Extract file paths from stack trace (e.g. at ... (path/to/file.ts:12:4) or File "path/to/file.py", line 12)
  const matchedFiles: string[] = [];
  const matchedFunctions: string[] = [];

  for (const f of files) {
    const filename = f.path.split('/').pop()?.toLowerCase() || '';
    if (combinedInput.includes(f.path.toLowerCase()) || (filename && combinedInput.includes(filename))) {
      matchedFiles.push(f.path);
    }
  }

  // Match symbols (functions / classes) in error text
  for (const n of graph.nodes) {
    if ((n.type === 'function' || n.type === 'class') && n.name.length > 2) {
      const nameLower = n.name.toLowerCase();
      if (combinedInput.includes(nameLower) && !matchedFunctions.includes(n.name)) {
        matchedFunctions.push(n.name);
      }
    }
  }

  // If no files matched from stack trace, pick top relevant files
  if (matchedFiles.length === 0 && files.length > 0) {
    matchedFiles.push(files[0].path);
    if (files[1]) matchedFiles.push(files[1].path);
  }

  // Find root cause node in graph
  let rootCauseNode = graph.nodes.find(n =>
    matchedFunctions.includes(n.name) || matchedFiles.includes(n.path)
  ) || graph.nodes.find(n => n.type === 'function') || graph.nodes[0];

  // Build 3D investigation path nodes (upstream callers + dependent services)
  const investigationPathNodeIds: string[] = [rootCauseNode.id];
  for (const callerId of rootCauseNode.dependents.slice(0, 3)) {
    if (!investigationPathNodeIds.includes(callerId)) {
      investigationPathNodeIds.push(callerId);
    }
  }
  for (const calleeId of rootCauseNode.dependencies.slice(0, 3)) {
    if (!investigationPathNodeIds.includes(calleeId)) {
      investigationPathNodeIds.push(calleeId);
    }
  }

  // Derive error category
  let errorType = 'Runtime Execution Exception';
  if (combinedInput.includes('cannot read property') || combinedInput.includes('nullpointer') || combinedInput.includes('undefined')) {
    errorType = 'Null or Undefined Dereference';
  } else if (combinedInput.includes('typeerror') || combinedInput.includes('is not a function')) {
    errorType = 'Type Incompatibility / Invocation Failure';
  } else if (combinedInput.includes('timeout') || combinedInput.includes('connection refused') || combinedInput.includes('econnrefused')) {
    errorType = 'Network / I/O Timeout Failure';
  } else if (combinedInput.includes('syntaxerror') || combinedInput.includes('unexpected token')) {
    errorType = 'Parsing / Syntax Malformation';
  } else if (combinedInput.includes('assertion') || combinedInput.includes('expected')) {
    errorType = 'Assertion / Invariant Divergence';
  }

  // Grounded likely causes extracted from files
  const primaryFile = files.find(f => f.path === rootCauseNode.path) || files[0];
  const fileLines = primaryFile ? primaryFile.content.split('\n') : ['// Context code'];
  const excerptStart = Math.max(1, rootCauseNode.lineStart);
  const excerptEnd = Math.min(fileLines.length, excerptStart + 12);
  const codeExcerpt = fileLines.slice(excerptStart - 1, excerptEnd).join('\n');

  const likelyCauses = [
    {
      title: `Unchecked state or null propagation in ${rootCauseNode.name}`,
      description: `Evaluation in ${rootCauseNode.path} assumes incoming parameters or initialized structures are truthy before property access or invocation.`,
      probability: 'high' as const,
      targetFile: rootCauseNode.path,
      lineRange: `${excerptStart}-${excerptEnd}`,
      codeExcerpt
    },
    {
      title: `Contract mismatch in callers [${rootCauseNode.dependents.slice(0, 2).map(id => id.split('::').pop()).join(', ') || 'upstream'}]`,
      description: `Caller methods may pass undefined arguments, omitting required lifecycle properties when dispatching to ${rootCauseNode.name}.`,
      probability: 'medium' as const,
      targetFile: primaryFile?.path || 'src/index.ts',
      lineRange: `${Math.max(1, excerptStart - 10)}-${excerptStart}`,
      codeExcerpt: fileLines.slice(Math.max(0, excerptStart - 10), excerptStart).join('\n') || '// Caller sequence'
    }
  ];

  const suggestedInvestigationSteps = [
    `Set a breakpoint or debug log at ${rootCauseNode.path}:${excerptStart} inspecting variable state prior to execution.`,
    `Trace argument values passed by caller functions: ${rootCauseNode.callers?.slice(0, 3).join(', ') || 'upstream modules'}.`,
    `Verify error boundary or try/catch handling inside ${primaryFile?.path || 'handler file'}.`,
    `Inspect recent commits touching ${rootCauseNode.path} for interface or parameter changes.`
  ];

  const relevantTests = files
    .filter(f => f.path.toLowerCase().includes('test') || f.path.toLowerCase().includes('spec'))
    .map(f => f.path);

  if (relevantTests.length === 0) {
    relevantTests.push(`tests/${rootCauseNode.name.toLowerCase()}.test.ts`, `test/${primaryFile.path.split('/').pop()?.replace(/\.[^/.]+$/, '')}.spec.ts`);
  }

  return {
    id: `bug-${Date.now()}`,
    errorMessage,
    stackTrace,
    codeSnippet,
    parsedErrorType: errorType,
    matchedFiles: matchedFiles.length > 0 ? matchedFiles : [primaryFile.path],
    matchedFunctions: matchedFunctions.length > 0 ? matchedFunctions : [rootCauseNode.name],
    investigationPathNodeIds,
    rootCauseNodeId: rootCauseNode.id,
    likelyCauses,
    suggestedInvestigationSteps,
    relevantTests,
    confidenceScore: matchedFiles.length > 0 && matchedFunctions.length > 0 ? 94 : 82,
    uncertainties: [
      'Static analysis executed without active memory heap or live process telemetry.',
      'Dynamic runtime monkey-patching or environment variable injections cannot be statically verified.'
    ]
  };
}

// -------------------------------------------------------------
// ADVANCED FEATURE 3: EXECUTION FLOW SIMULATOR
// -------------------------------------------------------------
export function buildExecutionFlow(
  graph: ArchitectureGraph,
  files: RawParsedFile[],
  targetFunctionId: string
): ExecutionFlowTrace {
  const targetNode = graph.nodes.find(n => n.id === targetFunctionId) ||
                     graph.nodes.find(n => n.type === 'function') ||
                     graph.nodes[0];

  const targetFile = files.find(f => f.path === targetNode.path) || files[0];
  const fileLines = targetFile.content.split('\n');

  const startLine = targetNode.lineStart || 1;
  const endLine = Math.min(fileLines.length, targetNode.lineEnd || startLine + 15);
  const snippetLines = fileLines.slice(startLine - 1, endLine);

  const steps: ExecutionStep[] = [];
  let stepIndex = 1;

  // Step 1: Function entry & parameter ingestion
  const entryLine = snippetLines[0] || `function ${targetNode.name}() {`;
  steps.push({
    stepNumber: stepIndex++,
    type: 'entry',
    functionId: targetNode.id,
    functionName: targetNode.name,
    filePath: targetNode.path,
    line: startLine,
    statement: entryLine.trim(),
    description: `Function ${targetNode.name} invoked on call stack. Call frame allocated in runtime execution memory.`,
    variableState: {
      callStackDepth: '1',
      parameters: targetNode.parameters?.join(', ') || 'req, res, next',
      status: 'initialized'
    },
    simpleExplanation: `The software starts running "${targetNode.name}", opening a fresh workspace with the incoming inputs.`,
    detailedExplanation: `Execution jumps to line ${startLine}. Parameters are bound to the local function activation record.`,
    technicalExplanation: `V8/runtime pushes a new activation frame onto the call stack. Scope pointer initialized with lexical environment.`
  });

  // Step 2: Parameter validation / Guard statement
  const guardLine = snippetLines.find(l => l.includes('if') || l.includes('throw') || l.includes('assert')) ||
                    `if (!${targetNode.parameters?.[0] || 'req'}) throw new Error("Invalid arguments");`;
  const guardLineOffset = snippetLines.indexOf(guardLine);
  steps.push({
    stepNumber: stepIndex++,
    type: 'branch',
    functionId: targetNode.id,
    functionName: targetNode.name,
    filePath: targetNode.path,
    line: startLine + (guardLineOffset >= 0 ? guardLineOffset : 2),
    statement: guardLine.trim(),
    description: `Precondition boundary test. Evaluates conditional branch against current parameter state.`,
    branchCondition: 'parameterCheck === valid',
    branchOutcome: true,
    variableState: {
      validationCheck: 'passed',
      branchPath: 'truthy'
    },
    simpleExplanation: `It verifies the inputs are safe and complete before doing any serious calculation.`,
    detailedExplanation: `Conditional evaluation checks state invariant. If falsy, an error branch would fire; here assertions pass.`,
    technicalExplanation: `Branch prediction evaluates condition register. Jump opcode skipped; pipeline continues straight-line execution.`
  });

  // Step 3: Dependent function call or core computation
  const callee = targetNode.callees?.[0] || 'processData';
  const callLine = snippetLines.find(l => l.includes('(') && !l.includes('function') && !l.includes('if')) ||
                   `const result = ${callee}(payload);`;
  const callOffset = snippetLines.indexOf(callLine);
  steps.push({
    stepNumber: stepIndex++,
    type: 'call',
    functionId: targetNode.id,
    functionName: targetNode.name,
    filePath: targetNode.path,
    line: startLine + (callOffset >= 0 ? callOffset : 5),
    statement: callLine.trim(),
    description: `Dispatches execution to downstream helper or middleware delegate: ${callee}.`,
    variableState: {
      callee,
      argumentsPassed: 'sanitizedInput',
      awaitingReturn: 'true'
    },
    simpleExplanation: `It asks another helper function (${callee}) to do its specialized part of the job.`,
    detailedExplanation: `Calls ${callee} passing contextual data. Current function suspends until ${callee} yields control.`,
    technicalExplanation: `Caller pushes arguments to the operand stack and executes CALL opcode. Instruction pointer updates to ${callee}.`
  });

  // Step 4: State mutation or payload transformation
  const mutationLine = snippetLines.find(l => l.includes('=') && !l.includes('const') && !l.includes('let')) ||
                       `this.state = Object.assign({}, this.state, { processed: true });`;
  const mutOffset = snippetLines.indexOf(mutationLine);
  steps.push({
    stepNumber: stepIndex++,
    type: 'mutation',
    functionId: targetNode.id,
    functionName: targetNode.name,
    filePath: targetNode.path,
    line: startLine + (mutOffset >= 0 ? mutOffset : 8),
    statement: mutationLine.trim(),
    description: `State mutation or context assignment applied to internal tracking structures.`,
    variableState: {
      stateStatus: 'updated',
      memoryFlag: 'recalculated'
    },
    simpleExplanation: `It updates its internal memory notepad with the new result.`,
    detailedExplanation: `Updates memory attributes or response payload headers with processed computation output.`,
    technicalExplanation: `Heap memory reference modified in-place; cache line dirtied; V8 HiddenClass transition check evaluated.`
  });

  // Step 5: Return / Completion
  const returnLine = snippetLines.find(l => l.includes('return')) || `return result;`;
  const returnOffset = snippetLines.indexOf(returnLine);
  steps.push({
    stepNumber: stepIndex++,
    type: 'return',
    functionId: targetNode.id,
    functionName: targetNode.name,
    filePath: targetNode.path,
    line: startLine + (returnOffset >= 0 ? returnOffset : snippetLines.length - 1),
    statement: returnLine.trim(),
    description: `Return statement evaluated. Call frame unrolls and yields resulting object to caller.`,
    variableState: {
      returnValue: 'Object { status: 200, success: true }',
      callStackDepth: '0'
    },
    simpleExplanation: `The function finishes its task and hands back the final result to whoever called it.`,
    detailedExplanation: `Evaluates return expression and transfers control flow back to the caller frame.`,
    technicalExplanation: `Result stored in accumulator register; stack pointer restored; RET opcode pops saved instruction pointer.`
  });

  const involvedNodeIds = [targetNode.id];
  for (const depId of targetNode.dependencies.slice(0, 4)) {
    involvedNodeIds.push(depId);
  }

  return {
    id: `trace-${targetNode.id}`,
    rootFunctionId: targetNode.id,
    rootFunctionName: targetNode.name,
    filePath: targetNode.path,
    totalSteps: steps.length,
    steps,
    involvedNodeIds
  };
}

// -------------------------------------------------------------
// ADVANCED FEATURE 4: DEVELOPER ONBOARDING SIMULATOR
// -------------------------------------------------------------
export function generateOnboardingStages(
  graph: ArchitectureGraph,
  metadata: RepoMetadata,
  skillLevel: OnboardingSkillLevel = 'Intermediate'
): OnboardingStage[] {
  const fileNodes = graph.nodes.filter(n => n.type === 'file');
  const funcNodes = graph.nodes.filter(n => n.type === 'function');
  const modNodes = graph.nodes.filter(n => n.type === 'module');

  const entryFile = fileNodes.find(f => f.layer === 'entry') || fileNodes[0];
  const routeFile = fileNodes.find(f => f.layer === 'route') || fileNodes[1] || entryFile;
  const serviceFile = fileNodes.find(f => f.layer === 'service') || fileNodes[2] || routeFile;
  const utilFile = fileNodes.find(f => f.layer === 'utility') || fileNodes[3] || serviceFile;

  const topFunc1 = funcNodes[0] || { id: 'fn-1', name: 'main', path: entryFile.path };
  const topFunc2 = funcNodes[1] || { id: 'fn-2', name: 'handler', path: routeFile.path };

  return [
    {
      stageNumber: 1,
      title: 'Stage 1 — System Discovery',
      subtitle: 'Entry Point & Repository Anatomy',
      description: `Understand the high-level architecture of ${metadata.name}, locate the root entry files, and map the top-level modules.`,
      estimatedMinutes: skillLevel === 'Beginner' ? 12 : 8,
      keyConcepts: ['Repository root layout', 'Bootstrap entry point', 'Configuration loading', 'Module boundaries'],
      associatedNodeIds: [entryFile.id, ...(modNodes.slice(0, 2).map(m => m.id))],
      associatedFiles: [entryFile.path, routeFile.path],
      isUnlocked: true,
      isCompleted: true,
      challenges: [
        {
          id: 'c1-1',
          title: `Locate ${metadata.name}'s Primary Entry Point`,
          scenario: `Before modifying application logic, verify where execution begins when the process boots.`,
          hint: `Look for index.js, app.js, or server.js in the repository root.`,
          taskType: 'locate_file',
          targetId: entryFile.id,
          targetPath: entryFile.path,
          explanation: `${entryFile.path} serves as the bootstrap file that instantiates the main application prototype and exports public APIs.`,
          isCompleted: true
        },
        {
          id: 'c1-2',
          title: 'Anatomy Check: Module Topology',
          scenario: `What is the architectural purpose of the main module directory in ${metadata.name}?`,
          hint: `Notice how files are grouped by layer (routes, services, utilities).`,
          taskType: 'answer_question',
          options: [
            'Decouple HTTP lifecycle dispatch from algorithmic business utilities',
            'To compile binary machine code for microcontrollers',
            'To store temporary session cache files in persistent SQLite',
            'To bypass version control check-ins'
          ],
          correctAnswer: 0,
          explanation: `${metadata.name} organizes code into cohesive layers so that transport logic does not leak into domain functions.`,
          isCompleted: true
        }
      ]
    },
    {
      stageNumber: 2,
      title: 'Stage 2 — Architecture Deep Dive',
      subtitle: 'Layered Topology & Dependencies',
      description: `Examine how data flows between layers: from incoming network requests, through middleware filters, into business services.`,
      estimatedMinutes: skillLevel === 'Beginner' ? 18 : 12,
      keyConcepts: ['Afferent/efferent coupling', 'Layer separation', 'Dependency injection', 'Data contracts'],
      associatedNodeIds: [routeFile.id, serviceFile.id],
      associatedFiles: [routeFile.path, serviceFile.path],
      isUnlocked: true,
      isCompleted: false,
      challenges: [
        {
          id: 'c2-1',
          title: 'Trace Data Flow Across Layers',
          scenario: `Inspect the contract between ${routeFile.name} and downstream services in ${serviceFile.name}.`,
          hint: `Notice the import statements and function signatures linking the files.`,
          taskType: 'trace_flow',
          targetId: routeFile.id,
          targetPath: routeFile.path,
          explanation: `Routes authenticate and validate incoming parameters before delegating computational workloads to service layer primitives.`,
          isCompleted: false
        },
        {
          id: 'c2-2',
          title: 'Assess Blast Radius & Coupling',
          scenario: `If an engineer alters the exported signature of ${serviceFile.name}, what layer is most immediately at risk?`,
          hint: `Check which nodes have afferent coupling pointing to this service.`,
          taskType: 'answer_question',
          options: [
            'Direct route handlers and controllers consuming the service',
            'External npm registries hosting dependencies',
            'Only static assets and CSS stylesheets',
            'No files are impacted due to automatic polymorphism'
          ],
          correctAnswer: 0,
          explanation: `Direct upstream consumers must be updated simultaneously, or TypeScript / runtime errors will manifest at invocation sites.`,
          isCompleted: false
        }
      ]
    },
    {
      stageNumber: 3,
      title: 'Stage 3 — Code Exploration',
      subtitle: 'Crucial Functions & Control Flow',
      description: `Step into the core algorithms and error-handling routines that power ${metadata.name}'s key features.`,
      estimatedMinutes: skillLevel === 'Beginner' ? 20 : 15,
      keyConcepts: ['Control flow branching', 'Promise chaining / async-await', 'Exception boundaries', 'State mutations'],
      associatedNodeIds: [topFunc1.id, topFunc2.id],
      associatedFiles: [topFunc1.path, topFunc2.path],
      isUnlocked: false,
      isCompleted: false,
      challenges: [
        {
          id: 'c3-1',
          title: `Inspect Core Function: ${topFunc1.name}`,
          scenario: `Investigate how ${topFunc1.name} manages parameter verification and internal error dispatching.`,
          hint: `Examine the function body in ${topFunc1.path}.`,
          taskType: 'inspect_function',
          targetId: topFunc1.id,
          targetPath: topFunc1.path,
          explanation: `${topFunc1.name} acts as a core operational gatekeeper enforcing runtime sanity checks.`,
          isCompleted: false
        }
      ]
    },
    {
      stageNumber: 4,
      title: 'Stage 4 — Practical Challenges',
      subtitle: 'Simulated PRs & Incident Resolution',
      description: `Put your knowledge to the test by solving practical development scenarios: debugging a regression and predicting PR impact.`,
      estimatedMinutes: 20,
      keyConcepts: ['Regression mitigation', 'Refactoring blast radius', 'Defensive validation', 'Test coverage verification'],
      associatedNodeIds: [entryFile.id, topFunc1.id],
      associatedFiles: [entryFile.path, utilFile.path],
      isUnlocked: false,
      isCompleted: false,
      challenges: [
        {
          id: 'c4-1',
          title: 'Simulate High-Impact Refactor',
          scenario: `You are requested to migrate ${entryFile.name} to asynchronous initialization. Which safety check is critical?`,
          hint: `Consider what happens if HTTP listeners start accepting traffic before dependent submodules resolve.`,
          taskType: 'answer_question',
          options: [
            'Ensure all database pools and router registries finish booting before binding server socket',
            'Disable all linters and runtime error catching',
            'Increase process heap limit to 64GB',
            'Convert all functions to synchronous blocking while-loops'
          ],
          correctAnswer: 0,
          explanation: `Socket listeners must never bind to ports until internal service dependencies and state caches are warm.`,
          isCompleted: false
        }
      ]
    },
    {
      stageNumber: 5,
      title: 'Stage 5 — Knowledge Assessment',
      subtitle: 'Architectural Mastery Certification',
      description: `Complete the final code-grounded assessment to verify readiness for contributing to ${metadata.name}.`,
      estimatedMinutes: 15,
      keyConcepts: ['Architectural mental model', 'Design patterns', 'Performance characteristics', 'Idiomatic codebase conventions'],
      associatedNodeIds: [entryFile.id, routeFile.id, serviceFile.id],
      associatedFiles: [entryFile.path, routeFile.path, serviceFile.path],
      isUnlocked: false,
      isCompleted: false,
      challenges: [
        {
          id: 'c5-1',
          title: 'Final Mastery Check',
          scenario: `Which architectural property best describes ${metadata.name}'s resilience pattern?`,
          hint: `Think about how errors bubble up without crashing the primary thread.`,
          taskType: 'answer_question',
          options: [
            'Localized error boundaries that intercept unhandled exceptions and bubble to centralized error middleware',
            'Global silent swallowing of all thrown errors without logging',
            'Automatic server reboot on every failed function call',
            'Unbounded memory buffering until process OOM'
          ],
          correctAnswer: 0,
          explanation: `A robust architecture confines errors to their specific request or call boundary without taking down adjacent concurrent workloads.`,
          isCompleted: false
        }
      ]
    }
  ];
}
