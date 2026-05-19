import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/**
 * Cinematic holographic ground grid with animated scan lines.
 */
export function HolographicGrid() {
    const gridRef = useRef<THREE.GridHelper>(null!);
    const scanRef = useRef<THREE.Mesh>(null!);

    useFrame((state) => {
        const t = state.clock.elapsedTime;
        if (gridRef.current) {
            const mat = gridRef.current.material as THREE.Material;
            mat.opacity = 0.12 + Math.sin(t * 0.5) * 0.03;
        }
        // Scan line sweeps forward
        if (scanRef.current) {
            const cycle = (t % 8) / 8;
            scanRef.current.position.z = -20 + cycle * 40;
            const mat = scanRef.current.material as THREE.MeshBasicMaterial;
            mat.opacity = Math.sin(cycle * Math.PI) * 0.15;
        }
    });

    return (
        <group position={[0, -3, 0]}>
            {/* Main grid */}
            <gridHelper
                ref={gridRef}
                args={[60, 60, '#0A84FF', '#0A84FF']}
                material-transparent
                material-opacity={0.12}
                material-depthWrite={false}
                material-blending={THREE.AdditiveBlending}
            />
            {/* Secondary finer grid */}
            <gridHelper
                args={[60, 120, '#0051A8', '#0051A8']}
                material-transparent
                material-opacity={0.04}
                material-depthWrite={false}
                material-blending={THREE.AdditiveBlending}
            />
            {/* Concentric circle rings on the floor */}
            <CircleRings />
            {/* Scanning line */}
            <mesh ref={scanRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
                <planeGeometry args={[60, 0.3]} />
                <meshBasicMaterial
                    color="#00D4FF"
                    transparent
                    opacity={0.1}
                    depthWrite={false}
                    blending={THREE.AdditiveBlending}
                    side={THREE.DoubleSide}
                />
            </mesh>
        </group>
    );
}

function CircleRings() {
    const ref = useRef<THREE.Group>(null!);
    const radii = [4, 8, 12, 18, 25];

    useFrame((state) => {
        ref.current.rotation.y = state.clock.elapsedTime * 0.02;
    });

    return (
        <group ref={ref} position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            {radii.map((r) => (
                <mesh key={r}>
                    <ringGeometry args={[r - 0.02, r + 0.02, 80]} />
                    <meshBasicMaterial
                        color="#0A84FF"
                        transparent
                        opacity={0.08}
                        depthWrite={false}
                        side={THREE.DoubleSide}
                        blending={THREE.AdditiveBlending}
                    />
                </mesh>
            ))}
        </group>
    );
}
