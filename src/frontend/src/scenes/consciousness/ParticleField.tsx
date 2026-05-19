import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useAIStore } from '@/core/store';

interface ParticleFieldProps {
    count?: number;
    radius?: number;
}

/**
 * Orbital energy particles — swirl around the arc reactor core
 * with varying speeds, sizes, and orbits.
 */
export function ParticleField({ count = 1500, radius = 12 }: ParticleFieldProps) {
    const pointsRef = useRef<THREE.Points>(null!);
    const isThinking = useAIStore((s) => s.isThinking);

    const [positions, metadata] = useMemo(() => {
        const pos = new Float32Array(count * 3);
        // metadata: orbitRadius, orbitSpeed, orbitOffset, yOffset, size
        const meta = new Float32Array(count * 5);

        for (let i = 0; i < count; i++) {
            const i3 = i * 3;
            const i5 = i * 5;

            // Distribute particles in orbital layers
            const layer = Math.random();
            let orbitR: number;
            if (layer < 0.3) {
                // Close orbit around core
                orbitR = 0.8 + Math.random() * 1.8;
            } else if (layer < 0.7) {
                // Mid-range
                orbitR = 2.5 + Math.random() * 3;
            } else {
                // Far ambient
                orbitR = 5 + Math.random() * (radius - 5);
            }

            const angle = Math.random() * Math.PI * 2;
            const yOff = (Math.random() - 0.5) * 2.5;

            pos[i3] = Math.cos(angle) * orbitR;
            pos[i3 + 1] = yOff;
            pos[i3 + 2] = Math.sin(angle) * orbitR;

            meta[i5] = orbitR;
            meta[i5 + 1] = (0.1 + Math.random() * 0.5) * (Math.random() > 0.5 ? 1 : -1); // speed
            meta[i5 + 2] = angle; // offset
            meta[i5 + 3] = yOff;
            meta[i5 + 4] = 0.01 + Math.random() * 0.04; // size
        }
        return [pos, meta];
    }, [count, radius]);

    useFrame((state) => {
        if (!pointsRef.current) return;
        const t = state.clock.elapsedTime;
        const posAttr = pointsRef.current.geometry.attributes
            .position as THREE.BufferAttribute;
        const arr = posAttr.array as Float32Array;
        const speedMult = isThinking ? 2.0 : 1.0;

        for (let i = 0; i < count; i++) {
            const i3 = i * 3;
            const i5 = i * 5;
            const orbitR = metadata[i5];
            const speed = metadata[i5 + 1] * speedMult;
            const offset = metadata[i5 + 2];
            const yOff = metadata[i5 + 3];

            const angle = offset + t * speed;
            arr[i3] = Math.cos(angle) * orbitR;
            arr[i3 + 1] = yOff + Math.sin(t * 0.5 + offset) * 0.3;
            arr[i3 + 2] = Math.sin(angle) * orbitR;
        }
        posAttr.needsUpdate = true;
    });

    return (
        <points ref={pointsRef}>
            <bufferGeometry>
                <bufferAttribute
                    attach="attributes-position"
                    args={[positions, 3]}
                />
            </bufferGeometry>
            <pointsMaterial
                size={0.04}
                color="#00D4FF"
                transparent
                opacity={0.7}
                sizeAttenuation
                depthWrite={false}
                blending={THREE.AdditiveBlending}
            />
        </points>
    );
}

/**
 * Scanning ring — a flat torus that sweeps up/down periodically.
 */
export function ScanRing() {
    const ref = useRef<THREE.Mesh>(null!);

    useFrame((state) => {
        const t = state.clock.elapsedTime;
        // Sweep up and down every 5 seconds
        const cycle = (t % 5) / 5;
        ref.current.position.y = (cycle - 0.5) * 6;
        ref.current.scale.setScalar(1 + cycle * 0.5);
        const mat = ref.current.material as THREE.MeshBasicMaterial;
        // Fade in-out during sweep
        mat.opacity = Math.sin(cycle * Math.PI) * 0.2;
    });

    return (
        <mesh ref={ref} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[3, 0.005, 4, 120]} />
            <meshBasicMaterial
                color="#00D4FF"
                transparent
                opacity={0.15}
                depthWrite={false}
                blending={THREE.AdditiveBlending}
            />
        </mesh>
    );
}
