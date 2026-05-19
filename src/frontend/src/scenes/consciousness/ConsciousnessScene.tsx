import { Float, Stars } from '@react-three/drei';
import { Bloom, EffectComposer, Vignette, ChromaticAberration } from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';
import * as THREE from 'three';
import { useSettingsStore, QualityLevel } from '@/core/store';
import { AICore } from './AICore';
import { ParticleField, ScanRing } from './ParticleField';
import { HolographicGrid } from './HolographicGrid';
import { DataPanels } from './DataPanels';

export default function ConsciousnessScene() {
    const quality = useSettingsStore((s) => s.qualityLevel);
    const showPostProcessing = quality >= QualityLevel.MEDIUM;

    return (
        <>
            {/* Lighting — multi-point for depth */}
            <ambientLight intensity={0.08} color="#0A84FF" />
            <pointLight position={[0, 0, 0]} intensity={2.0} color="#0A84FF" distance={15} decay={2} />
            <pointLight position={[0, 5, 5]} intensity={0.8} color="#00D4FF" />
            <pointLight position={[-4, -2, 3]} intensity={0.5} color="#0051A8" />
            <pointLight position={[4, 3, -2]} intensity={0.4} color="#BF5AF2" />
            <pointLight position={[0, -3, 4]} intensity={0.3} color="#00AACC" />

            {/* R3F Engine Core — visible alongside Sketchfab as a fallback/enhancement */}
            <Float speed={0.8} rotationIntensity={0.1} floatIntensity={0.3}>
                <AICore />
            </Float>

            {/* Orbital particle field */}
            <ParticleField count={quality >= QualityLevel.HIGH ? 2500 : 1200} />

            {/* Scan ring sweep */}
            {quality >= QualityLevel.LOW && <ScanRing />}

            {/* Holographic data panels */}
            {quality >= QualityLevel.LOW && <DataPanels />}

            {/* Enhanced ground grid */}
            <HolographicGrid />

            {/* Background stars */}
            {quality >= QualityLevel.LOW && (
                <Stars
                    radius={120}
                    depth={60}
                    count={quality >= QualityLevel.HIGH ? 6000 : 2500}
                    factor={3}
                    saturation={0}
                    fade
                    speed={0.3}
                />
            )}

            {/* Post-processing stack */}
            {showPostProcessing && (
                <EffectComposer multisampling={0}>
                    <Bloom
                        luminanceThreshold={0.55}
                        luminanceSmoothing={0.6}
                        intensity={0.4}
                        mipmapBlur
                    />
                    <ChromaticAberration
                        blendFunction={BlendFunction.NORMAL}
                        offset={new THREE.Vector2(0.0005, 0.0005)}
                        radialModulation={true}
                        modulationOffset={0.5}
                    />
                    <Vignette eskil={false} offset={0.15} darkness={0.9} />
                </EffectComposer>
            )}
        </>
    );
}
