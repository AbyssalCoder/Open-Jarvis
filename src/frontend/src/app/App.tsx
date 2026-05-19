import { Providers } from './Providers';
import { SceneCanvas } from '@/core/SceneCanvas';
import { HUDOverlay } from '@/components/hud/HUDOverlay';
import { PanelManager } from '@/components/panels/PanelManager';
import { NotificationLayer } from '@/components/hud/NotificationLayer';
import { VoiceOverlay } from '@/components/hud/VoiceOverlay';
import { SketchfabViewer } from '@/components/SketchfabViewer';

export function App() {
    return (
        <Providers>
            {/* Layer 0: Sketchfab Arc Reactor — full-screen transparent iframe */}
            <SketchfabViewer />
            {/* Layer 1: R3F overlay — particles, data panels, grid (transparent bg) */}
            <SceneCanvas />
            {/* Layer 2+: HUD chrome */}
            <HUDOverlay />
            <PanelManager />
            <NotificationLayer />
            <VoiceOverlay />
        </Providers>
    );
}
