/**
 * Agent Dashboard — 3D futuristic command center with robot agents at desks.
 * Each robot represents a JARVIS sub-agent with unique design and animations.
 * Brain sits at the center command desk, others work at surrounding stations.
 */

import { useRef, useState, useEffect, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Html, OrbitControls, Stars, MeshReflectorMaterial } from '@react-three/drei';
import * as THREE from 'three';
import { motion, AnimatePresence } from 'framer-motion';
import { apiFetch } from '@/utils/tauriFetch';

interface AgentNode {
    id: string;
    name: string;
    status: 'idle' | 'active' | 'busy' | 'error';
    color: string;
    position: [number, number, number];
    rotation?: number;
    lastActivity?: string;
    role: string;
}

const AGENT_CONFIGS: Omit<AgentNode, 'status' | 'lastActivity'>[] = [
    { id: 'brain',     name: 'BRAIN',     color: '#0A84FF', position: [0, 0, 0],      rotation: 0,     role: 'Commander' },
    { id: 'voice',     name: 'VOICE',     color: '#30D158', position: [4, 0, -2],     rotation: -0.5,  role: 'Speech Engine' },
    { id: 'vision',    name: 'VISION',    color: '#BF5AF2', position: [-4, 0, -2],    rotation: 0.5,   role: 'Visual Processor' },
    { id: 'memory',    name: 'MEMORY',    color: '#FF9500', position: [0, 0, -5],     rotation: 0,     role: 'Data Vault' },
    { id: 'tools',     name: 'TOOLS',     color: '#FF375F', position: [5.5, 0, 1.5],  rotation: -0.8,  role: 'Executor' },
    { id: 'scheduler', name: 'SCHEDULER', color: '#00D4FF', position: [-5.5, 0, 1.5], rotation: 0.8,   role: 'Time Keeper' },
    { id: 'media',     name: 'MEDIA',     color: '#FF6482', position: [3, 0, 3.5],    rotation: -1,    role: 'Entertainment' },
    { id: 'web',       name: 'WEB',       color: '#FFD60A', position: [-3, 0, 3.5],   rotation: 1,     role: 'Navigator' },
];

export function AgentDashboard({ onClose }: { onClose: () => void }) {
    const [agents, setAgents] = useState<AgentNode[]>(
        AGENT_CONFIGS.map((a) => ({ ...a, status: 'idle' as const }))
    );
    const [sysMetrics, setSysMetrics] = useState({ cpu: 0, ram_used_mb: 0, ram_total_mb: 0, gpu: 0 });
    const [uptime, setUptime] = useState(0);

    // Poll real agent statuses from backend
    useEffect(() => {
        async function poll() {
            try {
                const r = await apiFetch('/api/agents');
                if (r.ok) {
                    const data = await r.json();
                    if (data.agents) {
                        setAgents((prev) =>
                            prev.map((a) => {
                                const ba = data.agents.find((b: { id: string }) => b.id === a.id);
                                return ba ? { ...a, status: ba.status || 'idle', lastActivity: ba.lastActivity } : a;
                            })
                        );
                    }
                }
            } catch { /* ok */ }
        }
        poll();
        const id = setInterval(poll, 2000);
        return () => clearInterval(id);
    }, []);

    // Poll real system metrics
    useEffect(() => {
        async function pollMetrics() {
            try {
                const r = await apiFetch('/api/system');
                if (r.ok) {
                    const data = await r.json();
                    setSysMetrics(data);
                }
            } catch { /* ok */ }
        }
        pollMetrics();
        const id = setInterval(pollMetrics, 3000);
        return () => clearInterval(id);
    }, []);

    // Track uptime
    useEffect(() => {
        const startTime = Date.now();
        const id = setInterval(() => setUptime(Math.floor((Date.now() - startTime) / 1000)), 1000);
        return () => clearInterval(id);
    }, []);

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{
                    position: 'fixed', inset: 0, zIndex: 8000,
                    background: 'radial-gradient(ellipse at center, #080c12 0%, #000208 100%)',
                }}
            >
                {/* Header */}
                <div style={{
                    position: 'absolute', top: 0, left: 0, right: 0,
                    padding: '12px 20px',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    zIndex: 10,
                    background: 'linear-gradient(180deg, rgba(0,0,0,0.8) 0%, transparent 100%)',
                }}>
                    <div>
                        <h2 style={{
                            color: '#00D4FF', fontFamily: 'monospace', fontSize: 13,
                            letterSpacing: 4, margin: 0,
                        }}>
                            ◆ JARVIS COMMAND CENTER
                        </h2>
                        <p style={{ color: '#3a5a7a', fontFamily: 'monospace', fontSize: 9, margin: '2px 0 0' }}>
                            {agents.filter(a => a.status === 'active').length} / {agents.length} agents active
                            {' · '}UPTIME {Math.floor(uptime / 60)}m {uptime % 60}s
                        </p>
                    </div>
                    {/* Real-time system metrics */}
                    <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: 7, color: '#6688aa', fontFamily: 'monospace', letterSpacing: 1 }}>CPU</div>
                            <div style={{ fontSize: 14, color: sysMetrics.cpu > 80 ? '#FF3B30' : '#00D4FF', fontFamily: 'monospace', fontWeight: 200 }}>
                                {sysMetrics.cpu.toFixed(0)}%
                            </div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: 7, color: '#6688aa', fontFamily: 'monospace', letterSpacing: 1 }}>RAM</div>
                            <div style={{ fontSize: 14, color: sysMetrics.ram_total_mb > 0 && (sysMetrics.ram_used_mb / sysMetrics.ram_total_mb) > 0.85 ? '#FF3B30' : '#30D158', fontFamily: 'monospace', fontWeight: 200 }}>
                                {sysMetrics.ram_total_mb > 0 ? Math.round((sysMetrics.ram_used_mb / sysMetrics.ram_total_mb) * 100) : 0}%
                            </div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: 7, color: '#6688aa', fontFamily: 'monospace', letterSpacing: 1 }}>GPU</div>
                            <div style={{ fontSize: 14, color: '#BF5AF2', fontFamily: 'monospace', fontWeight: 200 }}>
                                {sysMetrics.gpu}%
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'rgba(255, 59, 48, 0.08)',
                            border: '1px solid rgba(255, 59, 48, 0.4)',
                            color: '#FF3B30', padding: '5px 14px', borderRadius: 3,
                            cursor: 'pointer', fontFamily: 'monospace', fontSize: 10, letterSpacing: 1,
                        }}
                    >
                        ✕ CLOSE
                    </button>
                </div>

                {/* 3D Canvas */}
                <Canvas camera={{ position: [0, 6, 12], fov: 55 }} shadows>
                    <fog attach="fog" args={['#000208', 15, 30]} />
                    <ambientLight intensity={0.15} color="#4488ff" />
                    <directionalLight position={[5, 10, 5]} intensity={0.4} color="#88bbff" castShadow />
                    <pointLight position={[0, 4, 0]} intensity={0.8} color="#0A84FF" distance={12} />

                    <Stars radius={50} depth={30} count={800} factor={3} saturation={0.5} fade speed={0.5} />

                    <OfficeFloor />
                    <HoloRing position={[0, 2.5, 0]} />

                    {agents.slice(1).map((agent) => (
                        <DataStream
                            key={`s-${agent.id}`}
                            from={agents[0].position}
                            to={agent.position}
                            active={agent.status === 'active'}
                            color={agent.color}
                        />
                    ))}

                    {agents.map((agent) => (
                        <AgentStation key={agent.id} agent={agent} />
                    ))}

                    <OrbitControls
                        enablePan={false} minDistance={6} maxDistance={20}
                        maxPolarAngle={Math.PI / 2.2} minPolarAngle={Math.PI / 6}
                        autoRotate autoRotateSpeed={0.3}
                    />
                </Canvas>

                {/* Status bar */}
                <div style={{
                    position: 'absolute', bottom: 12, left: 12, right: 12,
                    display: 'flex', justifyContent: 'center', gap: 6, zIndex: 10, flexWrap: 'wrap',
                }}>
                    {agents.map(a => {
                        const sc = a.status === 'active' ? a.color : a.status === 'error' ? '#FF3B30' : '#2a3a4a';
                        return (
                            <div key={a.id} style={{
                                background: `${sc}10`, border: `1px solid ${sc}40`,
                                borderRadius: 3, padding: '3px 8px',
                                display: 'flex', alignItems: 'center', gap: 4,
                            }}>
                                <div style={{
                                    width: 5, height: 5, borderRadius: '50%', background: sc,
                                    boxShadow: a.status === 'active' ? `0 0 6px ${sc}` : 'none',
                                }} />
                                <span style={{ color: sc, fontFamily: 'monospace', fontSize: 8, letterSpacing: 1 }}>
                                    {a.name}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </motion.div>
        </AnimatePresence>
    );
}

/* ─── Sub-components ─────────────────────────────────────────────── */

function OfficeFloor() {
    return (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
            <planeGeometry args={[40, 40]} />
            <MeshReflectorMaterial
                blur={[300, 100]} resolution={512}
                mixBlur={0.8} mixStrength={0.4}
                roughness={0.8} depthScale={1}
                color="#050a12" metalness={0.6} mirror={0.4}
            />
        </mesh>
    );
}

function HoloRing({ position }: { position: [number, number, number] }) {
    const ref1 = useRef<THREE.Mesh>(null!);
    const ref2 = useRef<THREE.Mesh>(null!);

    useFrame((state) => {
        const t = state.clock.elapsedTime;
        if (ref1.current) { ref1.current.rotation.y = t * 0.5; ref1.current.rotation.z = Math.sin(t * 0.3) * 0.1; }
        if (ref2.current) { ref2.current.rotation.y = -t * 0.3; ref2.current.rotation.x = Math.sin(t * 0.4) * 0.15; }
    });

    return (
        <group position={position}>
            <mesh ref={ref1}>
                <torusGeometry args={[1.5, 0.02, 16, 64]} />
                <meshBasicMaterial color="#0A84FF" transparent opacity={0.4} />
            </mesh>
            <mesh ref={ref2}>
                <torusGeometry args={[1.8, 0.015, 16, 64]} />
                <meshBasicMaterial color="#00D4FF" transparent opacity={0.25} />
            </mesh>
        </group>
    );
}

function AgentStation({ agent }: { agent: AgentNode }) {
    const isBrain = agent.id === 'brain';
    return (
        <group position={agent.position} rotation={[0, agent.rotation || 0, 0]}>
            <Desk isBrain={isBrain} color={agent.color} />
            <RobotAgent agent={agent} isBrain={isBrain} />
            <HoloScreen agent={agent} isBrain={isBrain} />
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
                <ringGeometry args={[1.2, 1.35, 32]} />
                <meshBasicMaterial
                    color={agent.status === 'active' ? agent.color : '#1a2a3a'}
                    transparent opacity={agent.status === 'active' ? 0.3 : 0.08}
                />
            </mesh>
        </group>
    );
}

function Desk({ isBrain, color }: { isBrain: boolean; color: string }) {
    const w = isBrain ? 1.8 : 1.2;
    const d = isBrain ? 0.8 : 0.6;
    return (
        <group position={[0, 0.5, -0.4]}>
            <mesh castShadow receiveShadow>
                <boxGeometry args={[w, 0.04, d]} />
                <meshStandardMaterial color="#0a1520" metalness={0.9} roughness={0.3} emissive={color} emissiveIntensity={0.03} />
            </mesh>
            <mesh position={[0, -0.005, d / 2]}>
                <boxGeometry args={[w, 0.01, 0.01]} />
                <meshBasicMaterial color={color} transparent opacity={0.5} />
            </mesh>
            <mesh position={[0, -0.25, 0]}>
                <cylinderGeometry args={[0.05, 0.08, 0.5, 8]} />
                <meshStandardMaterial color="#0a1218" metalness={0.8} roughness={0.4} />
            </mesh>
        </group>
    );
}

function RobotAgent({ agent, isBrain }: { agent: AgentNode; isBrain: boolean }) {
    const groupRef = useRef<THREE.Group>(null!);
    const headRef = useRef<THREE.Group>(null!);
    const eyeLRef = useRef<THREE.Mesh>(null!);
    const eyeRRef = useRef<THREE.Mesh>(null!);
    const armLRef = useRef<THREE.Group>(null!);
    const armRRef = useRef<THREE.Group>(null!);

    const sc = useMemo(() => {
        if (agent.status === 'active') return agent.color;
        if (agent.status === 'error') return '#FF3B30';
        return '#2a3a4a';
    }, [agent.status, agent.color]);

    const s = isBrain ? 1.2 : 0.9;

    useFrame((state) => {
        const t = state.clock.elapsedTime;
        if (headRef.current) {
            headRef.current.rotation.y = Math.sin(t * 0.8 + agent.position[0]) * 0.15;
            headRef.current.rotation.z = Math.sin(t * 0.5 + agent.position[2]) * 0.05;
        }
        const ep = agent.status === 'active' ? 0.8 + Math.sin(t * 3) * 0.3 : 0.2;
        if (eyeLRef.current) (eyeLRef.current.material as THREE.MeshBasicMaterial).opacity = ep;
        if (eyeRRef.current) (eyeRRef.current.material as THREE.MeshBasicMaterial).opacity = ep;
        if (agent.status === 'active') {
            if (armLRef.current) armLRef.current.rotation.x = -0.8 + Math.sin(t * 6 + 1) * 0.1;
            if (armRRef.current) armRRef.current.rotation.x = -0.8 + Math.sin(t * 6) * 0.1;
        } else {
            if (armLRef.current) armLRef.current.rotation.x = -0.3;
            if (armRRef.current) armRRef.current.rotation.x = -0.3;
        }
        if (groupRef.current) groupRef.current.position.y = Math.sin(t * 0.6) * 0.02;
    });

    return (
        <group ref={groupRef} scale={s} position={[0, 0.05, 0]}>
            {/* Torso */}
            <mesh position={[0, 1.1, 0]} castShadow>
                <boxGeometry args={[0.5, 0.6, 0.3]} />
                <meshStandardMaterial color="#0c1824" metalness={0.85} roughness={0.3} emissive={sc} emissiveIntensity={0.05} />
            </mesh>
            {/* Core light */}
            <mesh position={[0, 1.15, 0.16]}>
                <circleGeometry args={[0.08, 16]} />
                <meshBasicMaterial color={sc} transparent opacity={agent.status === 'active' ? 0.9 : 0.2} />
            </mesh>
            <mesh position={[0, 1.0, 0.155]}>
                <boxGeometry args={[0.35, 0.01, 0.001]} />
                <meshBasicMaterial color={sc} transparent opacity={0.3} />
            </mesh>

            {/* Head */}
            <group ref={headRef} position={[0, 1.65, 0]}>
                <mesh castShadow>
                    <boxGeometry args={[0.35, 0.3, 0.3]} />
                    <meshStandardMaterial color="#0e1e2e" metalness={0.9} roughness={0.2} emissive={sc} emissiveIntensity={0.03} />
                </mesh>
                <mesh position={[0, 0.02, 0.151]}>
                    <boxGeometry args={[0.28, 0.1, 0.01]} />
                    <meshBasicMaterial color={sc} transparent opacity={0.15} />
                </mesh>
                <mesh ref={eyeLRef} position={[-0.08, 0.03, 0.16]}>
                    <circleGeometry args={[0.03, 12]} />
                    <meshBasicMaterial color={sc} transparent opacity={0.8} />
                </mesh>
                <mesh ref={eyeRRef} position={[0.08, 0.03, 0.16]}>
                    <circleGeometry args={[0.03, 12]} />
                    <meshBasicMaterial color={sc} transparent opacity={0.8} />
                </mesh>
                {isBrain && (
                    <group position={[0, 0.2, 0]}>
                        <mesh>
                            <cylinderGeometry args={[0.01, 0.01, 0.15, 6]} />
                            <meshStandardMaterial color="#1a3050" metalness={0.8} />
                        </mesh>
                        <mesh position={[0, 0.1, 0]}>
                            <sphereGeometry args={[0.03, 8, 8]} />
                            <meshBasicMaterial color={sc} />
                        </mesh>
                    </group>
                )}
            </group>

            {/* Neck */}
            <mesh position={[0, 1.45, 0]}>
                <cylinderGeometry args={[0.06, 0.08, 0.1, 8]} />
                <meshStandardMaterial color="#0a1620" metalness={0.8} roughness={0.3} />
            </mesh>

            {/* Left arm */}
            <group ref={armLRef} position={[-0.35, 1.3, 0]}>
                <mesh position={[0, -0.15, 0]}>
                    <boxGeometry args={[0.1, 0.3, 0.1]} />
                    <meshStandardMaterial color="#0c1824" metalness={0.8} roughness={0.3} />
                </mesh>
                <mesh position={[0, -0.4, 0.05]}>
                    <boxGeometry args={[0.08, 0.2, 0.08]} />
                    <meshStandardMaterial color="#0e1e2e" metalness={0.8} roughness={0.3} />
                </mesh>
                <mesh position={[0, -0.28, 0.06]}>
                    <sphereGeometry args={[0.03, 8, 8]} />
                    <meshBasicMaterial color={sc} transparent opacity={0.4} />
                </mesh>
            </group>

            {/* Right arm */}
            <group ref={armRRef} position={[0.35, 1.3, 0]}>
                <mesh position={[0, -0.15, 0]}>
                    <boxGeometry args={[0.1, 0.3, 0.1]} />
                    <meshStandardMaterial color="#0c1824" metalness={0.8} roughness={0.3} />
                </mesh>
                <mesh position={[0, -0.4, 0.05]}>
                    <boxGeometry args={[0.08, 0.2, 0.08]} />
                    <meshStandardMaterial color="#0e1e2e" metalness={0.8} roughness={0.3} />
                </mesh>
                <mesh position={[0, -0.28, 0.06]}>
                    <sphereGeometry args={[0.03, 8, 8]} />
                    <meshBasicMaterial color={sc} transparent opacity={0.4} />
                </mesh>
            </group>

            {/* Lower body (seated) */}
            <mesh position={[0, 0.65, 0.05]}>
                <boxGeometry args={[0.45, 0.3, 0.3]} />
                <meshStandardMaterial color="#0a1520" metalness={0.8} roughness={0.3} />
            </mesh>

            {/* Label */}
            <Html position={[0, 2.1, 0]} center>
                <div style={{ textAlign: 'center', pointerEvents: 'none', userSelect: 'none' }}>
                    <div style={{
                        color: sc, fontFamily: 'monospace',
                        fontSize: isBrain ? 10 : 8, fontWeight: 700,
                        letterSpacing: 2, textShadow: `0 0 10px ${sc}60`, whiteSpace: 'nowrap',
                    }}>
                        {agent.name}
                    </div>
                    <div style={{ color: '#3a5a7a', fontFamily: 'monospace', fontSize: 6, marginTop: 1 }}>
                        {agent.lastActivity || agent.role}
                    </div>
                </div>
            </Html>
        </group>
    );
}

function HoloScreen({ agent, isBrain }: { agent: AgentNode; isBrain: boolean }) {
    const ref = useRef<THREE.Mesh>(null!);
    const w = isBrain ? 1.4 : 0.8;
    const h = isBrain ? 0.7 : 0.5;

    useFrame((state) => {
        const t = state.clock.elapsedTime;
        if (ref.current) ref.current.position.y = 1.2 + Math.sin(t * 0.5 + agent.position[0] * 2) * 0.03;
    });

    const edgeGeo = useMemo(() => new THREE.EdgesGeometry(new THREE.PlaneGeometry(w, h)), [w, h]);

    return (
        <group position={[0, 0, -0.6]}>
            <mesh ref={ref} position={[0, 1.2, 0]}>
                <planeGeometry args={[w, h]} />
                <meshBasicMaterial
                    color={agent.status === 'active' ? agent.color : '#0a1520'}
                    transparent opacity={agent.status === 'active' ? 0.12 : 0.04}
                    side={THREE.DoubleSide}
                />
            </mesh>
            <lineSegments position={[0, 1.2, 0.001]} geometry={edgeGeo}>
                <lineBasicMaterial color={agent.status === 'active' ? agent.color : '#1a2a3a'} transparent opacity={0.4} />
            </lineSegments>
        </group>
    );
}

function DataStream({
    from, to, active, color,
}: {
    from: [number, number, number];
    to: [number, number, number];
    active: boolean;
    color: string;
}) {
    const particlesRef = useRef<THREE.Points>(null!);
    const particleCount = 8;

    const curve = useMemo(() => {
        const s = new THREE.Vector3(...from);
        const e = new THREE.Vector3(...to);
        const m = new THREE.Vector3((s.x + e.x) / 2, Math.max(s.y, e.y) + 1.5, (s.z + e.z) / 2);
        return new THREE.QuadraticBezierCurve3(s, m, e);
    }, [from, to]);

    const lineGeo = useMemo(() => {
        const geo = new THREE.BufferGeometry();
        geo.setFromPoints(curve.getPoints(20));
        return geo;
    }, [curve]);

    const lineMat = useMemo(() => new THREE.LineBasicMaterial({
        color: active ? color : '#1a2a3a', transparent: true, opacity: active ? 0.25 : 0.05,
    }), [active, color]);

    const particleGeo = useMemo(() => {
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(particleCount * 3), 3));
        return geo;
    }, []);

    const particleMat = useMemo(() => new THREE.PointsMaterial({
        color, size: 0.06, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending,
    }), [color]);

    useFrame((state) => {
        if (!active || !particlesRef.current) return;
        const t = state.clock.elapsedTime;
        const pos = particleGeo.attributes.position as THREE.BufferAttribute;
        for (let i = 0; i < particleCount; i++) {
            const p = ((t * 0.4 + i / particleCount) % 1);
            const pt = curve.getPoint(p);
            pos.setXYZ(i, pt.x, pt.y, pt.z);
        }
        pos.needsUpdate = true;
    });

    return (
        <>
            <primitive object={new THREE.Line(lineGeo, lineMat)} />
            {active && <points ref={particlesRef} geometry={particleGeo} material={particleMat} />}
        </>
    );
}
