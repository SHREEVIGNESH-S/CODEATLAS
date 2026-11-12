import test from 'node:test';
import assert from 'node:assert/strict';
import {
  detectLanguage,
  inferLayer,
  estimateComplexity,
  extractJSTSSymbols,
  extractPythonSymbols,
  buildArchitectureGraph,
  computeChangeImpact,
  extractAPIRoutes,
  diagnoseBug,
  buildExecutionFlow,
  generateOnboardingStages,
  RawParsedFile
} from './parser';

test('detectLanguage classifies files correctly', () => {
  assert.equal(detectLanguage('src/app.ts'), 'typescript');
  assert.equal(detectLanguage('src/components/Card.tsx'), 'typescript');
  assert.equal(detectLanguage('lib/router.js'), 'javascript');
  assert.equal(detectLanguage('server/main.py'), 'python');
  assert.equal(detectLanguage('README.md'), 'other');
});

test('inferLayer identifies architectural roles', () => {
  assert.equal(inferLayer('src/index.ts'), 'entry');
  assert.equal(inferLayer('src/routes/api.ts'), 'route');
  assert.equal(inferLayer('src/controllers/auth.ts'), 'controller');
  assert.equal(inferLayer('src/models/user.ts'), 'model');
  assert.equal(inferLayer('src/utils/hash.ts'), 'utility');
  assert.equal(inferLayer('src/services/billing.ts'), 'service');
});

test('estimateComplexity calculates branching score', () => {
  const simpleCode = 'function add(a, b) { return a + b; }';
  const complexCode = `
    function process(x) {
      if (x > 10) {
        for (let i = 0; i < x; i++) {
          if (i % 2 === 0 || i === 5) {
            while (x > 50) {
              x--;
            }
          }
        }
      } else if (x < 0) {
        switch (x) {
          case -1: return 0;
          case -2: return 1;
        }
      }
      return x;
    }
  `;
  const simple = estimateComplexity(simpleCode);
  const complex = estimateComplexity(complexCode);
  assert.equal(simple.level, 'low');
  assert.equal(complex.level, 'high');
  assert.ok(complex.score > simple.score);
});

test('extractJSTSSymbols extracts functions and classes', () => {
  const code = `
    export function initializeApp(config) {
      return { status: 'ready', port: config.port };
    }

    export const authenticateUser = async (token) => {
      if (!token) throw new Error('missing token');
      return { id: 123 };
    };

    export class DatabaseClient {
      connect() {
        return true;
      }
    }
  `;
  const symbols = extractJSTSSymbols(code, 'src/server.ts');
  const names = symbols.map(s => s.name);
  assert.ok(names.includes('initializeApp'), 'Should detect function initializeApp');
  assert.ok(names.includes('authenticateUser'), 'Should detect arrow function authenticateUser');
  assert.ok(names.includes('DatabaseClient'), 'Should detect class DatabaseClient');
});

test('extractPythonSymbols extracts def and class', () => {
  const pyCode = `
class ApplicationContext:
    def __init__(self, name):
        self.name = name

def create_app(config):
    context = ApplicationContext(config.get("NAME"))
    return context
  `;
  const symbols = extractPythonSymbols(pyCode, 'app/core.py');
  const names = symbols.map(s => s.name);
  assert.ok(names.includes('ApplicationContext'), 'Should detect class');
  assert.ok(names.includes('create_app'), 'Should detect function');
});

test('buildArchitectureGraph and computeChangeImpact work cohesively', () => {
  const files: RawParsedFile[] = [
    {
      path: 'src/index.ts',
      language: 'typescript',
      content: `
        import { handleRequest } from './router';
        export function start() {
          handleRequest('/api/status');
        }
      `
    },
    {
      path: 'src/router.ts',
      language: 'typescript',
      content: `
        import { queryDb } from './database';
        export function handleRequest(path) {
          return queryDb(path);
        }
      `
    },
    {
      path: 'src/database.ts',
      language: 'typescript',
      content: `
        export function queryDb(query) {
          return { rows: [] };
        }
      `
    }
  ];

  const graph = buildArchitectureGraph(files);
  assert.ok(graph.nodes.length >= 3, 'Should have file and function nodes');
  assert.ok(graph.edges.length >= 2, 'Should connect dependencies');

  // Database is depended on by router, router by index
  const dbFileNode = graph.nodes.find(n => n.path === 'src/database.ts' && n.type === 'file');
  assert.ok(dbFileNode, 'Database node must exist');

  const impact = computeChangeImpact(graph, dbFileNode!.id);
  assert.ok(impact.blastRadiusScore > 0, 'Blast radius score should be greater than 0');
  assert.ok(impact.riskLevel !== undefined, 'Risk level should be defined');
  assert.ok(impact.directDependents.length > 0 || impact.targetPath === 'src/database.ts');
});

test('extractAPIRoutes detects Express routes and client fetch calls', () => {
  const files: RawParsedFile[] = [
    {
      path: 'src/routes.ts',
      language: 'typescript',
      content: `
        app.get('/api/users/:userId', getUserHandler);
        app.post('/api/users', validate, createUserHandler);
      `
    },
    {
      path: 'src/client.ts',
      language: 'typescript',
      content: `
        const res = await fetch('/api/users/:userId');
      `
    }
  ];

  const routes = extractAPIRoutes(files);
  assert.ok(routes.length >= 2, 'Should detect at least 2 routes');
  const getRoute = routes.find(r => r.method === 'GET');
  assert.ok(getRoute, 'Should detect GET route');
  assert.equal(getRoute?.path, '/api/users/:userId');
  assert.ok(getRoute?.parameters.some(p => p.name === 'userId'), 'Should parse path param userId');
  assert.ok(getRoute?.callingClientComponents.includes('src/client.ts'), 'Should detect client caller');
});

test('diagnoseBug traces stack trace to AST nodes and produces causes', () => {
  const files: RawParsedFile[] = [
    {
      path: 'src/auth/session.ts',
      language: 'typescript',
      content: `
        export function verifySession(token) {
          if (!token) throw new TypeError("token cannot be undefined");
          return { valid: true };
        }
      `
    }
  ];

  const graph = buildArchitectureGraph(files);
  const errorMsg = 'TypeError: token cannot be undefined';
  const stackTrace = 'at verifySession (src/auth/session.ts:3:15)';

  const report = diagnoseBug(graph, files, errorMsg, stackTrace);
  assert.equal(report.parsedErrorType, 'Null or Undefined Dereference');
  assert.ok(report.matchedFiles.includes('src/auth/session.ts'), 'Should match file');
  assert.ok(report.matchedFunctions.includes('verifySession'), 'Should match function');
  assert.ok(report.likelyCauses.length > 0, 'Should have likely causes');
  assert.ok(report.investigationPathNodeIds.length > 0, 'Should have 3D investigation path nodes');
});

test('buildExecutionFlow produces ordered step-by-step trace with 3-level explanations', () => {
  const files: RawParsedFile[] = [
    {
      path: 'src/calc.ts',
      language: 'typescript',
      content: `
        export function calculateTotal(items, discount) {
          if (!items) throw new Error("Missing items");
          const total = items.reduce((a, b) => a + b, 0);
          return total - discount;
        }
      `
    }
  ];

  const graph = buildArchitectureGraph(files);
  const fnNode = graph.nodes.find(n => n.name === 'calculateTotal');
  assert.ok(fnNode, 'Should find calculateTotal node');

  const trace = buildExecutionFlow(graph, files, fnNode!.id);
  assert.equal(trace.rootFunctionName, 'calculateTotal');
  assert.ok(trace.steps.length >= 3, 'Should have multiple steps (entry, branch, return)');
  assert.ok(trace.steps[0].simpleExplanation.length > 0, 'Step 1 should have simple explanation');
  assert.ok(trace.steps[0].technicalExplanation.length > 0, 'Step 1 should have technical explanation');
});

test('generateOnboardingStages returns 5 stages with challenges', () => {
  const files: RawParsedFile[] = [
    {
      path: 'src/index.ts',
      language: 'typescript',
      content: `export function boot() { return true; }`
    }
  ];
  const graph = buildArchitectureGraph(files);
  const metadata = {
    owner: 'test-org',
    name: 'test-repo',
    description: 'test',
    url: 'https://github.com/test-org/test-repo',
    stars: 10,
    forks: 2,
    defaultBranch: 'main',
    language: 'TypeScript',
    totalFiles: 1,
    totalLines: 10,
    sizeKb: 5,
    topics: [],
    healthScore: 90,
    architectureQualityScore: 85
  };

  const stages = generateOnboardingStages(graph, metadata, 'Intermediate');
  assert.equal(stages.length, 5, 'Should generate 5 progressive stages');
  assert.equal(stages[0].stageNumber, 1);
  assert.equal(stages[4].stageNumber, 5);
  assert.ok(stages[0].challenges.length > 0, 'Stage 1 should have challenges');
});
