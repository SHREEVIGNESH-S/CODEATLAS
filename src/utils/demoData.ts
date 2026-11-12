import { LearningMilestone, RepoMetadata } from '../types/codeatlas';
import { RawParsedFile, buildArchitectureGraph } from './parser';

export interface DemoRepoData {
  metadata: RepoMetadata;
  files: RawParsedFile[];
  learningMilestones: LearningMilestone[];
  presetQuestions: string[];
}

export const EXPRESS_REPO: DemoRepoData = {
  metadata: {
    owner: 'expressjs',
    name: 'express',
    description: 'Fast, unopinionated, minimalist web framework for Node.js',
    url: 'https://github.com/expressjs/express',
    stars: 64800,
    forks: 11200,
    defaultBranch: 'master',
    language: 'JavaScript',
    totalFiles: 42,
    totalLines: 7850,
    sizeKb: 1420,
    topics: ['nodejs', 'framework', 'http', 'middleware', 'rest-api'],
    healthScore: 96,
    architectureQualityScore: 94
  },
  presetQuestions: [
    'How does middleware execution and the next() callback pipeline work in Express?',
    'Where is the Router created and how does Layer matching resolve HTTP verbs?',
    'Explain the execution flow when app.listen() is invoked.',
    'How are req and res prototypes augmented with convenience helpers like res.json()?'
  ],
  files: [
    {
      path: 'lib/express.js',
      language: 'javascript',
      content: `
/**
 * Express entry point factory.
 */
import { EventEmitter } from 'events';
import { proto as appProto } from './application';
import { Route } from './router/route';
import { Router } from './router/index';

export function createApplication() {
  const app = function(req, res, next) {
    app.handle(req, res, next);
  };

  Object.assign(app, EventEmitter.prototype);
  Object.assign(app, appProto);

  app.request = Object.create(null);
  app.response = Object.create(null);
  app.init();
  return app;
}

export { Router, Route };
export default createApplication;
      `
    },
    {
      path: 'lib/application.js',
      language: 'javascript',
      content: `
/**
 * Application prototype handling setup and routing delegation.
 */
import http from 'http';
import { Router } from './router/index';
import { compileETag } from './utils';

export const proto = {
  init() {
    this.settings = Object.create(null);
    this._router = null;
    this.defaultConfiguration();
  },

  defaultConfiguration() {
    const env = process.env.NODE_ENV || 'development';
    this.set('env', env);
    this.set('subdomain offset', 2);
    this.set('trust proxy', false);
  },

  lazyrouter() {
    if (!this._router) {
      this._router = new Router({
        caseSensitive: this.enabled('case sensitive routing'),
        strict: this.enabled('strict routing')
      });
      this._router.use(this.middlewareQuery);
      this._router.use(this.middlewareInit);
    }
  },

  handle(req, res, callback) {
    const router = this._router;
    if (!router) {
      res.end('Cannot ' + req.method + ' ' + req.url);
      return;
    }
    router.handle(req, res, callback);
  },

  use(fn) {
    this.lazyrouter();
    const router = this._router;
    router.use(fn);
    return this;
  },

  listen(...args) {
    const server = http.createServer(this);
    return server.listen(...args);
  }
};
      `
    },
    {
      path: 'lib/router/index.js',
      language: 'javascript',
      content: `
/**
 * Express Router implementation managing layer dispatch.
 */
import { Layer } from './layer';
import { Route } from './route';

export class Router {
  constructor(options = {}) {
    this.params = {};
    this._params = [];
    this.caseSensitive = options.caseSensitive;
    this.strict = options.strict;
    this.stack = [];
  }

  use(path, ...handlers) {
    const layer = new Layer(path, { sensitive: this.caseSensitive, strict: this.strict }, handlers);
    this.stack.push(layer);
    return this;
  }

  route(path) {
    const route = new Route(path);
    const layer = new Layer(path, { sensitive: this.caseSensitive, strict: this.strict }, route.dispatch.bind(route));
    layer.route = route;
    this.stack.push(layer);
    return route;
  }

  handle(req, res, out) {
    let idx = 0;
    const stack = this.stack;

    function next(err) {
      if (idx >= stack.length) {
        if (out) return out(err);
        return;
      }
      const layer = stack[idx++];
      if (!layer.match(req.url)) {
        return next(err);
      }
      layer.handle_request(req, res, next);
    }

    next();
  }
}
      `
    },
    {
      path: 'lib/router/layer.js',
      language: 'javascript',
      content: `
/**
 * Router Layer representing either middleware or a route node.
 */
export class Layer {
  constructor(path, options, fn) {
    this.handle = fn;
    this.name = fn.name || '<anonymous>';
    this.params = undefined;
    this.path = undefined;
    this.regexp = new RegExp('^' + path.replace(/\\//g, '\\\\/'));
  }

  match(path) {
    return this.regexp.test(path);
  }

  handle_request(req, res, next) {
    const fn = this.handle;
    try {
      fn(req, res, next);
    } catch (err) {
      next(err);
    }
  }
}
      `
    },
    {
      path: 'lib/router/route.js',
      language: 'javascript',
      content: `
/**
 * Route handles verb dispatching across matched HTTP methods.
 */
import { Layer } from './layer';

export class Route {
  constructor(path) {
    this.path = path;
    this.stack = [];
    this.methods = {};
  }

  dispatch(req, res, done) {
    let idx = 0;
    const stack = this.stack;
    const method = req.method.toLowerCase();

    if (!this.methods[method]) {
      return done();
    }

    function next(err) {
      if (err) return done(err);
      if (idx >= stack.length) return done();
      const layer = stack[idx++];
      layer.handle_request(req, res, next);
    }

    next();
  }
}
      `
    },
    {
      path: 'lib/response.js',
      language: 'javascript',
      content: `
/**
 * Response prototype extensions for HTTP responses.
 */
export const response = {
  status(code) {
    this.statusCode = code;
    return this;
  },

  send(body) {
    let chunk = body;
    if (typeof chunk === 'object') {
      return this.json(chunk);
    }
    this.setHeader('Content-Type', 'text/html');
    this.end(chunk);
    return this;
  },

  json(obj) {
    const val = JSON.stringify(obj);
    this.setHeader('Content-Type', 'application/json');
    return this.send(val);
  }
};
      `
    },
    {
      path: 'lib/utils.js',
      language: 'javascript',
      content: `
/**
 * Utility helpers for caching, parsing, and hashing.
 */
export function compileETag(type) {
  return function generateETag(body) {
    return '"' + Buffer.from(body).length.toString(16) + '"';
  };
}

export function normalizeType(type) {
  return type.indexOf('/') === -1 ? 'application/' + type : type;
}
      `
    }
  ],
  learningMilestones: [
    {
      id: 'exp-m1',
      stage: 1,
      stageTitle: 'Foundation & Entry Point',
      title: 'Application Bootstrap & Prototypal Inheritance',
      concept: 'How Express instantiates an callable app function combining EventEmitter with proto mixins',
      difficulty: 'Beginner',
      targetFiles: ['lib/express.js', 'lib/application.js'],
      targetFunctions: ['createApplication', 'init'],
      estimatedTime: '12 mins',
      status: 'completed',
      keyTakeaways: [
        'Express apps are actually executable functions (function(req, res, next))',
        'Object.assign mixes application.proto and EventEmitter methods',
        'Lazy initialization delays Router creation until the first route or middleware is mounted'
      ],
      quiz: {
        id: 'quiz-exp-1',
        question: 'Why is the express application created as a function instead of a standard class instance?',
        options: [
          'Because JavaScript classes were not yet invented in 2010',
          'So it can be passed directly into http.createServer(app) as a native request listener',
          'To prevent memory leaks caused by prototype pollution',
          'To enforce synchronous execution of all HTTP request handlers'
        ],
        correctIndex: 1,
        explanation: 'http.createServer expects a function (req, res) => void. By returning a function with augmented properties, Express passes directly to Node\'s HTTP module.',
        targetFile: 'lib/express.js',
        conceptTag: 'Bootstrap'
      }
    },
    {
      id: 'exp-m2',
      stage: 2,
      stageTitle: 'Routing Architecture',
      title: 'The Router and Layer Stack',
      concept: 'How incoming HTTP URLs are matched via regular expressions in a recursive stack pipeline',
      difficulty: 'Intermediate',
      targetFiles: ['lib/router/index.js', 'lib/router/layer.js'],
      targetFunctions: ['handle', 'match', 'next'],
      estimatedTime: '18 mins',
      status: 'in-progress',
      keyTakeaways: [
        'The Router holds a stack of Layer instances',
        'Each layer wraps either middleware or a sub-Route with a regex path matcher',
        'The iconic next() callback advances the index pointer through matching layers'
      ],
      quiz: {
        id: 'quiz-exp-2',
        question: 'What happens inside router.handle when layer.match(req.url) evaluates to false?',
        options: [
          'A 404 Not Found response is immediately returned to the client',
          'An unhandled exception is thrown terminating the server',
          'The router immediately invokes next(err) to test the subsequent layer in the stack',
          'The layer recompiles its regex with case-insensitive flags'
        ],
        correctIndex: 2,
        explanation: 'If a layer does not match the URL path, next() is called to skip it and continue evaluating the remaining layers in the stack.',
        targetFile: 'lib/router/index.js',
        conceptTag: 'Routing Pipeline'
      }
    },
    {
      id: 'exp-m3',
      stage: 3,
      stageTitle: 'Dispatch & HTTP Verbs',
      title: 'Route Method Multiplexing',
      concept: 'Separating path matching from HTTP method (GET, POST, PUT, DELETE) dispatching',
      difficulty: 'Intermediate',
      targetFiles: ['lib/router/route.js'],
      targetFunctions: ['dispatch'],
      estimatedTime: '15 mins',
      status: 'locked',
      keyTakeaways: [
        'A Route represents a single path with multiple HTTP verb handlers',
        'dispatch() checks if the Route has registered a handler for req.method',
        'Separating Layer and Route keeps middleware and route handlers uniformly dispatched'
      ],
      quiz: {
        id: 'quiz-exp-3',
        question: 'What is the architectural purpose of having both Layer and Route classes?',
        options: [
          'Layer handles URL path regex matching, while Route manages HTTP method dispatching for that path',
          'Layer is for WebSockets, Route is for REST endpoints',
          'Layer runs only on the client, while Route runs on the Node.js server',
          'Route is deprecated and only kept for legacy backwards compatibility'
        ],
        correctIndex: 0,
        explanation: 'Layer provides uniform path abstraction and regex testing for both global middleware and endpoint routes, while Route manages specific HTTP method handlers (GET, POST, etc.).',
        targetFile: 'lib/router/route.js',
        conceptTag: 'Method Multiplexing'
      }
    },
    {
      id: 'exp-m4',
      stage: 4,
      stageTitle: 'Response Stream Augmentation',
      title: 'Helpers, Content Negotiation & Headers',
      concept: 'How Express enriches Node.js ServerResponse with res.json, res.send, and status codes',
      difficulty: 'Advanced',
      targetFiles: ['lib/response.js', 'lib/utils.js'],
      targetFunctions: ['send', 'json', 'compileETag'],
      estimatedTime: '20 mins',
      status: 'locked',
      keyTakeaways: [
        'res.json automatically serializes objects and sets application/json headers',
        'ETags are compiled dynamically based on buffer size and payload content',
        'Method chaining is enabled by returning this from response prototype helpers'
      ],
      quiz: {
        id: 'quiz-exp-4',
        question: 'Why do response methods like res.status(200) return "this"?',
        options: [
          'To trigger garbage collection on the underlying TCP socket',
          'To enable fluent method chaining such as res.status(200).json({ success: true })',
          'To freeze the HTTP response headers and prevent mutations',
          'To return a Promise that resolves when the client receives the bytes'
        ],
        correctIndex: 1,
        explanation: 'Returning "this" implements the fluent interface pattern, allowing developers to chain .status(), .set(), and .json() in a single concise statement.',
        targetFile: 'lib/response.js',
        conceptTag: 'Fluent API'
      }
    }
  ]
};

export const FLASK_REPO: DemoRepoData = {
  metadata: {
    owner: 'pallets',
    name: 'flask',
    description: 'The Python micro framework for building web applications',
    url: 'https://github.com/pallets/flask',
    stars: 67300,
    forks: 16100,
    defaultBranch: 'main',
    language: 'Python',
    totalFiles: 38,
    totalLines: 6420,
    sizeKb: 1180,
    topics: ['python', 'web-framework', 'wsgi', 'jinja', 'werkzeug'],
    healthScore: 98,
    architectureQualityScore: 95
  },
  presetQuestions: [
    'How does Flask thread-local request context (request, g) work under the hood?',
    'Where are Blueprints registered and mapped to the URL map in Flask?',
    'Explain how Werkzeug WSGI dispatcher triggers Flask.wsgi_app().',
    'How do decorators like @app.route() register view functions?'
  ],
  files: [
    {
      path: 'src/flask/app.py',
      language: 'python',
      content: `
"""
Flask core application class.
"""
from flask.ctx import RequestContext, AppContext
from flask.blueprints import Blueprint
from werkzeug.routing import Map, Rule

class Flask:
    def __init__(self, import_name):
        self.import_name = import_name
        self.url_map = Map()
        self.view_functions = {}
        self.blueprints = {}

    def route(self, rule, **options):
        def decorator(f):
            endpoint = options.pop("endpoint", f.__name__)
            self.add_url_rule(rule, endpoint, f, **options)
            return f
        return decorator

    def add_url_rule(self, rule, endpoint, view_func, **options):
        options["endpoint"] = endpoint
        methods = options.pop("methods", ("GET",))
        rule_obj = Rule(rule, methods=methods, **options)
        self.url_map.add(rule_obj)
        self.view_functions[endpoint] = view_func

    def register_blueprint(self, blueprint, **options):
        self.blueprints[blueprint.name] = blueprint
        blueprint.register(self, options)

    def wsgi_app(self, environ, start_response):
        ctx = self.request_context(environ)
        error = None
        try:
            ctx.push()
            response = self.full_dispatch_request()
        except Exception as e:
            error = e
            response = self.handle_exception(e)
        finally:
            ctx.pop(error)
        return response(environ, start_response)

    def __call__(self, environ, start_response):
        return self.wsgi_app(environ, start_response)
      `
    },
    {
      path: 'src/flask/ctx.py',
      language: 'python',
      content: `
"""
Context locals managing current_app, request, and g globals.
"""
from werkzeug.local import LocalStack

_cv_app = LocalStack()
_cv_request = LocalStack()

class RequestContext:
    def __init__(self, app, environ):
        self.app = app
        self.request = app.request_class(environ)
        self.session = None

    def push(self):
        _cv_request.push(self)

    def pop(self, exc=None):
        _cv_request.pop()

class AppContext:
    def __init__(self, app):
        self.app = app
        self.g = app.app_ctx_globals_class()

    def push(self):
        _cv_app.push(self)

    def pop(self, exc=None):
        _cv_app.pop()
      `
    },
    {
      path: 'src/flask/blueprints.py',
      language: 'python',
      content: `
"""
Blueprint modular routing abstraction.
"""
class Blueprint:
    def __init__(self, name, import_name, url_prefix=None):
        self.name = name
        self.import_name = import_name
        self.url_prefix = url_prefix
        self.deferred_functions = []

    def route(self, rule, **options):
        def decorator(f):
            self.deferred_functions.append(
                lambda s: s.add_url_rule(self.url_prefix + rule, f.__name__, f, **options)
            )
            return f
        return decorator

    def register(self, app, options):
        for deferred in self.deferred_functions:
            deferred(app)
      `
    }
  ],
  learningMilestones: [
    {
      id: 'fl-m1',
      stage: 1,
      stageTitle: 'WSGI Protocol & App Call',
      title: 'The Python WSGI Protocol',
      concept: 'How __call__ routes the WSGI environment tuple (environ, start_response) to wsgi_app',
      difficulty: 'Beginner',
      targetFiles: ['src/flask/app.py'],
      targetFunctions: ['wsgi_app', '__call__'],
      estimatedTime: '10 mins',
      status: 'completed',
      keyTakeaways: [
        'Flask applications conform directly to PEP 3333 WSGI callable specifications',
        'Incoming HTTP requests enter through wsgi_app(environ, start_response)',
        'Exceptions are caught and transformed into HTTP error responses within the WSGI pipeline'
      ],
      quiz: {
        id: 'quiz-fl-1',
        question: 'What is the purpose of the wsgi_app method in Flask?',
        options: [
          'To compile Python bytecode into C extensions',
          'To serve as the raw WSGI interface that receives environ and start_response from the server',
          'To start a background multi-threaded Celery worker',
          'To automatically connect to PostgreSQL on startup'
        ],
        correctIndex: 1,
        explanation: 'wsgi_app is the real WSGI application implementation. Delegating __call__ to wsgi_app allows middleware to wrap the inner app easily.',
        targetFile: 'src/flask/app.py',
        conceptTag: 'WSGI'
      }
    },
    {
      id: 'fl-m2',
      stage: 2,
      stageTitle: 'Context Locals',
      title: 'Context Stacks & Global Proxies',
      concept: 'How Flask provides thread-safe access to request and g without passing them into every function',
      difficulty: 'Intermediate',
      targetFiles: ['src/flask/ctx.py'],
      targetFunctions: ['push', 'pop'],
      estimatedTime: '18 mins',
      status: 'in-progress',
      keyTakeaways: [
        'LocalStack manages thread/task isolated stacks for AppContext and RequestContext',
        'push() is invoked before request processing and pop() is invoked on completion',
        'Enables transparent access to current_app and request across application files'
      ],
      quiz: {
        id: 'quiz-fl-2',
        question: 'Why does Flask use Context Stacks (LocalStack) instead of standard global variables?',
        options: [
          'Because standard global variables are forbidden by PEP 8 style guides',
          'To prevent race conditions and cross-request data leaks in multi-threaded web servers',
          'To force all database transactions to commit synchronously',
          'To encrypt request payloads in memory'
        ],
        correctIndex: 1,
        explanation: 'LocalStack provides thread-isolated storage. Each worker thread maintains its own independent context, ensuring concurrent requests do not overwrite each other\'s state.',
        targetFile: 'src/flask/ctx.py',
        conceptTag: 'Thread Safety'
      }
    }
  ]
};

export const DEMO_REPOSITORIES: Record<string, DemoRepoData> = {
  'expressjs/express': EXPRESS_REPO,
  'pallets/flask': FLASK_REPO
};
