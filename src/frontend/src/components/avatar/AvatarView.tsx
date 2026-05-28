/**
 * AvatarView — Premium Anime Girl Avatar with reactive expressions.
 * Renders a VRM model with cinematic lighting, dynamic expressions,
 * reactive particles, and emotion-driven visual effects.
 */

import { useRef, useEffect, useCallback, useState, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { VRMLoaderPlugin, VRM, VRMUtils, VRMExpressionPresetName } from '@pixiv/three-vrm';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import { useVoiceStore, useAIStore } from '@/core/store';

// ── Floating particles (hearts, stars, sparkles) ─────────────────────

interface Particle {
    x: number; y: number; size: number; speed: number;
    opacity: number; rot: number; drift: number; type: 'heart' | 'star' | 'sparkle';
}

function spawnParticle(w: number, h: number, speaking: boolean): Particle {
    const types: Particle['type'][] = speaking
        ? ['heart', 'heart', 'sparkle', 'star']
        : ['sparkle', 'star', 'sparkle'];
    return {
        x: Math.random() * w,
        y: h + 20 + Math.random() * 40,
        size: 4 + Math.random() * 10,
        speed: 0.2 + Math.random() * 0.5,
        opacity: 0.15 + Math.random() * 0.35,
        rot: Math.random() * Math.PI * 2,
        drift: (Math.random() - 0.5) * 0.3,
        type: types[Math.floor(Math.random() * types.length)],
    };
}

function drawHeart(ctx: CanvasRenderingContext2D, x: number, y: number, s: number) {
    ctx.beginPath();
    const t = s * 0.3;
    ctx.moveTo(x, y + t);
    ctx.bezierCurveTo(x, y, x - s / 2, y, x - s / 2, y + t);
    ctx.bezierCurveTo(x - s / 2, y + (s + t) / 2, x, y + (s + t) / 1.3, x, y + s);
    ctx.bezierCurveTo(x, y + (s + t) / 1.3, x + s / 2, y + (s + t) / 2, x + s / 2, y + t);
    ctx.bezierCurveTo(x + s / 2, y, x, y, x, y + t);
    ctx.closePath();
}

function drawStar(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, points: number = 4) {
    ctx.beginPath();
    for (let i = 0; i < points * 2; i++) {
        const angle = (Math.PI * i) / points - Math.PI / 2;
        const radius = i % 2 === 0 ? r : r * 0.4;
        const px = x + Math.cos(angle) * radius;
        const py = y + Math.sin(angle) * radius;
        i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    }
    ctx.closePath();
}

function ParticleOverlay({ speaking, thinking }: { speaking: boolean; thinking: boolean }) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const particlesRef = useRef<Particle[]>([]);
    const animRef = useRef(0);
    const tRef = useRef(0);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const render = () => {
            const ctx = canvas.getContext('2d');
            if (!ctx) return;
            const dpr = window.devicePixelRatio || 1;
            const w = canvas.clientWidth;
            const h = canvas.clientHeight;
            canvas.width = w * dpr;
            canvas.height = h * dpr;
            ctx.scale(dpr, dpr);
            tRef.current += 1 / 60;
            const t = tRef.current;

            ctx.clearRect(0, 0, w, h);

            const targetCount = speaking ? 16 : thinking ? 10 : 6;
            while (particlesRef.current.length < targetCount) {
                particlesRef.current.push(spawnParticle(w, h, speaking));
            }
            while (particlesRef.current.length > targetCount + 5) {
                particlesRef.current.shift();
            }

            particlesRef.current.forEach((p) => {
                p.y -= p.speed;
                p.x += Math.sin(t * 0.6 + p.rot) * 0.4 + p.drift;
                p.rot += 0.004;

                if (p.y < -30) Object.assign(p, spawnParticle(w, h, speaking));

                ctx.save();
                ctx.translate(p.x, p.y);
                ctx.rotate(Math.sin(t + p.rot) * 0.12);
                ctx.globalAlpha = p.opacity;

                if (p.type === 'heart') {
                    ctx.fillStyle = 'rgba(255, 105, 180, 1)';
                    drawHeart(ctx, 0, 0, p.size);
                    ctx.fill();
                } else if (p.type === 'star') {
                    ctx.fillStyle = thinking ? 'rgba(160, 120, 255, 1)' : 'rgba(255, 200, 220, 1)';
                    drawStar(ctx, 0, 0, p.size * 0.6);
                    ctx.fill();
                } else {
                    const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, p.size);
                    gradient.addColorStop(0, speaking ? 'rgba(255,182,193,0.8)' : 'rgba(200,180,255,0.6)');
                    gradient.addColorStop(1, 'rgba(255,255,255,0)');
                    ctx.fillStyle = gradient;
                    ctx.fillRect(-p.size, -p.size, p.size * 2, p.size * 2);
                }

                ctx.restore();
            });

            animRef.current = requestAnimationFrame(render);
        };

        animRef.current = requestAnimationFrame(render);
        return () => cancelAnimationFrame(animRef.current);
    }, [speaking, thinking]);

    return (
        <canvas
            ref={canvasRef}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 2 }}
        />
    );
}

// ── VRM Model with full expression system ────────────────────────────

type EmotionState = 'idle' | 'happy' | 'thinking' | 'speaking' | 'excited' | 'listening';

function VRMModel({ speaking, thinking, listening, onLoaded }: {
    speaking: boolean; thinking: boolean; listening: boolean; onLoaded: () => void;
}) {
    const vrmRef = useRef<VRM | null>(null);
    const { scene } = useThree();
    const blinkTimer = useRef(0);
    const nextBlink = useRef(2 + Math.random() * 3);
    const loadedRef = useRef(false);
    const emotionRef = useRef<EmotionState>('idle');
    const emotionBlend = useRef({ happy: 0, aa: 0, oh: 0 });

    useEffect(() => {
        if (speaking) emotionRef.current = 'speaking';
        else if (thinking) emotionRef.current = 'thinking';
        else if (listening) emotionRef.current = 'listening';
        else emotionRef.current = 'idle';
    }, [speaking, thinking, listening]);

    useEffect(() => {
        if (loadedRef.current) return;
        loadedRef.current = true;

        const loader = new GLTFLoader();
        loader.register((parser) => new VRMLoaderPlugin(parser));

        loader.load(
            '/models/avatar.vrm',
            (gltf) => {
                const vrm = gltf.userData.vrm as VRM;
                if (!vrm) { onLoaded(); return; }

                VRMUtils.removeUnnecessaryJoints(vrm.scene);
                VRMUtils.removeUnnecessaryVertices(vrm.scene);

                // Position model so face is centered in camera view
                // VRM model ~1.7 units tall. At y=-1.55, head at ~0.15, camera at y=0.65 sees face
                vrm.scene.position.set(0, -1.55, 0);
                vrm.scene.rotation.y = Math.PI; // face camera

                // === CRITICAL: Apply natural pose (fix T-pose) ===
                const humanoid = vrm.humanoid;
                if (humanoid) {
                    // Rotate arms down from T-pose
                    const lUpperArm = humanoid.getNormalizedBoneNode('leftUpperArm');
                    const rUpperArm = humanoid.getNormalizedBoneNode('rightUpperArm');
                    const lLowerArm = humanoid.getNormalizedBoneNode('leftLowerArm');
                    const rLowerArm = humanoid.getNormalizedBoneNode('rightLowerArm');

                    // Arms down ~70 degrees
                    if (lUpperArm) lUpperArm.rotation.z = 1.2;
                    if (rUpperArm) rUpperArm.rotation.z = -1.2;
                    // Elbows slightly bent inward
                    if (lLowerArm) lLowerArm.rotation.z = 0.08;
                    if (rLowerArm) rLowerArm.rotation.z = -0.08;

                    // Slight relaxed spine
                    const spine = humanoid.getNormalizedBoneNode('spine');
                    if (spine) spine.rotation.x = -0.02;

                    // Slight head tilt for personality
                    const head = humanoid.getNormalizedBoneNode('head');
                    if (head) head.rotation.x = 0.03;
                }

                // DO NOT override materials — let MToon shader handle everything
                // MToon materials are set up by VRMLoaderPlugin automatically

                scene.add(vrm.scene);
                vrmRef.current = vrm;
                onLoaded();
                console.log('[JARVIS Avatar] VRM loaded OK, humanoid:', !!vrm.humanoid, 'expressions:', !!vrm.expressionManager);
            },
            undefined,
            (err) => {
                console.error('[JARVIS Avatar] Load error:', err);
                onLoaded();
            }
        );

        return () => {
            if (vrmRef.current) {
                scene.remove(vrmRef.current.scene);
                vrmRef.current = null;
            }
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useFrame((state, delta) => {
        const vrm = vrmRef.current;
        if (!vrm) return;

        const t = state.clock.elapsedTime;
        const em = vrm.expressionManager;
        const humanoid = vrm.humanoid;

        // ── Breathing via spine bone ──
        if (humanoid) {
            const spine = humanoid.getNormalizedBoneNode('spine');
            if (spine) spine.rotation.x = -0.02 + Math.sin(t * 1.2) * 0.008;

            // ── Subtle head movement ──
            const head = humanoid.getNormalizedBoneNode('head');
            if (head) {
                const target = emotionRef.current;
                head.rotation.x = 0.03 + Math.sin(t * 0.4) * 0.015;
                head.rotation.y = Math.sin(t * 0.25) * 0.04;
                // Curious tilt when listening
                if (target === 'listening') {
                    head.rotation.z = Math.sin(t * 0.6) * 0.06;
                } else if (target === 'thinking') {
                    head.rotation.x = 0.06 + Math.sin(t * 0.3) * 0.01;
                    head.rotation.z = 0.04;
                } else {
                    head.rotation.z = Math.sin(t * 0.35) * 0.015;
                }
            }

            // ── Subtle arm sway ──
            const lUpperArm = humanoid.getNormalizedBoneNode('leftUpperArm');
            const rUpperArm = humanoid.getNormalizedBoneNode('rightUpperArm');
            if (lUpperArm) lUpperArm.rotation.z = 1.2 + Math.sin(t * 0.4 + 1) * 0.02;
            if (rUpperArm) rUpperArm.rotation.z = -1.2 + Math.sin(t * 0.4) * 0.02;
        }

        // ── Natural blinking ──
        blinkTimer.current += delta;
        if (blinkTimer.current > nextBlink.current) {
            const p = (blinkTimer.current - nextBlink.current) * 10;
            if (p < 1) {
                em?.setValue(VRMExpressionPresetName.Blink, Math.sin(p * Math.PI));
            } else {
                em?.setValue(VRMExpressionPresetName.Blink, 0);
                blinkTimer.current = 0;
                nextBlink.current = 1.5 + Math.random() * 4;
            }
        }

        // ── Smooth emotion blending ──
        const target = emotionRef.current;
        const blend = emotionBlend.current;
        const lerpSpeed = delta * 4;

        const targets = {
            happy: target === 'speaking' ? 0.35 : target === 'idle' ? 0.12 : target === 'listening' ? 0.2 : 0,
            aa: target === 'speaking' ? Math.abs(Math.sin(t * 7)) * 0.5 + 0.05 : 0,
            oh: target === 'thinking' ? 0.15 + Math.sin(t * 2) * 0.05 : 0,
        };

        blend.happy += (targets.happy - blend.happy) * lerpSpeed;
        blend.aa += (targets.aa - blend.aa) * lerpSpeed * 2;
        blend.oh += (targets.oh - blend.oh) * lerpSpeed;

        em?.setValue(VRMExpressionPresetName.Happy, blend.happy);
        em?.setValue(VRMExpressionPresetName.Aa, blend.aa);
        em?.setValue(VRMExpressionPresetName.Oh, blend.oh);

        vrm.update(delta);
    });

    return null;
}

// ── Lighting optimized for MToon toon shading ───────────────────────

function LightingRig({ speaking, thinking }: { speaking: boolean; thinking: boolean }) {
    const rimRef = useRef<THREE.PointLight>(null!);

    useFrame((state) => {
        const t = state.clock.elapsedTime;
        if (rimRef.current) {
            rimRef.current.intensity = speaking
                ? 0.5 + Math.sin(t * 3) * 0.15
                : thinking ? 0.35 + Math.sin(t * 1.5) * 0.1 : 0.25;
        }
    });

    return (
        <>
            {/* Key frontal light — moderate intensity to preserve MToon toon colors */}
            <directionalLight position={[0, 0.8, 3]} intensity={0.9} color="#ffffff" />
            {/* Fill from left */}
            <directionalLight position={[-1.5, 0.5, 1.5]} intensity={0.35} color="#e0d8f0" />
            {/* Hemisphere: sky/ground ambient — low intensity to avoid washout */}
            <hemisphereLight args={['#d8c8e0', '#1a0810', 0.35]} />
            {/* Rim: colored backlight for anime glow separation */}
            <pointLight ref={rimRef} position={[0, 0.6, -1.5]} intensity={0.2} color="#ff69b4" distance={5} />
            {/* Hair highlight from above */}
            <pointLight position={[0.2, 1.2, 0.8]} intensity={0.2} color="#fff0f5" distance={4} />
        </>
    );
}

// ── R3F Scene ──────────────────────────────────────────────────────

function AvatarScene({ speaking, thinking, listening, onLoaded }: {
    speaking: boolean; thinking: boolean; listening: boolean; onLoaded: () => void;
}) {
    return (
        <Canvas
            camera={{ position: [0, 0.65, 1.2], fov: 28 }}
            style={{ position: 'absolute', inset: 0, zIndex: 1 }}
            gl={{
                antialias: true,
                toneMapping: THREE.NeutralToneMapping,
                toneMappingExposure: 1.0,
                outputColorSpace: THREE.SRGBColorSpace,
            }}
        >
            <LightingRig speaking={speaking} thinking={thinking} />
            <VRMModel speaking={speaking} thinking={thinking} listening={listening} onLoaded={onLoaded} />
            <EffectComposer>
                <Bloom luminanceThreshold={0.85} luminanceSmoothing={0.3} intensity={0.2} mipmapBlur />
                <Vignette eskil={false} offset={0.15} darkness={0.7} />
            </EffectComposer>
        </Canvas>
    );
}

// ── Main Export ────────────────────────────────────────────────────────

export function AvatarView() {
    const [loaded, setLoaded] = useState(false);
    const ttsPlaying = useVoiceStore((s) => s.ttsPlaying);
    const isListening = useVoiceStore((s) => s.isListening);
    const isThinking = useAIStore((s) => s.isThinking);
    const handleLoaded = useCallback(() => setLoaded(true), []);

    useEffect(() => {
        const t = setTimeout(() => setLoaded(true), 15000);
        return () => clearTimeout(t);
    }, []);

    const bgGradient = useMemo(() => {
        if (ttsPlaying) return 'radial-gradient(ellipse at 50% 40%, #1a0812 0%, #0e0510 45%, #050208 100%)';
        if (isThinking) return 'radial-gradient(ellipse at 50% 40%, #0e0818 0%, #08051a 45%, #030208 100%)';
        return 'radial-gradient(ellipse at 50% 40%, #120a10 0%, #0a0510 45%, #050208 100%)';
    }, [ttsPlaying, isThinking]);

    return (
        <div className="fixed inset-0" style={{ zIndex: 1 }}>
            <div style={{ position: 'absolute', inset: 0, background: bgGradient, zIndex: 0, transition: 'background 1s ease' }} />

            <div style={{
                position: 'absolute', inset: 0, zIndex: 2, pointerEvents: 'none',
                background: ttsPlaying
                    ? 'radial-gradient(ellipse at 50% 45%, rgba(255,105,180,0.08) 0%, transparent 55%)'
                    : isThinking
                        ? 'radial-gradient(ellipse at 50% 45%, rgba(120,80,255,0.06) 0%, transparent 55%)'
                        : 'radial-gradient(ellipse at 50% 45%, rgba(255,105,180,0.03) 0%, transparent 55%)',
                transition: 'background 0.8s ease',
            }} />

            <ParticleOverlay speaking={ttsPlaying} thinking={isThinking} />

            {!loaded && (
                <div style={{
                    position: 'absolute', inset: 0, zIndex: 10,
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    background: '#0D0510',
                }}>
                    <div style={{
                        width: 44, height: 44,
                        border: '2px solid rgba(255,105,180,0.1)',
                        borderTop: '2px solid #FF69B4',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite',
                    }} />
                    <span style={{
                        marginTop: 14, fontFamily: '"JetBrains Mono", monospace',
                        fontSize: 10, color: '#FF69B4', letterSpacing: 4,
                    }}>
                        INITIALIZING AVATAR
                    </span>
                </div>
            )}

            <AvatarScene speaking={ttsPlaying} thinking={isThinking} listening={isListening} onLoaded={handleLoaded} />

            <div style={{
                position: 'absolute', bottom: 0, left: 0, right: 0, height: 100,
                background: 'linear-gradient(transparent, rgba(5,2,8,0.85))',
                zIndex: 3, pointerEvents: 'none',
            }} />

            <div style={{
                position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)',
                zIndex: 4, pointerEvents: 'none', textAlign: 'center',
            }}>
                {ttsPlaying && (
                    <span style={{
                        fontFamily: '"JetBrains Mono", monospace', fontSize: 9,
                        color: 'rgba(255,105,180,0.7)', letterSpacing: 3,
                        animation: 'pulse 1.5s ease infinite',
                    }}>♪ SPEAKING</span>
                )}
                {!ttsPlaying && isThinking && (
                    <span style={{
                        fontFamily: '"JetBrains Mono", monospace', fontSize: 9,
                        color: 'rgba(160,120,255,0.7)', letterSpacing: 3,
                        animation: 'pulse 2s ease infinite',
                    }}>THINKING</span>
                )}
                {!ttsPlaying && !isThinking && isListening && (
                    <span style={{
                        fontFamily: '"JetBrains Mono", monospace', fontSize: 9,
                        color: 'rgba(100,200,255,0.6)', letterSpacing: 3,
                        animation: 'pulse 1.8s ease infinite',
                    }}>LISTENING</span>
                )}
            </div>

            {ttsPlaying && (
                <div style={{
                    position: 'absolute', top: '45%', left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: 280, height: 280, borderRadius: '50%',
                    border: '1px solid rgba(255,105,180,0.1)',
                    boxShadow: '0 0 40px rgba(255,105,180,0.06), inset 0 0 40px rgba(255,105,180,0.03)',
                    animation: 'pulse 2s ease infinite',
                    zIndex: 3, pointerEvents: 'none',
                }} />
            )}

            <style>{`
                @keyframes spin { to { transform: rotate(360deg); } }
                @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
            `}</style>
        </div>
    );
}
