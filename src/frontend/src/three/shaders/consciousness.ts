/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  CONSCIOUSNESS SHADERS — Neural Core + Energy Field + Holographic Shell
 *
 *  Custom GLSL shaders for the JARVIS AI consciousness visualization.
 *  These create an organic, living AI entity that reacts to speech,
 *  emotions, thinking states, and audio levels.
 * ═══════════════════════════════════════════════════════════════════════════
 */

// ─── Simplex Noise (3D) ─────────────────────────────────────────────────
const NOISE_GLSL = /* glsl */ `
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x * 34.0) + 10.0) * x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

float snoise(vec3 v) {
    const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
    vec3 i = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);
    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;
    i = mod289(i);
    vec4 p = permute(permute(permute(
        i.z + vec4(0.0, i1.z, i2.z, 1.0))
        + i.y + vec4(0.0, i1.y, i2.y, 1.0))
        + i.x + vec4(0.0, i1.x, i2.x, 1.0));
    float n_ = 0.142857142857;
    vec3 ns = n_ * D.wyz - D.xzx;
    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);
    vec4 x = x_ * ns.x + ns.yyyy;
    vec4 y = y_ * ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);
    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);
    vec4 s0 = floor(b0) * 2.0 + 1.0;
    vec4 s1 = floor(b1) * 2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));
    vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);
    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
    p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
    vec4 m = max(0.5 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 105.0 * dot(m * m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
}

float fbm(vec3 p, int octaves) {
    float val = 0.0;
    float amp = 0.5;
    float freq = 1.0;
    for (int i = 0; i < 6; i++) {
        if (i >= octaves) break;
        val += amp * snoise(p * freq);
        freq *= 2.0;
        amp *= 0.5;
    }
    return val;
}
`;

// ═══════════════════════════════════════════════════════════════════════
//  NEURAL CORE — The main consciousness sphere
// ═══════════════════════════════════════════════════════════════════════

export const neuralCoreVertex = /* glsl */ `
${NOISE_GLSL}

uniform float uTime;
uniform float uIntensity;
uniform float uMicLevel;
uniform float uSpeaking;
uniform float uThinking;

varying vec3 vNormal;
varying vec3 vWorldPos;
varying vec2 vUv;
varying float vDisplacement;
varying float vFresnel;

void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);

    // Multi-layered organic displacement
    float baseNoise = fbm(position * 2.5 + uTime * 0.15, 4);
    float detailNoise = snoise(position * 8.0 + uTime * 0.4) * 0.3;

    // Speaking pulses — rhythmic, voice-reactive
    float speakPulse = sin(uTime * 12.0 + length(position.xz) * 4.0) * uSpeaking * 0.08;
    speakPulse += sin(uTime * 18.0 + position.y * 6.0) * uSpeaking * 0.04;

    // Thinking waves — slower, more mysterious
    float thinkWave = sin(uTime * 2.5 + position.y * 3.0) * uThinking * 0.06;

    // Mic level response
    float micPulse = uMicLevel * sin(uTime * 15.0) * 0.05;

    float displacement = (baseNoise + detailNoise) * 0.12 * uIntensity
                        + speakPulse + thinkWave + micPulse;
    vDisplacement = displacement;

    vec3 displaced = position + normal * displacement;

    vec4 worldPos = modelMatrix * vec4(displaced, 1.0);
    vWorldPos = worldPos.xyz;

    // Fresnel
    vec3 worldNormal = normalize(mat3(modelMatrix) * normal);
    vec3 viewDir = normalize(cameraPosition - worldPos.xyz);
    vFresnel = pow(1.0 - max(dot(viewDir, worldNormal), 0.0), 2.5);

    gl_Position = projectionMatrix * viewMatrix * worldPos;
}
`;

export const neuralCoreFragment = /* glsl */ `
${NOISE_GLSL}

uniform float uTime;
uniform float uIntensity;
uniform float uSpeaking;
uniform float uThinking;
uniform vec3 uBaseColor;
uniform vec3 uEnergyColor;
uniform vec3 uThinkColor;

varying vec3 vNormal;
varying vec3 vWorldPos;
varying vec2 vUv;
varying float vDisplacement;
varying float vFresnel;

void main() {
    // Dynamic neural pattern
    float pattern = fbm(vWorldPos * 4.0 + uTime * 0.2, 5);
    float energy = snoise(vWorldPos * 12.0 + uTime * 0.8) * 0.5 + 0.5;

    // Neural network-like veins
    float veins = abs(snoise(vWorldPos * 6.0 + uTime * 0.3));
    veins = pow(veins, 3.0) * 4.0;

    // Pulsing energy waves from center
    float dist = length(vWorldPos);
    float pulse = sin(dist * 8.0 - uTime * 3.0) * 0.5 + 0.5;
    pulse *= pulse;

    // Color mixing — base → energy → think
    vec3 color = uBaseColor;
    color = mix(color, uEnergyColor, energy * 0.4 + pulse * 0.3);
    color = mix(color, uThinkColor, uThinking * (pattern * 0.5 + 0.3));

    // Speaking highlight
    float speakGlow = sin(uTime * 10.0 + dist * 6.0) * uSpeaking;
    color += uEnergyColor * speakGlow * 0.3;

    // Neural veins overlay
    color += vec3(0.3, 0.8, 1.0) * veins * 0.15 * uIntensity;

    // Fresnel edge glow — ethereal rim
    vec3 fresnelColor = mix(uEnergyColor, vec3(1.0), 0.3);
    color += fresnelColor * vFresnel * 0.6;

    // Inner glow
    float innerGlow = 1.0 - smoothstep(0.0, 0.8, dist);
    color += uEnergyColor * innerGlow * 0.2;

    // Alpha: solid core with ethereal edges
    float alpha = 0.7 + vFresnel * 0.3 + pulse * 0.1 * uIntensity;
    alpha = clamp(alpha, 0.0, 1.0);

    gl_FragColor = vec4(color * uIntensity, alpha);
}
`;

// ═══════════════════════════════════════════════════════════════════════
//  ENERGY SHELL — Outer holographic casing
// ═══════════════════════════════════════════════════════════════════════

export const energyShellVertex = /* glsl */ `
${NOISE_GLSL}

uniform float uTime;
uniform float uIntensity;
uniform float uSpeaking;

varying vec3 vNormal;
varying vec3 vWorldPos;
varying vec2 vUv;
varying float vFresnel;

void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);

    // Subtle breathing distortion
    float breath = sin(uTime * 1.5) * 0.005 + snoise(position * 3.0 + uTime * 0.2) * 0.01;
    float speakPulse = sin(uTime * 8.0 + position.y * 4.0) * uSpeaking * 0.015;
    vec3 displaced = position + normal * (breath + speakPulse);

    vec4 worldPos = modelMatrix * vec4(displaced, 1.0);
    vWorldPos = worldPos.xyz;

    vec3 worldNormal = normalize(mat3(modelMatrix) * normal);
    vec3 viewDir = normalize(cameraPosition - worldPos.xyz);
    vFresnel = pow(1.0 - max(dot(viewDir, worldNormal), 0.0), 3.0);

    gl_Position = projectionMatrix * viewMatrix * worldPos;
}
`;

export const energyShellFragment = /* glsl */ `
${NOISE_GLSL}

uniform float uTime;
uniform float uIntensity;
uniform float uSpeaking;
uniform vec3 uColor;

varying vec3 vNormal;
varying vec3 vWorldPos;
varying vec2 vUv;
varying float vFresnel;

void main() {
    // Hexagonal grid pattern
    vec2 grid = vUv * 30.0;
    float hex = abs(sin(grid.x * 3.14159) * sin(grid.y * 3.14159));
    hex = step(0.92, hex);

    // Scan lines
    float scanLine = sin(vWorldPos.y * 40.0 + uTime * 2.0) * 0.5 + 0.5;
    scanLine = smoothstep(0.4, 0.6, scanLine) * 0.3;

    // Data flow streaks
    float dataFlow = snoise(vec3(vUv * 15.0, uTime * 0.5));
    dataFlow = smoothstep(0.6, 0.8, abs(dataFlow)) * 0.4;

    // Edge glow
    vec3 color = uColor * (vFresnel * 0.8 + hex * 0.3 + scanLine + dataFlow * 0.2);

    // Speaking pulse
    color += uColor * 0.3 * uSpeaking * sin(uTime * 6.0 + vWorldPos.y * 3.0);

    float alpha = vFresnel * 0.4 + hex * 0.15 + scanLine * 0.1 + dataFlow * 0.1;
    alpha *= uIntensity;
    alpha = clamp(alpha, 0.0, 0.6);

    gl_FragColor = vec4(color, alpha);
}
`;

// ═══════════════════════════════════════════════════════════════════════
//  NEURAL TENDRILS — Energy lines flowing from core
// ═══════════════════════════════════════════════════════════════════════

export const tendrilVertex = /* glsl */ `
uniform float uTime;
uniform float uIntensity;

attribute float aOffset;
attribute float aSpeed;

varying float vAlpha;
varying float vProgress;

void main() {
    float progress = fract(uTime * aSpeed * 0.3 + aOffset);
    vProgress = progress;
    vAlpha = sin(progress * 3.14159) * uIntensity;

    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    gl_PointSize = (3.0 + sin(progress * 6.28) * 2.0) * (300.0 / -mvPosition.z);
}
`;

export const tendrilFragment = /* glsl */ `
uniform vec3 uColor;
varying float vAlpha;
varying float vProgress;

void main() {
    float d = length(gl_PointCoord - vec2(0.5));
    if (d > 0.5) discard;
    float glow = 1.0 - smoothstep(0.0, 0.5, d);
    glow *= glow;
    vec3 color = uColor * (1.0 + vProgress * 0.5);
    gl_FragColor = vec4(color, glow * vAlpha * 0.8);
}
`;

// ═══════════════════════════════════════════════════════════════════════
//  NEURAL PARTICLES — Orbiting consciousness particles
// ═══════════════════════════════════════════════════════════════════════

export const neuralParticleVertex = /* glsl */ `
${NOISE_GLSL}

uniform float uTime;
uniform float uIntensity;
uniform float uSpeaking;
uniform float uThinking;
uniform float uMicLevel;

attribute float aSize;
attribute float aPhase;
attribute float aOrbitRadius;
attribute float aOrbitSpeed;
attribute float aOrbitTilt;
attribute vec3 aColor;

varying vec3 vColor;
varying float vAlpha;

void main() {
    float t = uTime * aOrbitSpeed + aPhase;

    // Orbital position
    float cr = cos(aOrbitTilt);
    float sr = sin(aOrbitTilt);
    vec3 orbitPos = vec3(
        cos(t) * aOrbitRadius,
        sin(t) * aOrbitRadius * sr,
        sin(t) * aOrbitRadius * cr
    );

    // Noise perturbation — particles aren't perfectly orbital
    float noiseScale = 0.3 + uThinking * 0.4;
    orbitPos += vec3(
        snoise(orbitPos * 0.5 + uTime * 0.1) * noiseScale,
        snoise(orbitPos * 0.5 + uTime * 0.1 + 100.0) * noiseScale,
        snoise(orbitPos * 0.5 + uTime * 0.1 + 200.0) * noiseScale
    );

    // Speaking: particles pulse outward
    float speakPulse = uSpeaking * sin(uTime * 8.0 + aPhase * 6.28) * 0.3;
    orbitPos *= 1.0 + speakPulse;

    // Mic level — particles vibrate
    orbitPos += normalize(orbitPos) * uMicLevel * sin(uTime * 20.0 + aPhase * 10.0) * 0.15;

    vColor = aColor;
    vAlpha = 0.4 + uIntensity * 0.4 + uSpeaking * 0.2;

    vec4 mvPosition = modelViewMatrix * vec4(orbitPos, 1.0);
    gl_Position = projectionMatrix * mvPosition;

    float sizeScale = aSize * (1.0 + uSpeaking * 0.5 + uThinking * 0.3);
    gl_PointSize = sizeScale * (250.0 / -mvPosition.z);
}
`;

export const neuralParticleFragment = /* glsl */ `
varying vec3 vColor;
varying float vAlpha;

void main() {
    float d = length(gl_PointCoord - vec2(0.5));
    if (d > 0.5) discard;

    float glow = 1.0 - smoothstep(0.0, 0.5, d);
    glow = pow(glow, 1.5);

    // Soft radial gradient
    vec3 color = vColor * (1.0 + glow * 0.5);
    float alpha = glow * vAlpha;

    gl_FragColor = vec4(color, alpha);
}
`;

// ═══════════════════════════════════════════════════════════════════════
//  ENERGY RING — Orbital scanning rings
// ═══════════════════════════════════════════════════════════════════════

export const energyRingVertex = /* glsl */ `
uniform float uTime;
uniform float uSpeed;

varying vec2 vUv;
varying float vAngle;

void main() {
    vUv = uv;
    // Calculate angle around the ring for animated dash pattern
    vAngle = atan(position.x, position.z);

    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const energyRingFragment = /* glsl */ `
uniform float uTime;
uniform float uSpeed;
uniform float uIntensity;
uniform vec3 uColor;
uniform float uDashCount;

varying vec2 vUv;
varying float vAngle;

void main() {
    // Animated dashed ring
    float angle = vAngle + uTime * uSpeed;
    float dash = sin(angle * uDashCount) * 0.5 + 0.5;
    dash = smoothstep(0.3, 0.7, dash);

    // Flowing energy pulse
    float flow = sin(angle * 2.0 - uTime * uSpeed * 3.0) * 0.5 + 0.5;

    float alpha = dash * 0.4 * uIntensity + flow * 0.2 * uIntensity;

    vec3 color = uColor * (1.0 + flow * 0.5);

    gl_FragColor = vec4(color, alpha);
}
`;
