// Loads the native module built by `rust-anything build`.
const native = require("./bm25_rs.node");

// Structured values cross as JSON text. JSON has no `undefined`, NaN, -0, bigint, Date, Map, Set
// or bytes, and Rust strings no lone surrogates: those travel as one-key marker objects
// (`{"$undefined": true}`, `{"$num": "NaN"}`, `{"$map": [[k, v]]}`, `{"$bytes": [...]}`, ...),
// the same markers recordings use.
const replacer = function (k, v) {
  const raw = this[k];
  if (raw instanceof Date)
    return {
      $date: Number.isNaN(raw.getTime()) ? "Invalid" : raw.toISOString(),
    };
  if (typeof Buffer !== "undefined" && Buffer.isBuffer(raw))
    return { $buffer: Array.from(raw) };
  if (raw instanceof Uint8Array) return { $bytes: Array.from(raw) };
  if (raw instanceof Map) return { $map: [...raw] };
  if (raw instanceof Set) return { $set: [...raw] };
  return v === undefined
    ? { $undefined: true }
    : typeof v === "bigint"
      ? { $bigint: String(v) }
      : typeof v === "number"
        ? Number.isFinite(v) && !Object.is(v, -0)
          ? v
          : { $num: Object.is(v, -0) ? "-0" : String(v) }
        : typeof v === "string" && !v.isWellFormed()
          ? {
              $utf16: Array.from({ length: v.length }, (_, i) =>
                v.charCodeAt(i),
              ),
            }
          : v;
};
const encode = (v) => JSON.stringify(v, replacer);
const single = (v, key) => Object.keys(v).length === 1 && key in v;
const revive = (v) =>
  Array.isArray(v)
    ? v.map(revive)
    : v !== null && typeof v === "object"
      ? single(v, "$undefined")
        ? undefined
        : single(v, "$utf16")
          ? fromUnits(v.$utf16)
          : single(v, "$num")
            ? Number(v.$num)
            : single(v, "$bigint")
              ? BigInt(v.$bigint)
              : single(v, "$date")
                ? new Date(v.$date)
                : single(v, "$bytes")
                  ? Uint8Array.from(v.$bytes)
                  : single(v, "$buffer")
                    ? Buffer.from(v.$buffer)
                    : single(v, "$map")
                      ? new Map(v.$map.map(([k, x]) => [revive(k), revive(x)]))
                      : single(v, "$set")
                        ? new Set(v.$set.map(revive))
                        : Object.fromEntries(
                            Object.entries(v).map(([k, x]) => [k, revive(x)]),
                          )
      : v;
// Most results carry no marker: skip the walk unless the text has one.
const decode = (text) => {
  const value = JSON.parse(text);
  return text.includes('"$') ? revive(value) : value;
};
const fromUnits = (units) => {
  let out = "";
  for (let i = 0; i < units.length; i += 8192)
    out += String.fromCharCode.apply(
      null,
      Array.prototype.slice.call(units, i, i + 8192),
    );
  return out;
};

module.exports = { ...native };
const specs = {};
const classes = {
  BM25Core: [
    [],
    { add: [[0, 0], "raw"], search: [[0, 0], "json"], size: [[], "raw"] },
  ],
};
const convert = (result) =>
  result === "json" ? decode : result === "units" ? fromUnits : (x) => x;
// An omitted structured argument is `undefined`, not a missing value.
const prepare = (a, structured) =>
  Array.from({ length: Math.max(a.length, structured.length) }, (_, i) =>
    structured[i] ? encode(a[i]) : a[i],
  );
// Functions: [structured arguments, result kind, async].
for (const [name, [structured, result, isAsync]] of Object.entries(specs)) {
  const call = native[name];
  const out = convert(result);
  module.exports[name] = isAsync
    ? async (...a) => out(await call(...prepare(a, structured)))
    : (...a) => out(call(...prepare(a, structured)));
}
// Classes: a JS class around the native one, converting arguments and results.
const INNER = Symbol("native");
for (const [name, [ctor, methods]] of Object.entries(classes)) {
  const Native = native[name];
  const Wrapped = {
    [name]: class {
      constructor(...a) {
        this[INNER] = new Native(...prepare(a, ctor));
      }
    },
  }[name];
  for (const [method, [structured, result]] of Object.entries(methods)) {
    const out = convert(result);
    Wrapped.prototype[method] = function (...a) {
      return out(this[INNER][method](...prepare(a, structured)));
    };
  }
  module.exports[name] = Wrapped;
}
