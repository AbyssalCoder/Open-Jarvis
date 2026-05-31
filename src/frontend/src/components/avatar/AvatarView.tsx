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

// ── Cute Anime Waifu Colorizer ───────────────────────────────────────

function colorizeVRM(vrm: VRM) {
    // ── Palette: cute anime waifu ──
    const SKIN      = new THREE.Color('#FFE4D6');
    const SKIN_SH   = new THREE.Color('#E8C0AA');
    const HAIR      = new THREE.Color('#2D1654');
    const HAIR_SH   = new THREE.Color('#1A0B35');
    const IRIS      = new THREE.Color('#9B7ED8');
    const IRIS_GLOW = new THREE.Color('#6A4CBB');
    const EYE_W     = new THREE.Color('#FFFFFF');
    const BROW      = new THREE.Color('#2A1540');
    const LASH      = new THREE.Color('#1A0A2E');
    const MOUTH     = new THREE.Color('#FF9999');
    const TONGUE    = new THREE.Color('#E87878');
    const TEETH     = new THREE.Color('#FEFEFE');
    const CLOTH     = new THREE.Color('#B8A0D2');
    const CLOTH_SH  = new THREE.Color('#8A72A8');
    const OUTLINE   = new THREE.Color('#1A0A20');

    /**
     * Apply color to MToon ShaderMaterial.
     * MToon uses uniforms (litFactor, shadeColorFactor, emissive, etc.)
     * and also has getter/setter properties. We set BOTH to be safe,
     * and remove any map textures so our flat colors show through.
     */
    const applyColor = (mat: any, color: THREE.Color, shade?: THREE.Color, opts?: {
        emissive?: THREE.Color; emissiveI?: number; outlineW?: number;
        transparent?: boolean; keepMap?: boolean;
    }) => {
        // ── Main color (litFactor uniform) ──
        if (mat.uniforms?.litFactor?.value) {
            mat.uniforms.litFactor.value.set(color.r, color.g, color.b);
        }
        // Also set via property setter for compatibility
        try { mat.color = color.clone(); } catch { /* ignore */ }

        // ── Remove texture maps so flat color shows (unless keepMap) ──
        if (!opts?.keepMap) {
            if (mat.uniforms?.map) mat.uniforms.map.value = null;
            try { mat.map = null; } catch { /* ignore */ }
            // Also remove shade multiply texture
            if (mat.uniforms?.shadeMultiplyTexture) mat.uniforms.shadeMultiplyTexture.value = null;
            try { mat.shadeMultiplyTexture = null; } catch { /* ignore */ }
        }

        // ── Shade color ──
        if (shade) {
            if (mat.uniforms?.shadeColorFactor?.value) {
                mat.uniforms.shadeColorFactor.value.set(shade.r, shade.g, shade.b);
            }
            try { mat.shadeColorFactor = shade.clone(); } catch { /* ignore */ }
        }

        // ── Emissive ──
        if (opts?.emissive) {
            if (mat.uniforms?.emissive?.value) {
                mat.uniforms.emissive.value.set(opts.emissive.r, opts.emissive.g, opts.emissive.b);
            }
            if (mat.uniforms?.emissiveIntensity) {
                mat.uniforms.emissiveIntensity.value = opts.emissiveI ?? 0.3;
            }
            try { mat.emissive = opts.emissive.clone(); } catch { /* ignore */ }
            try { mat.emissiveIntensity = opts.emissiveI ?? 0.3; } catch { /* ignore */ }
            // Remove emissive map
            if (mat.uniforms?.emissiveMap) mat.uniforms.emissiveMap.value = null;
            try { mat.emissiveMap = null; } catch { /* ignore */ }
        }

        // ── Outline ──
        if (mat.outlineWidthMode !== undefined) {
            mat.outlineWidthMode = 1;
            if (mat.uniforms?.outlineWidthFactor) {
                mat.uniforms.outlineWidthFactor.value = opts?.outlineW ?? 0.001;
            }
            try { mat.outlineWidthFactor = opts?.outlineW ?? 0.001; } catch { /* ignore */ }
            if (mat.uniforms?.outlineColorFactor?.value) {
                mat.uniforms.outlineColorFactor.value.set(OUTLINE.r, OUTLINE.g, OUTLINE.b);
            }
            try { mat.outlineColorFactor = OUTLINE.clone(); } catch { /* ignore */ }
        }

        // ── Outline variant materials (named "... (Outline)") ──
        if (mat.name && mat.name.includes('Outline')) {
            if (mat.uniforms?.litFactor?.value) {
                mat.uniforms.litFactor.value.set(OUTLINE.r, OUTLINE.g, OUTLINE.b);
            }
            try { mat.color = OUTLINE.clone(); } catch { /* ignore */ }
        }

        // ── Transparency ──
        if (opts?.transparent) {
            mat.transparent = true;
            if (mat.uniforms?.opacity) mat.uniforms.opacity.value = 0.95;
            try { mat.opacity = 0.95; } catch { /* ignore */ }
        }

        // ── Toony shading for anime look ──
        if (mat.uniforms?.shadingToonyFactor) {
            mat.uniforms.shadingToonyFactor.value = 0.9;
        }
        try { mat.shadingToonyFactor = 0.9; } catch { /* ignore */ }

        mat.needsUpdate = true;
    };

    vrm.scene.traverse((obj) => {
        if (!(obj as THREE.Mesh).isMesh) return;
        const mesh = obj as THREE.Mesh;
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        const mn = (mesh.name || '').toLowerCase();

        mats.forEach((mat: any) => {
            const matN = (mat.name || '').toLowerCase();
            const n = mn + ' ' + matN;

            // ── Eyes ──
            if (/eyeiris|eye_iris|eye.*iris|iris/i.test(n)) {
                applyColor(mat, IRIS, undefined, { emissive: IRIS_GLOW, emissiveI: 0.8, outlineW: 0 });
            } else if (/eyewhite|eye_white|eye.*white|sclera/i.test(n)) {
                applyColor(mat, EYE_W, undefined, { outlineW: 0 });
            } else if (/eyehighlight|eye_highlight|eye.*highlight|eyestar/i.test(n)) {
                applyColor(mat, new THREE.Color('#FFFFFF'), undefined, { emissive: new THREE.Color('#FFFFFF'), emissiveI: 1.2, outlineW: 0, transparent: true });
            } else if (/eyeline|eye_line|eyelash|eye_lash/i.test(n)) {
                applyColor(mat, LASH, undefined, { outlineW: 0.001 });
            } else if (/eyeextra|eye_extra/i.test(n)) {
                applyColor(mat, new THREE.Color('#2D1654'), undefined, { outlineW: 0 });
            } else if (/eyebrow|brow/i.test(n)) {
                applyColor(mat, BROW, undefined, { outlineW: 0.0008 });

            // ── Mouth ──
            } else if (/tongue/i.test(n)) {
                applyColor(mat, TONGUE);
            } else if (/teeth|tooth/i.test(n)) {
                applyColor(mat, TEETH);
            } else if (/mouth|lip|facemouth|face_mouth/i.test(n)) {
                applyColor(mat, MOUTH, new THREE.Color('#D07070'));

            // ── Hair ──
            } else if (/hair/i.test(n)) {
                applyColor(mat, HAIR, HAIR_SH, { outlineW: 0.0015 });

            // ── Clothing (check BEFORE skin, since cloth mesh names may contain "body") ──
            } else if (/cloth|tops|bottoms|shoes|shirt|hoodie|jacket|pant|skirt|dress|sock|wear|costume/i.test(n)) {
                applyColor(mat, CLOTH, CLOTH_SH, { outlineW: 0.0012 });

            // ── Face & Skin ──
            } else if (/face|cheek|nose|ear|forehead|chin/i.test(n) && !/cloth/i.test(n)) {
                applyColor(mat, SKIN, SKIN_SH, { outlineW: 0.0008 });
            } else if (/skin|body|neck|arm|hand|leg|foot|finger|head_skin|n_body/i.test(n)) {
                applyColor(mat, SKIN, SKIN_SH, { outlineW: 0.001 });

            // ── Fallback: default to skin ──
            } else {
                applyColor(mat, SKIN, SKIN_SH, { outlineW: 0.0008 });
            }

            console.log(`[VRM Color] ${mesh.name} → ${mat.name} → uniform litFactor: ${mat.uniforms?.litFactor?.value ? '#' + mat.uniforms.litFactor.value.getHexString() : 'N/A'}, type: ${mat.type}`);
        });
    });
    console.log('[VRM Colorize] Done — all meshes colorized');
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
    const gesturePhase = useRef(0);

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

                vrm.scene.position.set(0, -0.5, 0);
                vrm.scene.rotation.y = Math.PI;

                // === Natural pose (fix T-pose) ===
                const humanoid = vrm.humanoid;
                if (humanoid) {
                    const lUpperArm = humanoid.getNormalizedBoneNode('leftUpperArm');
                    const rUpperArm = humanoid.getNormalizedBoneNode('rightUpperArm');
                    const lLowerArm = humanoid.getNormalizedBoneNode('leftLowerArm');
                    const rLowerArm = humanoid.getNormalizedBoneNode('rightLowerArm');

                    if (lUpperArm) lUpperArm.rotation.z = 1.2;
                    if (rUpperArm) rUpperArm.rotation.z = -1.2;
                    if (lLowerArm) lLowerArm.rotation.z = 0.08;
                    if (rLowerArm) rLowerArm.rotation.z = -0.08;

                    const spine = humanoid.getNormalizedBoneNode('spine');
                    if (spine) spine.rotation.x = -0.02;

                    const head = humanoid.getNormalizedBoneNode('head');
                    if (head) head.rotation.x = 0.03;
                }

                // ═══ COLORIZE: Apply anime waifu skin/hair/eye colors ═══
                colorizeVRM(vrm);

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
        const isSpeaking = emotionRef.current === 'speaking';
        const isThinking = emotionRef.current === 'thinking';

        // ── Breathing via spine bone ──
        if (humanoid) {
            const spine = humanoid.getNormalizedBoneNode('spine');
            if (spine) spine.rotation.x = -0.02 + Math.sin(t * 1.2) * 0.008;

            // ── Subtle head movement ──
            const head = humanoid.getNormalizedBoneNode('head');
            if (head) {
                head.rotation.x = 0.03 + Math.sin(t * 0.4) * 0.015;
                head.rotation.y = Math.sin(t * 0.25) * 0.04;
                if (emotionRef.current === 'listening') {
                    head.rotation.z = Math.sin(t * 0.6) * 0.06;
                } else if (isThinking) {
                    head.rotation.x = 0.06 + Math.sin(t * 0.3) * 0.01;
                    head.rotation.z = 0.04;
                } else if (isSpeaking) {
                    // More animated head nods while speaking
                    head.rotation.x = 0.03 + Math.sin(t * 1.5) * 0.025;
                    head.rotation.y = Math.sin(t * 0.8) * 0.06;
                } else {
                    head.rotation.z = Math.sin(t * 0.35) * 0.015;
                }
            }

            // ── Arm & hand gestures ──
            const lUpperArm = humanoid.getNormalizedBoneNode('leftUpperArm');
            const rUpperArm = humanoid.getNormalizedBoneNode('rightUpperArm');
            const lLowerArm = humanoid.getNormalizedBoneNode('leftLowerArm');
            const rLowerArm = humanoid.getNormalizedBoneNode('rightLowerArm');

            if (isSpeaking) {
                // Expressive hand gestures while talking
                gesturePhase.current += delta * 2.5;
                const gp = gesturePhase.current;

                // Upper arms wave gently — more range than idle
                if (lUpperArm) {
                    lUpperArm.rotation.z = 1.0 + Math.sin(gp * 0.7) * 0.15 + Math.sin(gp * 1.3) * 0.08;
                    lUpperArm.rotation.x = Math.sin(gp * 0.5 + 1.0) * 0.1;
                }
                if (rUpperArm) {
                    rUpperArm.rotation.z = -1.0 + Math.sin(gp * 0.9 + 0.5) * 0.15 + Math.sin(gp * 1.1) * 0.08;
                    rUpperArm.rotation.x = Math.sin(gp * 0.6) * 0.1;
                }
                // Lower arms add emphasis gestures
                if (lLowerArm) {
                    lLowerArm.rotation.z = 0.08 + Math.sin(gp * 1.2) * 0.12;
                    lLowerArm.rotation.x = -0.1 + Math.sin(gp * 0.8 + 2) * 0.08;
                }
                if (rLowerArm) {
                    rLowerArm.rotation.z = -0.08 + Math.sin(gp * 1.0 + 1) * 0.12;
                    rLowerArm.rotation.x = -0.1 + Math.sin(gp * 0.9 + 1.5) * 0.08;
                }
            } else {
                // Idle: subtle arm sway, smoothly return from gesture pose
                gesturePhase.current *= 0.95; // dampen
                if (lUpperArm) lUpperArm.rotation.z = 1.2 + Math.sin(t * 0.4 + 1) * 0.02;
                if (rUpperArm) rUpperArm.rotation.z = -1.2 + Math.sin(t * 0.4) * 0.02;
                if (lLowerArm) {
                    lLowerArm.rotation.z = 0.08;
                    lLowerArm.rotation.x = 0;
                }
                if (rLowerArm) {
                    rLowerArm.rotation.z = -0.08;
                    rLowerArm.rotation.x = 0;
                }
            }
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
        const blend = emotionBlend.current;
        const lerpSpeed = delta * 4;

        // Speaking mouth: alternate between Aa, Ih, Oh, Ou for natural lip sync
        let aaTarget = 0, ohTarget = 0, ihTarget = 0, ouTarget = 0;
        if (isSpeaking) {
            // Multi-shape mouth animation for realistic speaking
            const mouthCycle = t * 8; // fast mouth movement
            const shape = Math.floor(mouthCycle % 4);
            const blend01 = (Math.sin(mouthCycle * Math.PI) * 0.5 + 0.5);
            switch (shape) {
                case 0: aaTarget = 0.5 + blend01 * 0.3; break;  // "ah"
                case 1: ihTarget = 0.4 + blend01 * 0.2; break;  // "ih" (smile shape)
                case 2: ohTarget = 0.35 + blend01 * 0.25; break; // "oh"
                case 3: ouTarget = 0.3 + blend01 * 0.2; break;  // "oo"
            }
        }

        const targets = {
            happy: isSpeaking ? 0.25 : emotionRef.current === 'idle' ? 0.12 : emotionRef.current === 'listening' ? 0.2 : 0,
            aa: aaTarget,
            oh: isThinking ? 0.15 + Math.sin(t * 2) * 0.05 : ohTarget,
        };

        blend.happy += (targets.happy - blend.happy) * lerpSpeed;
        blend.aa += (targets.aa - blend.aa) * lerpSpeed * 3;
        blend.oh += (targets.oh - blend.oh) * lerpSpeed * 3;

        em?.setValue(VRMExpressionPresetName.Happy, blend.happy);
        em?.setValue(VRMExpressionPresetName.Aa, blend.aa);
        em?.setValue(VRMExpressionPresetName.Oh, blend.oh);
        // Also try Ih and Ou if available
        try { em?.setValue('ih' as any, ihTarget > 0.01 ? ihTarget : 0); } catch { /* not available */ }
        try { em?.setValue('ou' as any, ouTarget > 0.01 ? ouTarget : 0); } catch { /* not available */ }

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
                ? 0.4 + Math.sin(t * 3) * 0.1
                : thinking ? 0.3 + Math.sin(t * 1.5) * 0.08 : 0.2;
        }
    });

    return (
        <>
            {/* Key light — warm front-right for face definition */}
            <directionalLight position={[0.5, 1.8, 2.5]} intensity={1.2} color="#fff5f0" />
            {/* Fill from left — lavender tint for anime depth */}
            <directionalLight position={[-1.2, 1.0, 1.0]} intensity={0.5} color="#e8e0f5" />
            {/* Front fill — ensures face details (eyes, nose, lips) are visible */}
            <directionalLight position={[0, 1.2, 3.0]} intensity={0.6} color="#fff0f0" />
            {/* Hemisphere: warm sky / cool ground ambient for anime feel */}
            <hemisphereLight args={['#f0e0f5', '#1a0810', 0.45]} />
            {/* Ambient to bring out material colors */}
            <ambientLight intensity={0.2} color="#f0e0f0" />
            {/* Rim: colored backlight for anime glow separation */}
            <pointLight ref={rimRef} position={[0, 1.4, -1.5]} intensity={0.3} color="#ff69b4" distance={5} />
            {/* Hair highlight — above and slightly behind */}
            <pointLight position={[0.3, 2.0, 0.3]} intensity={0.25} color="#e8d0ff" distance={4} />
        </>
    );
}

// ── Camera Rig (locks onto avatar face) ───────────────────────────

function CameraRig() {
    const { camera } = useThree();
    const initialized = useRef(false);

    useFrame(() => {
        if (initialized.current) return;
        // Portrait framing: head + upper chest visible
        // Model at y=-0.5, head top ~y=1.0, chin ~y=0.7
        // Camera slightly below eye level looking slightly up = cute angle
        camera.position.set(0, 0.75, 2.2);
        camera.lookAt(0, 0.65, 0);
        initialized.current = true;
    });

    return null;
}

// ── R3F Scene ──────────────────────────────────────────────────────

function AvatarScene({ speaking, thinking, listening, onLoaded }: {
    speaking: boolean; thinking: boolean; listening: boolean; onLoaded: () => void;
}) {
    return (
        <Canvas
            camera={{ position: [0, 0.75, 2.2], fov: 28 }}
            style={{ position: 'absolute', inset: 0, zIndex: 1 }}
            gl={{
                antialias: true,
                toneMapping: THREE.ACESFilmicToneMapping,
                toneMappingExposure: 1.1,
                outputColorSpace: THREE.SRGBColorSpace,
            }}
        >
            {/* Camera controller that locks onto avatar head */}
            <CameraRig />
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
