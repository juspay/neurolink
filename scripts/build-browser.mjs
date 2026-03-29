import * as esbuild from 'esbuild';
import { mkdirSync, readFileSync, writeFileSync } from 'fs';
import { gzipSync } from 'zlib';

mkdirSync('dist/browser', { recursive: true });

// Node.js builtins to stub
const nodeBuiltins = [
  'fs','fs/promises','path','path/posix','crypto','os','events','http','https','net','tls',
  'stream','stream/promises','stream/web','stream/consumers','zlib','child_process','url',
  'util','util/types','assert','module','async_hooks','querystring','dns','dns/promises',
  'http2','perf_hooks','diagnostics_channel','process','buffer','console','timers',
  'timers/promises','worker_threads','v8','readline','sqlite',
];

// npm packages to stub (native/server-only)
const npmStubs = [
  'sharp','canvas','ffmpeg-static','ffprobe-static','@resvg/resvg-wasm','satori','satori-html',
  'better-sqlite3','node-pty','redis','@google-cloud/text-to-speech','google-auth-library',
  '@google-cloud/vertexai','cors','fastify','fastify-plugin','express','koa','@fastify/cors',
  'mammoth','pdf-parse','exceljs','adm-zip','tar-stream','music-metadata','fluent-ffmpeg',
  'pptxgenjs','csv-parser','@juspay/hippocampus','@aws-sdk/client-bedrock',
  '@aws-sdk/client-bedrock-runtime','@aws-sdk/client-sagemaker-runtime','@hapi/bourne',
  'ajv','ajv-formats','debug','iconv-lite','inherits','ip-address','pkce-challenge','qs',
  'which','pdf-to-img','express-rate-limit','@hono/node-server','powershell-utils',
  'wsl-utils','default-browser','default-browser-id','run-applescript','open',
  '@langfuse/langfuse','undici','bullmq','croner','ioredis',
];

// OTel packages
const otelPkgs = [
  '@opentelemetry/api','@opentelemetry/resources','@opentelemetry/sdk-trace-node',
  '@opentelemetry/sdk-trace-base','@opentelemetry/sdk-node','@opentelemetry/core',
  '@opentelemetry/exporter-trace-otlp-http','@opentelemetry/semantic-conventions','@opentelemetry/context-async-hooks',
  '@opentelemetry/instrumentation','@opentelemetry/auto-instrumentations-node',
  '@opentelemetry/instrumentation-amqplib','@opentelemetry/instrumentation-aws-lambda',
  '@opentelemetry/instrumentation-aws-sdk','@opentelemetry/instrumentation-http',
  '@langfuse/otel',
];

const NODE_STUB_JS = `
const noop = () => {};
const noopAsync = async () => {};
export default {};
export const promises = { readFile: noopAsync, writeFile: noopAsync, mkdir: noopAsync, stat: noopAsync, readdir: noopAsync, unlink: noopAsync, access: noopAsync, rm: noopAsync, rename: noopAsync };
export const createHash = (algorithm) => {
  const chunks = [];
  return {
    update(data) { chunks.push(typeof data === 'string' ? new TextEncoder().encode(data) : data); return this; },
    digest(encoding) {
      // Synchronous hash not available in browser — provide a deterministic fallback
      let hash = 0;
      for (const chunk of chunks) for (let i = 0; i < chunk.length; i++) { hash = ((hash << 5) - hash + chunk[i]) | 0; }
      const hex = (hash >>> 0).toString(16).padStart(8, '0');
      if (encoding === 'hex') return hex;
      if (encoding === 'base64') return btoa(hex);
      return hex;
    }
  };
};
export const randomBytes = (n) => new Uint8Array(n||32);
export const randomUUID = () => globalThis.crypto?.randomUUID?.() || Math.random().toString(36);
export const webcrypto = globalThis.crypto;
export const createServer = () => ({listen:noop,close:noop,on:noop});
export const join = (...a) => a.join('/');
export const resolve = (...a) => a.join('/');
export const dirname = (p) => p || '';
export const basename = (p) => p?.split?.('/')?.pop?.() || '';
export const extname = (p) => { const m=p?.match?.(/\\.[^.]+$/); return m?m[0]:''; };
export const relative = (a,b) => b || '';
export const isAbsolute = () => false;
export const sep = '/';
export const posix = { normalize:(p)=>p, join:(...a)=>a.join('/'), resolve:(...a)=>a.join('/'), sep:'/' };
export const normalize = (p) => p;
export const EventEmitter = class { on(){return this} off(){return this} emit(){return this} once(){return this} removeListener(){return this} addListener(){return this} };
export const AsyncLocalStorage = class { getStore(){} run(s,fn,...a){return fn(...a)} enterWith(){} disable(){} };
export const Readable = class { pipe(){return this} on(){return this} read(){return null} push(){} destroy(){} };
export const Writable = class { write(){return true} end(){} on(){return this} destroy(){} };
export const Transform = class { push(){} on(){return this} };
export const Duplex = class { on(){return this} };
export const PassThrough = class { pipe(){return this} on(){return this} };
export const ReadableStream = globalThis.ReadableStream || class {};
export const pipeline = noop;
export const finished = noop;
export const existsSync = () => false;
export const readFileSync = () => '';
export const writeFileSync = noop;
export const chmodSync = noop;
export const appendFile = noopAsync;
export const realpathSync = (p) => p;
export const copyFileSync = noop;
export const openSync = () => 0;
export const closeSync = noop;
export const fstatSync = () => ({});
export const mkdirSync = noop;
export const statSync = () => ({});
export const readdirSync = () => [];
export const unlinkSync = noop;
export const renameSync = noop;
export const rmdirSync = noop;
export const createWriteStream = () => new Writable();
export const createReadStream = () => new Readable();
export const readFile = noopAsync;
export const writeFile = noopAsync;
export const mkdir = noopAsync;
export const stat = noopAsync;
export const readdir = noopAsync;
export const unlink = noopAsync;
export const access = noopAsync;
export const rename = noopAsync;
export const rm = noopAsync;
export const spawn = () => ({on:noop,stdout:{on:noop},stderr:{on:noop},kill:noop});
export const exec = (c,cb) => cb?.(null,'','');
export const execSync = () => '';
export const execFile = (c,a,cb) => { if(typeof a==='function') a(null,'',''); else cb?.(null,'',''); };
export const execFileSync = () => '';
export const platform = 'browser';
export const homedir = () => '/';
export const tmpdir = () => '/tmp';
export const hostname = () => 'browser';
export const cpus = () => [{}];
export const freemem = () => 0;
export const totalmem = () => 0;
export const type = () => 'Browser';
export const arch = () => 'wasm';
export const release = () => '0';
export const request = () => ({});
export const get = () => ({});
export const connect = () => ({});
export const createConnection = () => ({});
export const inflateSync = () => new Uint8Array();
export const deflateSync = () => new Uint8Array();
export const gunzipSync = () => new Uint8Array();
export const gzipSync = () => new Uint8Array();
export const gunzip = (b,cb) => cb?.(null,b);
export const createGunzip = () => ({});
export const createGzip = () => ({});
export const ok = noop;
export const strict = {};
export const createRequire = () => () => ({});
export const builtinModules = [];
export const isBuiltin = () => false;
export const parse = (u) => ({pathname:u||'',hostname:'',protocol:'',search:'',hash:''});
export const format = () => '';
export const URL = globalThis.URL;
export const URLSearchParams = globalThis.URLSearchParams;
export const fileURLToPath = (u) => typeof u==='string'?u.replace('file://',''):u;
export const pathToFileURL = (p) => new globalThis.URL('file://'+p);
export const inherits = (c,s) => { if(s){c.super_=s;Object.setPrototypeOf(c.prototype,s.prototype)} };
export const promisify = (fn) => (...args) => new Promise((res,rej) => fn(...args,(err,val) => err?rej(err):res(val)));
export const debuglog = (section) => { const fn = (...args) => {}; fn.enabled = false; return fn; };
export const debug = debuglog;
export const inspect = (obj) => { try{return JSON.stringify(obj,null,2)}catch{return String(obj)} };
inspect.custom = Symbol.for('nodejs.util.inspect.custom');
inspect.colors = {}; inspect.styles = {};
export const deprecate = (fn) => fn;
export const callbackify = (fn) => (...args) => { const cb=args.pop(); fn(...args).then(r=>cb(null,r)).catch(cb) };
export const isDeepStrictEqual = (a,b) => JSON.stringify(a)===JSON.stringify(b);
export const toUSVString = (s) => String(s);
export const types = { isPromise:(v)=>v instanceof Promise, isDate:(v)=>v instanceof Date, isRegExp:(v)=>v instanceof RegExp, isNativeError:(v)=>v instanceof Error, isArrayBuffer:(v)=>v instanceof ArrayBuffer, isTypedArray:(v)=>ArrayBuffer.isView(v), isUint8Array:(v)=>v instanceof Uint8Array, isProxy:()=>false };
export const TextDecoder = globalThis.TextDecoder;
export const TextEncoder = globalThis.TextEncoder;
export const lookup = (h,cb) => cb?.(null,'127.0.0.1',4);
export const Resolver = class {};
export const performance = globalThis.performance || {now:()=>Date.now()};
export const PerformanceObserver = class { observe(){} disconnect(){} };
export const monitorEventLoopDelay = () => ({enable:noop,disable:noop,percentile:()=>0});
export const channel = () => ({});
export const Channel = class {};
export const hasSubscribers = () => false;
export const serialize = () => new Uint8Array();
export const deserialize = noop;
export const Worker = class {};
export const isMainThread = true;
export const parentPort = null;
export const workerData = null;
export const createInterface = () => ({});
export const Interface = class {};
export const DatabaseSync = class {};
export const Buffer = globalThis.Buffer || class B extends Uint8Array {
  static from(d, encoding) {
    if (typeof d === 'string') {
      const enc = (encoding || 'utf8').toLowerCase();
      if (enc === 'base64') { const binary = atob(d); const bytes = new Uint8Array(binary.length); for(let i=0;i<binary.length;i++) bytes[i]=binary.charCodeAt(i); return bytes; }
      if (enc === 'hex') { const bytes = new Uint8Array(d.length/2); for(let i=0;i<d.length;i+=2) bytes[i/2]=parseInt(d.substr(i,2),16); return bytes; }
      return new TextEncoder().encode(d);
    }
    return new Uint8Array(d);
  }
  static alloc(n) { return new Uint8Array(n); }
  static isBuffer(o) { return o instanceof Uint8Array; }
  static concat(l) { const t=l.reduce((s,b)=>s+b.length,0);const r=new Uint8Array(t);let o=0;for(const b of l){r.set(b,o);o+=b.length;}return r; }
  static byteLength(s,encoding) { if(encoding==='base64') return Math.ceil(s.length*3/4); return new TextEncoder().encode(s).length; }
  toString(encoding) {
    const enc=(encoding||'utf8').toLowerCase();
    if(enc==='hex') return Array.from(new Uint8Array(this.buffer,this.byteOffset,this.byteLength)).map(b=>b.toString(16).padStart(2,'0')).join('');
    if(enc==='base64'){let b='';for(let i=0;i<this.length;i++)b+=String.fromCharCode(this[i]);return btoa(b);}
    return new TextDecoder().decode(this);
  }
};
export const constants = { F_OK:0, R_OK:4, W_OK:2, X_OK:1 };
export const isIPv6 = () => false;
export const isIPv4 = () => false;
export const isIP = () => 0;
export const Http2ServerRequest = class {};
export const Http2ServerResponse = class {};
export const arrayBuffer = async () => new ArrayBuffer(0);
const wrapTimer = (id) => ({ [Symbol.toPrimitive](){return id}, ref(){return this}, unref(){return this}, hasRef(){return false}, refresh(){return this}, close(){} });
export const setTimeout = (...a) => wrapTimer(globalThis.setTimeout(...a));
export const clearTimeout = globalThis.clearTimeout;
export const setInterval = (...a) => wrapTimer(globalThis.setInterval(...a));
export const clearInterval = globalThis.clearInterval;
export const MIMEType = class { constructor(s){this.type=s} toString(){return this.type} };
`;

const PROXY_STUB_JS = `
const handler={get(t,p){if(p==='__esModule')return true;if(p==='default')return new Proxy({},{get:handler.get});return new Proxy(function(...a){return new Proxy({},{get:handler.get})},{get:handler.get,apply(t,th,a){return new Proxy({},{get:handler.get})},construct(t,a){return new Proxy({},{get:handler.get})}})}};
const mod=new Proxy({},handler);
export default mod;
export const {BedrockClient,ListFoundationModelsCommand,BedrockRuntimeClient,ConverseCommand,ConverseStreamCommand,ImageFormat}=mod;
export const {SageMakerRuntimeClient,InvokeEndpointCommand,InvokeEndpointWithResponseStreamCommand}=mod;
export const {GoogleAuth,VertexAI,TextToSpeechClient}=mod;
export const {Hippocampus,HippocampusConfig}=mod;
export const {createClient}=mod;
export const {Queue,Worker,Job,QueueScheduler,FlowProducer}=mod;
export const {Cron}=mod;
export const {parseBuffer,selectCover}=mod;
export const {Hono}=mod;
export const {cors,HTTPException,logger,secureHeaders,streamSSE,timeout}=mod;
export const fetch=globalThis.fetch;
export const Request=globalThis.Request;
export const Response=globalThis.Response;
export const Headers=globalThis.Headers;
export const FormData=globalThis.FormData;
export const File=globalThis.File;
export const Blob=globalThis.Blob;
export const Agent=mod.Agent;
export const Pool=mod.Pool;
export const Client=mod.Client;
export const Dispatcher=mod.Dispatcher;
export const setGlobalDispatcher=()=>{};
export const getGlobalDispatcher=()=>mod;
export const MockAgent=mod.MockAgent;
export const interceptors={redirect:()=>(d)=>d,retry:()=>(d)=>d};
export const request=async(url,opts)=>{const r=await globalThis.fetch(url,opts);return{statusCode:r.status,headers:Object.fromEntries(r.headers.entries()),body:{text:()=>r.text(),json:()=>r.json(),arrayBuffer:()=>r.arrayBuffer()}}};
`;

const OTEL_STUB_JS = `
const NOOP_SPAN={setAttribute(){return this},setAttributes(){return this},addEvent(){return this},setStatus(){return this},updateName(){return this},end(){},isRecording(){return false},recordException(){},spanContext(){return{traceId:'0',spanId:'0',traceFlags:0}}};
const NOOP_TRACER={startSpan(){return NOOP_SPAN},startActiveSpan(n,o,f){const fn=typeof o==='function'?o:f;return fn(NOOP_SPAN)}};
const NOOP_METER={createCounter(){return{add(){}}},createHistogram(){return{record(){}}},createUpDownCounter(){return{add(){}}},createObservableGauge(){return{addCallback(){}}}};
const ROOT_CTX={getValue(){},setValue(){return ROOT_CTX},deleteValue(){return ROOT_CTX}};
export const trace={getTracer(){return NOOP_TRACER},getTracerProvider(){return{getTracer(){return NOOP_TRACER}}},setGlobalTracerProvider(){},getSpan(){return NOOP_SPAN},getActiveSpan(){},setSpan(c){return c},deleteSpan(c){return c},setSpanContext(c){return c},getSpanContext(){}};
export const context={active(){return ROOT_CTX},with(c,fn){return fn()},bind(c,fn){return fn},setValue(){return ROOT_CTX},getValue(){}};
export const propagation={inject(){},extract(c){return c},setGlobalPropagator(){},getBaggage(){},setBaggage(c){return c},createBaggage(){return{getAllEntries(){return[]},getEntry(){},setEntry(){return this},removeEntry(){return this}}}};
export const metrics={getMeter(){return NOOP_METER},getMeterProvider(){return{getMeter(){return NOOP_METER}}},setGlobalMeterProvider(){}};
export const diag={setLogger(){},verbose(){},debug(){},info(){},warn(){},error(){},createComponentLogger(){return diag}};
export const SpanStatusCode={UNSET:0,OK:1,ERROR:2};
export const SpanKind={INTERNAL:0,SERVER:1,CLIENT:2,PRODUCER:3,CONSUMER:4};
export const TraceFlags={NONE:0,SAMPLED:1};
export const DiagConsoleLogger=class{};
export const DiagLogLevel={NONE:0,ERROR:30,WARN:50,INFO:60,DEBUG:70,VERBOSE:80,ALL:9999};
export const ValueType={INT:0,DOUBLE:1};
export const isSpanContextValid=()=>false;
export const isValidTraceId=()=>false;
export const isValidSpanId=()=>false;
export const INVALID_SPAN_CONTEXT={traceId:'0',spanId:'0',traceFlags:0};
export const baggageEntryMetadataFromString=()=>({});
export const NodeSDK=class{start(){}shutdown(){return Promise.resolve()}};
export const BasicTracerProvider=class{constructor(){}register(){}addSpanProcessor(){}getTracer(){return NOOP_TRACER}shutdown(){return Promise.resolve()}};
export const NodeTracerProvider=class{register(){}addSpanProcessor(){}getTracer(){return NOOP_TRACER}shutdown(){return Promise.resolve()}};
export const SimpleSpanProcessor=class{onStart(){}onEnd(){}shutdown(){return Promise.resolve()}forceFlush(){return Promise.resolve()}};
export const BatchSpanProcessor=class{onStart(){}onEnd(){}shutdown(){return Promise.resolve()}forceFlush(){return Promise.resolve()}};
export const OTLPTraceExporter=class{export(){}shutdown(){return Promise.resolve()}};
export const getNodeAutoInstrumentations=()=>[];
export const registerInstrumentations=()=>{};
export const resourceFromAttributes=(a)=>({attributes:a||{},merge(){return this}});
export const LangfuseSpanProcessor=class{onStart(){}onEnd(){}shutdown(){return Promise.resolve()}forceFlush(){return Promise.resolve()}};
export const AsyncLocalStorageContextManager=class{enable(){return this}disable(){return this}};
export const ATTR_SERVICE_NAME='service.name';
export const ATTR_SERVICE_VERSION='service.version';
export const SEMRESATTRS_SERVICE_NAME='service.name';
export const SEMRESATTRS_SERVICE_VERSION='service.version';
export default{trace,context,propagation,metrics,diag,SpanStatusCode,SpanKind};
`;

const catchAllPlugin = {
  name: 'catch-all-stub',
  setup(build) {
    const isNodeBuiltin = (p) => nodeBuiltins.some(b => p === b || p === `node:${b}`);
    const isOtel = (p) => otelPkgs.some(o => p === o || p.startsWith(o + '/'));
    const isNpmStub = (p) => npmStubs.some(s => p === s || p.startsWith(s + '/'));
    const isHono = (p) => p === 'hono' || p.startsWith('hono/');

    build.onResolve({ filter: /^node:/ }, (args) => ({ path: args.path, namespace: 'node-stub' }));

    build.onResolve({ filter: /.*/ }, (args) => {
      const p = args.path;
      if (p.startsWith('.') || p.startsWith('/')) return undefined;
      if (isNodeBuiltin(p)) return { path: p, namespace: 'node-stub' };
      if (isOtel(p)) return { path: p, namespace: 'otel-stub' };
      if (isNpmStub(p) || isHono(p)) return { path: p, namespace: 'npm-stub' };
      return undefined;
    });

    build.onLoad({ filter: /.*/, namespace: 'node-stub' }, () => ({ contents: NODE_STUB_JS, loader: 'js' }));
    build.onLoad({ filter: /.*/, namespace: 'otel-stub' }, () => ({ contents: OTEL_STUB_JS, loader: 'js' }));
    build.onLoad({ filter: /.*/, namespace: 'npm-stub' }, () => ({ contents: PROXY_STUB_JS, loader: 'js' }));
  },
};

// Build
const dev = process.argv.includes('--dev');

const result = await esbuild.build({
  entryPoints: ['./src/browser/entry.ts'],
  bundle: true,
  platform: 'neutral',
  format: 'esm',
  outfile: dev ? 'dist/browser/neurolink.js' : 'dist/browser/neurolink.min.js',
  target: 'es2022',
  logLimit: 0,
  minify: !dev,
  treeShaking: true,
  plugins: [catchAllPlugin],
  loader: { '.ts': 'ts' },
  nodePaths: ['./node_modules'],
});

const outFile = dev ? 'dist/browser/neurolink.js' : 'dist/browser/neurolink.min.js';

// Post-process: patch __esm to be resilient to init failures
const originalSrc = readFileSync(outFile, 'utf8');
// Match esbuild's __esm pattern and wrap the init call in try/catch
const patchedSrc = originalSrc.replace(
  /var __esm\s*=\s*\(fn,\s*res\)\s*=>\s*function __init\(\)\s*\{\s*return fn\s*&&\s*\(res\s*=\s*\(0,\s*fn\[__getOwnPropNames\(fn\)\[0\]\]\)\(fn\s*=\s*0\)\),\s*res;\s*\}/,
  `var __esm = (fn, res) => function __init() { try { return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res; } catch(e) { console.warn("[NeuroLink:browser] module init skipped:", String(e)); fn = 0; return res; } }`
);
if (patchedSrc === originalSrc) {
  console.warn('[NeuroLink:browser] Warning: __esm pattern not found, patch not applied');
}
writeFileSync(outFile, patchedSrc);

const raw = readFileSync(outFile);
const gz = gzipSync(raw);

console.log(`Build: ${result.errors.length} errors, ${result.warnings.length} warnings`);
console.log(`Output: ${outFile}`);
console.log(`Size: ${(raw.length / 1024 / 1024).toFixed(2)} MB raw, ${(gz.length / 1024 / 1024).toFixed(2)} MB gzipped`);
