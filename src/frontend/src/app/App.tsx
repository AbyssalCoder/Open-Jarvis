import { useState, useCallback } from 'react';
import { Providers } from './Providers';
import { SceneCanvas } from '@/core/SceneCanvas';
import { HUDOverlay } from '@/components/hud/HUDOverlay';
import { PanelManager } from '@/components/panels/PanelManager';
import { NotificationLayer } from '@/components/hud/NotificationLayer';
import { VoiceOverlay } from '@/components/hud/VoiceOverlay';
import { SketchfabViewer } from '@/components/SketchfabViewer';
import { SplashScreen } from '@/components/SplashScreen';

export function App() {
    const [booted, setBooted] = useState(false);
    const handleReady = useCallback(() => setBooted(true), []);

    return (
        <Providers>
            {/* Splash screen — shown until all services are ready */}
            {!booted && <SplashScreen onReady={handleReady} />}

            {/* Main app layers — render underneath so they're ready when splash fades */}
            <div style={{ opacity: booted ? 1 : 0, transition: 'opacity 0.5s ease' }}>
                {/* Layer 0: Sketchfab Arc Reactor — full-screen transparent iframe */}
                <SketchfabViewer />
                {/* Layer 1: R3F overlay — particles, data panels, grid (transparent bg) */}
                <SceneCanvas />
                {/* Layer 2+: HUD chrome */}
                <HUDOverlay />
                <PanelManager />
                <NotificationLayer />
                <VoiceOverlay />
            </div>
        </Providers>
    );
}
