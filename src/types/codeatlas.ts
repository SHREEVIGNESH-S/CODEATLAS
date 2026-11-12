export type NodeType = 'file' | 'function' | 'class' | 'module' | 'interface' | 'dependency';
export type ArchitectureLayer = 'entry' | 'route' | 'controller' | 'service' | 'model' | 'utility' | 'external';
export type ComplexityLevel = 'low' | 'medium' | 'high';

export interface CodeMetrics {
  lines: number;
  cyclomatic: number;
  afferentCoupling: number; // incoming dependencies (who depends on this)
  efferentCoupling: number; // outgoing dependencies (what this depends on)
}

export interface CodeNode {
  id: string;
  name: string;
  type: NodeType;
  path: string;
  layer: ArchitectureLayer;
  lineStart: number;
  lineEnd: number;
  complexity: ComplexityLevel;
  description: string;
  codeSnippet?: string;
  dependencies: string[]; // IDs this node depends on
  dependents: string[];   // IDs that depend on this node
  metrics: CodeMetrics;
  // Enhanced attributes for 3D digital city visualization
  parentModule?: string;
  parentFile?: string;
  parameters?: string[];
  returnType?: string;
  callers?: string[];
  callees?: string[];
  isExternal?: boolean;
}

export interface CodeEdge {
  id: string;
  source: string;
  target: string;
  type: 'imports' | 'calls' | 'instantiates' | 'inherits' | 'data-dep' | 'api';
  weight: number;
  label?: string;
}

export interface RepoMetadata {
  owner: string;
  name: string;
  description: string;
  url: string;
  stars: number;
  forks: number;
  defaultBranch: string;
  language: string;
  totalFiles: number;
  totalLines: number;
  sizeKb: number;
  topics: string[];
  healthScore: number;
  architectureQualityScore: number;
}

export interface ArchitectureGraph {
  nodes: CodeNode[];
  edges: CodeEdge[];
  stats: {
    files: number;
    functions: number;
    classes: number;
    modules: number;
    avgComplexity: number;
    layerCounts: Record<ArchitectureLayer, number>;
  };
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  targetFile: string;
  conceptTag: string;
}

export interface LearningMilestone {
  id: string;
  stage: number;
  stageTitle: string;
  title: string;
  concept: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  targetFiles: string[];
  targetFunctions: string[];
  estimatedTime: string;
  status: 'completed' | 'in-progress' | 'locked';
  keyTakeaways: string[];
  quiz: QuizQuestion;
}

export interface ChangeImpactResult {
  targetId: string;
  targetName: string;
  targetPath: string;
  targetType: NodeType;
  blastRadiusScore: number; // 0 - 100
  riskLevel: 'Low' | 'Medium' | 'High' | 'Critical';
  directDependents: CodeNode[];
  transitiveDependents: CodeNode[];
  inferredSemanticImpacts: {
    file: string;
    reason: string;
    severity: 'low' | 'medium' | 'high';
  }[];
  detectedRelationships: {
    source: string;
    target: string;
    kind: string;
  }[];
  affectedLayers: ArchitectureLayer[];
}

export interface TutorReference {
  file: string;
  lines: string;
  snippet?: string;
  explanation: string;
}

export interface TutorMessage {
  id: string;
  sender: 'user' | 'tutor';
  text: string;
  timestamp: string;
  mode: 'beginner' | 'intermediate' | 'advanced';
  references?: TutorReference[];
  suggestedFollowUps?: string[];
}

// 1. AI Bug Detective Types
export interface BugReport {
  id: string;
  errorMessage: string;
  stackTrace: string;
  codeSnippet?: string;
  parsedErrorType: string;
  matchedFiles: string[];
  matchedFunctions: string[];
  investigationPathNodeIds: string[];
  rootCauseNodeId?: string;
  likelyCauses: {
    title: string;
    description: string;
    probability: 'high' | 'medium' | 'low';
    targetFile: string;
    lineRange: string;
    codeExcerpt: string;
  }[];
  suggestedInvestigationSteps: string[];
  relevantTests: string[];
  confidenceScore: number; // 0 - 100
  uncertainties: string[];
}

// 2. Developer Onboarding Simulator Types
export type OnboardingSkillLevel = 'Beginner' | 'Intermediate' | 'Advanced';

export interface OnboardingChallenge {
  id: string;
  title: string;
  scenario: string;
  hint: string;
  taskType: 'locate_file' | 'inspect_function' | 'answer_question' | 'trace_flow';
  targetId?: string;
  targetPath?: string;
  options?: string[];
  correctAnswer?: string | number;
  explanation: string;
  isCompleted?: boolean;
}

export interface OnboardingStage {
  stageNumber: 1 | 2 | 3 | 4 | 5;
  title: string;
  subtitle: string;
  description: string;
  estimatedMinutes: number;
  keyConcepts: string[];
  associatedNodeIds: string[];
  associatedFiles: string[];
  challenges: OnboardingChallenge[];
  isUnlocked: boolean;
  isCompleted: boolean;
}

// 3. API Universe Explorer Types
export type HTTPMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'USE' | 'ALL';

export interface APIParameter {
  name: string;
  in: 'path' | 'query' | 'body' | 'header';
  type: string;
  required: boolean;
  description?: string;
}

export interface APIRoute {
  id: string;
  method: HTTPMethod;
  path: string;
  handlerName: string;
  filePath: string;
  line: number;
  parameters: APIParameter[];
  requestSchema?: Record<string, string>;
  responseSchema?: Record<string, string>;
  middleware: string[];
  callingClientComponents: string[];
  isExternal: boolean;
  nodeId?: string;
  category: 'auth' | 'users' | 'data' | 'system' | 'custom';
}

// 4. Execution Flow Simulator Types
export type ExecutionStepType = 'entry' | 'call' | 'branch' | 'return' | 'mutation';

export interface ExecutionStep {
  stepNumber: number;
  type: ExecutionStepType;
  functionId: string;
  functionName: string;
  filePath: string;
  line: number;
  statement: string;
  description: string;
  variableState?: Record<string, string>;
  branchCondition?: string;
  branchOutcome?: boolean;
  simpleExplanation: string;
  detailedExplanation: string;
  technicalExplanation: string;
}

export interface ExecutionFlowTrace {
  id: string;
  rootFunctionId: string;
  rootFunctionName: string;
  filePath: string;
  totalSteps: number;
  steps: ExecutionStep[];
  involvedNodeIds: string[];
}
