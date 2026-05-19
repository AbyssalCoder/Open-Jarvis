import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useAIStore, useVoiceStore } from '@/core/store';

/*
 * ═══════════════════════════════════════════════════════════════════
 *  ARC REACTOR ENGINE — Horizontal Turbine with Dense Mechanical Detail
 *
 *  Replicates the Sketchfab "Ironman : Arc Reactor" structure:
 *  - Central glowing core sphere
 *  - Multiple thick cylindrical drum sections stacked along Z
 *  - Solid disc rings with radial slot teeth
 *  - Nested concentric cylinders of varying diameters
 *  - Bright horizontal energy beam through the center
 *  - Amber energy orb connected by beam
 *  - Outer orbit rings at various tilts
 *  - Dense mechanical details (ribs, slots, connectors)
 * ═══════════════════════════════════════════════════════════════════
 */

export function AICore() {
    const groupRef = useRef<THREE.Group>(null!);
    const coreRef = useRef<THREE.Mesh>(null!);
    const isThinking = useAIStore((s) => s.isThinking);
    const ttsPlaying = useVoiceStore((s) => s.ttsPlaying);
    const spkSmooth = useRef(0);
    const actSmooth = useRef(0.2);

    useFrame((state) => {
        const t = state.clock.elapsedTime;

        // Smooth ramps
        const spkTarget = ttsPlaying ? 1 : 0;
        spkSmooth.current += (spkTarget - spkSmooth.current) * 0.1;
        const actTarget = isThinking ? 1 : 0.2;
        actSmooth.current += (actTarget - actSmooth.current) * 0.05;

        // Whole engine slow rotation
        if (groupRef.current) {
            groupRef.current.rotation.y = t * 0.03;
        }

        // Core vibration when speaking
        if (coreRef.current) {
            const spk = spkSmooth.current;
            const s = 1 +
                Math.sin(t * 22) * 0.06 * spk +
                Math.sin(t * 35 + 1.3) * 0.04 * spk +
                Math.sin(t * 48 + 2.7) * 0.025 * spk +
                Math.sin(t * 4) * 0.015 * actSmooth.current +
                (Math.random() - 0.5) * 0.04 * spk;
            coreRef.current.scale.setScalar(s);
            coreRef.current.position.x = (Math.random() - 0.5) * 0.03 * spk;
            coreRef.current.position.y = (Math.random() - 0.5) * 0.03 * spk;
        }
    });

    return (
        <group ref={groupRef} rotation={[0, 0, Math.PI / 2]}>
            {/* ════════ GLOWING CORE SPHERE (small, not overwhelming) ════════ */}
            <mesh ref={coreRef}>
                <sphereGeometry args={[0.1, 32, 32]} />
                <meshBasicMaterial color="#00DDFF" transparent opacity={0.85}
                    blending={THREE.AdditiveBlending} />
            </mesh>
            {/* Core glow halo — small and subtle so discs show through */}
            <CoreGlow radius={0.16} opacity={0.3} color="#00CCEE" />
            <CoreGlow radius={0.22} opacity={0.12} color="#0066AA" />

            {/* ════════ HORIZONTAL ENERGY BEAM ════════ */}
            <EnergyBeam />

            {/* ════════ INNER ENGINE DRUMS (solid cylinders) ════════ */}
            {/* These are the nested cylindrical sections visible in the reference */}
            <EngineDrum radius={0.25} height={1.4} speed={0.6} color="#00BBDD" opacity={0.15} segments={24} />
            <EngineDrum radius={0.35} height={1.1} speed={-0.45} color="#009ABB" opacity={0.12} segments={32} />
            <EngineDrum radius={0.5} height={1.6} speed={0.3} color="#007899" opacity={0.1} segments={36} />
            <EngineDrum radius={0.65} height={1.2} speed={-0.25} color="#005577" opacity={0.08} segments={40} />

            {/* ════════ THICK DISC SECTIONS — spaced out along beam ════════ */}
            {/* Front stack */}
            <ThickDisc z={-0.95} innerR={0.2} outerR={0.9} thickness={0.06} teeth={16} speed={0.4} color="#00EEFF" idx={0} />
            <ThickDisc z={-0.75} innerR={0.3} outerR={0.75} thickness={0.05} teeth={12} speed={-0.55} color="#00CCDD" idx={1} />
            <ThickDisc z={-0.55} innerR={0.15} outerR={1.0} thickness={0.07} teeth={20} speed={0.3} color="#00EEFF" idx={2} />
            <ThickDisc z={-0.35} innerR={0.25} outerR={0.85} thickness={0.04} teeth={14} speed={-0.45} color="#00BBCC" idx={3} />

            {/* Center discs */}
            <ThickDisc z={-0.12} innerR={0.2} outerR={1.1} thickness={0.08} teeth={24} speed={0.2} color="#00FFFF" idx={4} />
            <ThickDisc z={0.12} innerR={0.2} outerR={1.1} thickness={0.08} teeth={24} speed={-0.2} color="#00FFFF" idx={5} />

            {/* Rear stack */}
            <ThickDisc z={0.35} innerR={0.25} outerR={0.85} thickness={0.04} teeth={14} speed={0.45} color="#00BBCC" idx={6} />
            <ThickDisc z={0.55} innerR={0.15} outerR={1.0} thickness={0.07} teeth={20} speed={-0.3} color="#00EEFF" idx={7} />
            <ThickDisc z={0.75} innerR={0.3} outerR={0.75} thickness={0.05} teeth={12} speed={0.55} color="#00CCDD" idx={8} />
            <ThickDisc z={0.95} innerR={0.2} outerR={0.9} thickness={0.06} teeth={16} speed={-0.4} color="#00EEFF" idx={9} />

            {/* Outer end caps */}
            <ThickDisc z={-1.2} innerR={0.15} outerR={0.6} thickness={0.05} teeth={10} speed={0.7} color="#00AACC" idx={10} />
            <ThickDisc z={1.2} innerR={0.15} outerR={0.6} thickness={0.05} teeth={10} speed={-0.7} color="#00AACC" idx={11} />

            {/* ════════ RIBBED CYLINDER SECTIONS (structural supports) ════════ */}
            <RibbedCylinder z={-0.65} radius={0.95} height={0.12} ribs={18} speed={0.15} />
            <RibbedCylinder z={0.0} radius={1.05} height={0.1} ribs={22} speed={-0.12} />
            <RibbedCylinder z={0.65} radius={0.95} height={0.12} ribs={18} speed={0.15} />

            {/* ════════ OUTER STRUCTURAL RINGS ════════ */}
            <StructuralRing radius={1.2} tube={0.025} speed={0.18} color="#00CCEE" />
            <StructuralRing radius={1.35} tube={0.02} speed={-0.14} color="#00AACC" />
            <StructuralRing radius={1.55} tube={0.03} speed={0.1} color="#00DDFF" />
            <StructuralRing radius={1.8} tube={0.015} speed={-0.08} color="#008899" />

            {/* ════════ TILTED ORBIT RINGS (around the whole assembly) ════════ */}
            <OrbitRing radius={2.0} tube={0.012} speed={0.14} tiltX={0} tiltZ={0} color="#0088CC" />
            <OrbitRing radius={2.3} tube={0.01} speed={-0.1} tiltX={Math.PI * 0.12} tiltZ={0.06} color="#00BBEE" />
            <OrbitRing radius={2.7} tube={0.008} speed={0.07} tiltX={-0.08} tiltZ={Math.PI * 0.15} color="#0066AA" />
            <OrbitRing radius={3.1} tube={0.007} speed={-0.05} tiltX={Math.PI * 0.2} tiltZ={-0.04} color="#004488" />

            {/* Amber accent orbit */}
            <OrbitRing radius={1.7} tube={0.018} speed={-0.16} tiltX={Math.PI * 0.25} tiltZ={0.12} color="#FF9500" />
            <OrbitRing radius={2.5} tube={0.008} speed={0.06} tiltX={-0.05} tiltZ={0.1} color="#FF9500" />

            {/* ════════ CONNECTOR SPOKES (radial beams) ════════ */}
            <ConnectorSpokes count={6} innerR={0.2} outerR={1.0} z={-0.55} speed={0.3} />
            <ConnectorSpokes count={8} innerR={0.2} outerR={1.1} z={0.0} speed={-0.2} />
            <ConnectorSpokes count={6} innerR={0.2} outerR={1.0} z={0.55} speed={0.3} />
            {/* Long outer spokes */}
            <ConnectorSpokes count={4} innerR={0.5} outerR={2.0} z={0.0} speed={0.05} />

            {/* ════════ DETAIL BOLTS / RIVETS on outer ring ════════ */}
            <BoltRing radius={1.2} count={24} color="#00DDFF" />
            <BoltRing radius={1.55} count={32} color="#00AACC" />

            {/* ════════ WIREFRAME CAGE around core ════════ */}
            <WireframeCage radius={0.28} speed={-0.2} />

            {/* ════════ AMBER ENERGY ORB ════════ */}
            <AmberOrb />

            {/* ════════ TICK MARKS on rings ════════ */}
            <TickMarks radius={1.35} count={36} />
            <TickMarks radius={1.8} count={24} />
            <TickMarks radius={2.0} count={40} />
        </group>
    );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   SUB-COMPONENTS
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

/* ─── Core Glow: additive sphere halos ─── */
function CoreGlow({ radius, opacity, color }: { radius: number; opacity: number; color: string }) {
    return (
        <mesh>
            <sphereGeometry args={[radius, 24, 24]} />
            <meshBasicMaterial color={color} transparent opacity={opacity}
                blending={THREE.AdditiveBlending} depthWrite={false} side={THREE.BackSide} />
        </mesh>
    );
}

/* ─── Horizontal Energy Beam shooting through the center ─── */
function EnergyBeam() {
    const ref = useRef<THREE.Group>(null!);
    useFrame((state) => {
        const t = state.clock.elapsedTime;
        ref.current.children.forEach((ch, i) => {
            const mat = (ch as THREE.Mesh).material as THREE.MeshBasicMaterial;
            mat.opacity = 0.35 + Math.sin(t * 4 + i) * 0.15;
        });
    });
    return (
        <group ref={ref}>
            {/* Bright core beam — long horizontal rod */}
            <mesh>
                <cylinderGeometry args={[0.008, 0.008, 14, 8]} />
                <meshBasicMaterial color="#00EEFF" transparent opacity={0.35}
                    blending={THREE.AdditiveBlending} depthWrite={false} />
            </mesh>
            {/* Wider dim beam */}
            <mesh>
                <cylinderGeometry args={[0.025, 0.025, 12, 8]} />
                <meshBasicMaterial color="#0066AA" transparent opacity={0.06}
                    blending={THREE.AdditiveBlending} depthWrite={false} />
            </mesh>
            {/* Widest faint glow */}
            <mesh>
                <cylinderGeometry args={[0.06, 0.06, 10, 8]} />
                <meshBasicMaterial color="#003355" transparent opacity={0.03}
                    blending={THREE.AdditiveBlending} depthWrite={false} />
            </mesh>
        </group>
    );
}

/* ─── Engine Drum: solid semi-transparent cylinder ─── */
function EngineDrum({ radius, height, speed, color, opacity, segments }: {
    radius: number; height: number; speed: number; color: string; opacity: number; segments: number;
}) {
    const ref = useRef<THREE.Mesh>(null!);
    useFrame((state) => {
        ref.current.rotation.y = state.clock.elapsedTime * speed;
    });
    return (
        <mesh ref={ref}>
            <cylinderGeometry args={[radius, radius, height, segments, 1, true]} />
            <meshBasicMaterial color={color} transparent opacity={opacity}
                blending={THREE.AdditiveBlending} depthWrite={false} side={THREE.DoubleSide} />
        </mesh>
    );
}

/* ─── Thick Disc: a solid ring with radial teeth/slots ─── */
function ThickDisc({ z, innerR, outerR, thickness, teeth, speed, color, idx }: {
    z: number; innerR: number; outerR: number; thickness: number;
    teeth: number; speed: number; color: string; idx: number;
}) {
    const ref = useRef<THREE.Group>(null!);
    const speaking = useVoiceStore((s) => s.ttsPlaying);
    const spkSmooth = useRef(0);

    const toothData = useMemo(() => {
        const items = [];
        for (let i = 0; i < teeth; i++) {
            const a = (i / teeth) * Math.PI * 2;
            items.push({
                x: Math.cos(a) * outerR,
                z: Math.sin(a) * outerR,
                a,
            });
        }
        return items;
    }, [teeth, outerR]);

    useFrame((state) => {
        const t = state.clock.elapsedTime;
        spkSmooth.current += ((speaking ? 1 : 0) - spkSmooth.current) * 0.1;

        ref.current.rotation.y = t * speed;

        // BREATHING: when speaking, discs compress toward center then expand outward
        const spk = spkSmooth.current;
        const phase = idx * 0.5;
        // Oscillate toward center (z*0.4 pulls inward) and back out
        const breathe = Math.sin(t * 3.5 + phase) * 0.25 + Math.sin(t * 5.5 + phase * 1.7) * 0.12;
        // Pull toward center = reduce magnitude of z; push away = increase it
        const squeeze = -Math.sign(z) * breathe * spk;
        // Gentle idle float
        const idle = Math.sin(t * 1.2 + idx * 0.9) * 0.02;
        ref.current.position.y = z + squeeze + idle;
    });

    return (
        <group ref={ref} position={[0, z, 0]}>
            {/* Main ring body — SOLID visible disc */}
            <mesh>
                <cylinderGeometry args={[outerR, outerR, thickness, 48, 1, false]} />
                <meshStandardMaterial color={color} transparent opacity={0.55}
                    metalness={0.8} roughness={0.3} emissive={color} emissiveIntensity={0.15}
                    side={THREE.DoubleSide} />
            </mesh>
            {/* Inner cutout (darker ring to fake hollow center) */}
            <mesh>
                <cylinderGeometry args={[innerR, innerR, thickness + 0.002, 24, 1, false]} />
                <meshStandardMaterial color="#020508" opacity={0.95} transparent={false} />
            </mesh>
            {/* Ring edge highlight */}
            <mesh>
                <torusGeometry args={[outerR, 0.008, 6, 48]} />
                <meshBasicMaterial color={color} transparent opacity={0.5}
                    blending={THREE.AdditiveBlending} depthWrite={false} />
            </mesh>
            <mesh position={[0, thickness / 2, 0]} rotation={[Math.PI / 2, 0, 0]}>
                <torusGeometry args={[outerR, 0.005, 4, 48]} />
                <meshBasicMaterial color={color} transparent opacity={0.3}
                    blending={THREE.AdditiveBlending} depthWrite={false} />
            </mesh>
            <mesh position={[0, -thickness / 2, 0]} rotation={[Math.PI / 2, 0, 0]}>
                <torusGeometry args={[outerR, 0.005, 4, 48]} />
                <meshBasicMaterial color={color} transparent opacity={0.3}
                    blending={THREE.AdditiveBlending} depthWrite={false} />
            </mesh>
            {/* Radial teeth/slots — solid metal look */}
            {toothData.map((t, i) => (
                <mesh key={i} position={[t.x, 0, t.z]} rotation={[0, -t.a, 0]}>
                    <boxGeometry args={[0.12, thickness * 0.9, 0.025]} />
                    <meshStandardMaterial color={color} transparent opacity={0.7}
                        metalness={0.9} roughness={0.2} emissive={color} emissiveIntensity={0.1} />
                </mesh>
            ))}
        </group>
    );
}

/* ─── Ribbed Cylinder: cylinder with raised ribs ─── */
function RibbedCylinder({ z, radius, height, ribs, speed }: {
    z: number; radius: number; height: number; ribs: number; speed: number;
}) {
    const ref = useRef<THREE.Group>(null!);

    const ribData = useMemo(() => {
        const items = [];
        for (let i = 0; i < ribs; i++) {
            const a = (i / ribs) * Math.PI * 2;
            items.push({
                x: Math.cos(a) * radius,
                z: Math.sin(a) * radius,
                a,
            });
        }
        return items;
    }, [ribs, radius]);

    useFrame((state) => {
        ref.current.rotation.y = state.clock.elapsedTime * speed;
    });

    return (
        <group ref={ref} position={[0, z, 0]}>
            {/* Main cylinder body */}
            <mesh>
                <cylinderGeometry args={[radius, radius, height, 48, 1, true]} />
                <meshStandardMaterial color="#00889A" transparent opacity={0.4}
                    metalness={0.7} roughness={0.35} emissive="#004455" emissiveIntensity={0.2}
                    side={THREE.DoubleSide} />
            </mesh>
            {/* Raised ribs */}
            {ribData.map((r, i) => (
                <mesh key={i} position={[r.x, 0, r.z]} rotation={[0, -r.a, 0]}>
                    <boxGeometry args={[0.035, height, 0.012]} />
                    <meshStandardMaterial color="#00BBCC" transparent opacity={0.65}
                        metalness={0.85} roughness={0.2} emissive="#005566" emissiveIntensity={0.15} />
                </mesh>
            ))}
        </group>
    );
}

/* ─── Structural Ring: thick torus around the engine ─── */
function StructuralRing({ radius, tube, speed, color }: {
    radius: number; tube: number; speed: number; color: string;
}) {
    const ref = useRef<THREE.Mesh>(null!);
    useFrame((state) => {
        ref.current.rotation.y = state.clock.elapsedTime * speed;
    });
    return (
        <mesh ref={ref} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[radius, tube, 8, 64]} />
            <meshStandardMaterial color={color} transparent opacity={0.6}
                metalness={0.8} roughness={0.3} emissive={color} emissiveIntensity={0.12} />
        </mesh>
    );
}

/* ─── Orbit Ring: tilted ring around the assembly ─── */
function OrbitRing({ radius, tube, speed, tiltX, tiltZ, color }: {
    radius: number; tube: number; speed: number; tiltX: number; tiltZ: number; color: string;
}) {
    const ref = useRef<THREE.Mesh>(null!);
    useFrame((state) => {
        const t = state.clock.elapsedTime;
        ref.current.rotation.y = t * speed;
        ref.current.rotation.x = tiltX + Math.sin(t * 0.3) * 0.01;
        ref.current.rotation.z = tiltZ;
    });
    return (
        <mesh ref={ref}>
            <torusGeometry args={[radius, tube, 8, 96]} />
            <meshStandardMaterial color={color} transparent opacity={0.45}
                metalness={0.7} roughness={0.3} emissive={color} emissiveIntensity={0.1} />
        </mesh>
    );
}

/* ─── Connector Spokes: radial beams between rings ─── */
function ConnectorSpokes({ count, innerR, outerR, z, speed }: {
    count: number; innerR: number; outerR: number; z: number; speed: number;
}) {
    const ref = useRef<THREE.Group>(null!);

    const spokes = useMemo(() => {
        const arr = [];
        for (let i = 0; i < count; i++) {
            const a = (i / count) * Math.PI * 2;
            const len = outerR - innerR;
            const mid = (innerR + outerR) / 2;
            arr.push({
                x: Math.cos(a) * mid,
                z: Math.sin(a) * mid,
                a,
                len,
            });
        }
        return arr;
    }, [count, innerR, outerR]);

    useFrame((state) => {
        ref.current.rotation.y = state.clock.elapsedTime * speed;
    });

    return (
        <group ref={ref} position={[0, z, 0]}>
            {spokes.map((s, i) => (
                <mesh key={i} position={[s.x, 0, s.z]} rotation={[0, -s.a + Math.PI / 2, 0]}>
                    <boxGeometry args={[s.len, 0.015, 0.01]} />
                    <meshBasicMaterial color="#00CCEE" transparent opacity={0.25}
                        blending={THREE.AdditiveBlending} depthWrite={false} />
                </mesh>
            ))}
        </group>
    );
}

/* ─── Bolt Ring: small dot elements on rings ─── */
function BoltRing({ radius, count, color }: { radius: number; count: number; color: string }) {
    const ref = useRef<THREE.Group>(null!);
    useFrame((state) => { ref.current.rotation.y = -state.clock.elapsedTime * 0.08; });

    const bolts = useMemo(() => {
        const arr = [];
        for (let i = 0; i < count; i++) {
            const a = (i / count) * Math.PI * 2;
            arr.push({ x: Math.cos(a) * radius, z: Math.sin(a) * radius });
        }
        return arr;
    }, [radius, count]);

    return (
        <group ref={ref}>
            {bolts.map((b, i) => (
                <mesh key={i} position={[b.x, 0, b.z]}>
                    <sphereGeometry args={[0.012, 6, 6]} />
                    <meshBasicMaterial color={color} transparent opacity={0.5}
                        blending={THREE.AdditiveBlending} depthWrite={false} />
                </mesh>
            ))}
        </group>
    );
}

/* ─── Wireframe Cage around the core ─── */
function WireframeCage({ radius, speed }: { radius: number; speed: number }) {
    const ref = useRef<THREE.LineSegments>(null!);
    const geo = useMemo(() => new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(radius, 1)), [radius]);
    useFrame((state) => {
        ref.current.rotation.y = state.clock.elapsedTime * speed;
        ref.current.rotation.x = state.clock.elapsedTime * speed * 0.6;
    });
    return (
        <lineSegments ref={ref} geometry={geo}>
            <lineBasicMaterial color="#00EEFF" transparent opacity={0.2}
                blending={THREE.AdditiveBlending} depthWrite={false} />
        </lineSegments>
    );
}

/* ─── Amber Energy Orb ─── */
function AmberOrb() {
    const ref = useRef<THREE.Mesh>(null!);
    useFrame((state) => {
        const t = state.clock.elapsedTime;
        const s = 1 + Math.sin(t * 3) * 0.1;
        ref.current.scale.setScalar(s);
    });
    return (
        <group>
            <mesh ref={ref} position={[0, 3.5, 0]}>
                <sphereGeometry args={[0.1, 16, 16]} />
                <meshBasicMaterial color="#FFAA00" transparent opacity={0.9}
                    blending={THREE.AdditiveBlending} depthWrite={false} />
            </mesh>
            {/* Glow */}
            <mesh position={[0, 3.5, 0]}>
                <sphereGeometry args={[0.2, 12, 12]} />
                <meshBasicMaterial color="#FF8800" transparent opacity={0.2}
                    blending={THREE.AdditiveBlending} depthWrite={false} side={THREE.BackSide} />
            </mesh>
            {/* Connecting beam */}
            <mesh position={[0, 1.75, 0]}>
                <cylinderGeometry args={[0.005, 0.005, 3.2, 6]} />
                <meshBasicMaterial color="#FF9500" transparent opacity={0.2}
                    blending={THREE.AdditiveBlending} depthWrite={false} />
            </mesh>
            {/* Rings around orb */}
            <mesh position={[0, 3.5, 0]}>
                <torusGeometry args={[0.22, 0.004, 6, 32]} />
                <meshBasicMaterial color="#FF9500" transparent opacity={0.35}
                    blending={THREE.AdditiveBlending} depthWrite={false} />
            </mesh>
            <mesh position={[0, 3.5, 0]} rotation={[0.4, 0.3, 0]}>
                <torusGeometry args={[0.3, 0.003, 6, 32]} />
                <meshBasicMaterial color="#FF9500" transparent opacity={0.2}
                    blending={THREE.AdditiveBlending} depthWrite={false} />
            </mesh>
        </group>
    );
}

/* ─── Tick Marks on rings ─── */
function TickMarks({ radius, count }: { radius: number; count: number }) {
    const ref = useRef<THREE.Group>(null!);
    useFrame((state) => { ref.current.rotation.y = -state.clock.elapsedTime * 0.06; });

    const ticks = useMemo(() => {
        const arr = [];
        for (let i = 0; i < count; i++) {
            const a = (i / count) * Math.PI * 2;
            const len = i % 5 === 0 ? 0.08 : 0.03;
            arr.push({ x: Math.cos(a) * radius, z: Math.sin(a) * radius, a, len });
        }
        return arr;
    }, [radius, count]);

    return (
        <group ref={ref}>
            {ticks.map((tk, i) => (
                <mesh key={i} position={[tk.x, 0, tk.z]} rotation={[0, -tk.a, 0]}>
                    <boxGeometry args={[tk.len, 0.006, 0.003]} />
                    <meshBasicMaterial color="#00CCEE" transparent opacity={0.4}
                        blending={THREE.AdditiveBlending} depthWrite={false} />
                </mesh>
            ))}
        </group>
    );
}
