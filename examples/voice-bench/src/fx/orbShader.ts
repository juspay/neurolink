// Fragment shader for the NeuroLink core: a lit, slowly turning sphere of flowing brand colour
// that swells with the mic level. Simplex noise by Ashima Arts / Stefan Gustavson (MIT).
export const ORB_VERT = `attribute vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }`;
export const ORB_FRAG = `
precision highp float;
uniform vec2 uRes; uniform float uTime, uLevel, uState, uSize;
uniform vec3 uA, uB, uC, uHot;
// Simplex 3D noise — Ashima Arts / Stefan Gustavson (MIT)
vec4 perm(vec4 x){ return mod(((x*34.0)+1.0)*x, 289.0); }
vec4 tis(vec4 r){ return 1.79284291400159 - 0.85373472095314 * r; }
float snoise(vec3 v){
  const vec2 C = vec2(1.0/6.0, 1.0/3.0); const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i = floor(v + dot(v, C.yyy)); vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz); vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy); vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx; vec3 x2 = x0 - i2 + 2.0*C.xxx; vec3 x3 = x0 - 1.0 + 3.0*C.xxx;
  i = mod(i, 289.0);
  vec4 p = perm(perm(perm(i.z + vec4(0.0, i1.z, i2.z, 1.0)) + i.y + vec4(0.0, i1.y, i2.y, 1.0)) + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 1.0/7.0; vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z); vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ * ns.x + ns.yyyy; vec4 y = y_ * ns.x + ns.yyyy; vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy); vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0)*2.0 + 1.0; vec4 s1 = floor(b1)*2.0 + 1.0; vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy; vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
  vec3 p0 = vec3(a0.xy, h.x); vec3 p1 = vec3(a0.zw, h.y); vec3 p2 = vec3(a1.xy, h.z); vec3 p3 = vec3(a1.zw, h.w);
  vec4 norm = tis(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0); m = m*m;
  return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
}
mat3 rotY(float a){ float c = cos(a), s = sin(a); return mat3(c,0.0,-s, 0.0,1.0,0.0, s,0.0,c); }
mat3 rotX(float a){ float c = cos(a), s = sin(a); return mat3(1.0,0.0,0.0, 0.0,c,s, 0.0,-s,c); }
void main(){
  vec2 p = (gl_FragCoord.xy * 2.0 - uRes) / min(uRes.x, uRes.y);
  float t = uTime * (0.22 + 0.25 * uState + 0.6 * uLevel);
  float r = length(p);
  float R = uSize * (0.9 + 0.08 * uLevel + 0.012 * sin(uTime * 1.3));
  vec2 dir = r > 0.0 ? p / r : vec2(0.0, 1.0);
  R += (0.012 + 0.05 * uLevel) * snoise(vec3(dir * 1.7, uTime * 0.9));
  float aa = 2.5 / min(uRes.x, uRes.y);
  float inside = 1.0 - smoothstep(R - aa, R + aa, r);
  vec3 col = vec3(0.0);
  if (inside > 0.0) {
    vec2 q = p / R; float zz = max(0.0, 1.0 - dot(q, q));
    vec3 n = vec3(q, sqrt(zz));
    vec3 s = rotY(t * 1.1) * rotX(0.35 + 0.2 * sin(t * 0.7)) * n;
    float f1 = snoise(s * 1.35 + vec3(0.0, 0.0, t * 0.6));
    float f2 = snoise(s * 2.6 - vec3(t * 0.45, 0.0, 0.0) + f1 * 0.6);
    float f3 = snoise(s * 5.0 + vec3(0.0, t, 0.0));
    vec3 base = mix(uA, uB, smoothstep(-0.55, 0.55, f1));
    base = mix(base, uC, smoothstep(0.05, 0.85, f2 + 0.15 * f3));
    base = mix(base, uHot, smoothstep(0.55, 1.0, f2 * 0.6 + f3 * 0.4 + uLevel * 0.55) * (0.35 + 0.65 * uLevel));
    vec3 L = normalize(vec3(-0.45, 0.6, 0.75));
    float diff = 0.62 + 0.38 * max(dot(n, L), 0.0);
    float spec = pow(max(dot(reflect(-L, n), vec3(0.0, 0.0, 1.0)), 0.0), 28.0);
    float fres = pow(1.0 - n.z, 2.2);
    col = base * diff + vec3(spec * 0.55) + fres * mix(uC, vec3(1.0), 0.55) * 0.55;
    col *= 0.94 + 0.06 * f3;
  }
  float halo = exp(-max(r - R, 0.0) * (9.0 - 4.0 * uLevel)) * (0.18 + 0.5 * uLevel) * (1.0 - inside);
  vec3 hc = mix(uB, uC, 0.5 + 0.5 * sin(uTime * 0.6));
  gl_FragColor = vec4(col * inside + hc * halo, inside + halo);
}`;
