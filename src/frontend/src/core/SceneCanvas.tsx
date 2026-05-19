import { Suspense, lazy } from 'react';
import { Canvas } from '@react-three/fiber';
import { useSettingsStore, QualityLevel } from '@/core/store';

const ConsciousnessScene = lazy(() => import('@/scenes/consciousness/ConsciousnessScene'));

function LoadingFallback() {
    return (
        <mesh>
            <sphereGeometry args={[0.5, 16, 16]} />
            <meshBasicMaterial color="#0A84FF" wireframe />
        </mesh>
    );
}

export function SceneCanvas() {
    const quality = useSettingsStore((s) => s.qualityLevel);

    return (
        <Canvas
            gl={{
                antialias: quality >= QualityLevel.MEDIUM,
                powerPreference: 'high-performance',
                alpha: true,
            }}
            dpr={quality >= QualityLevel.HIGH ? [1, 2] : [1, 1]}
            camera={{ fov: 45, near: 0.1, far: 1000, position: [0, 0, 8] }}
            style={{ position: 'fixed', top: 0, left: 0, zIndex: 0 }}
        >
            {/* No R3F background — Sketchfab shows through, body has #050A12 fallback */}
            <Suspense fallback={<LoadingFallback />}>
                <ConsciousnessScene />
            </Suspense>
        </Canvas>
    );
}
