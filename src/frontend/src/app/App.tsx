import { useState, useCallback, useEffect } from 'react';
import { Providers } from './Providers';
import { SceneCanvas } from '@/core/SceneCanvas';
import { HUDOverlay } from '@/components/hud/HUDOverlay';
import { PanelManager } from '@/components/panels/PanelManager';
import { NotificationLayer } from '@/components/hud/NotificationLayer';
import { VoiceOverlay } from '@/components/hud/VoiceOverlay';
import { SketchfabViewer } from '@/components/SketchfabViewer';
import { SplashScreen } from '@/components/SplashScreen';
import { AgentDashboard } from '@/scenes/agent-network/AgentDashboard';
import { AvatarView } from '@/components/avatar/AvatarView';
import { WebcamCapture } from '@/components/vision/WebcamCapture';
import { voiceEngine } from '@/core/voice/VoiceEngine';
import { useVisionStore, usePanelStore } from '@/core/store';

/** Vision trigger phrases (must match ChatPanel) */
const VISION_TRIGGERS = [
    'check this image', 'analyze this', 'what is this', 'look at this',
    'what do you see', 'analyze what', 'in front of me', 'show me what',
    'check what', 'identify this', 'what am i holding', 'scan this',
    'capture and analyze', 'use camera', 'use the camera', 'use my camera',
    'open camera', 'open the camera', 'open my camera',
    'open webcam', 'open the webcam', 'open my webcam',
    'take a photo', 'take a picture', 'take photo', 'take picture',
    'what is in front', 'webcam', 'camera',
    'look through my camera', 'see through my camera',
    'what can you see', 'show me what you see',
    'click a picture', 'click a photo', 'click photo', 'click picture',
    'see what', 'look at me', 'see me', 'my face',
    'snap a photo', 'snap a picture', 'capture image',
];

/** Dashboard trigger phrases */
const DASHBOARD_TRIGGERS = [
    'show the dashboard', 'show dashboard', 'open dashboard',
    'agent dashboard', 'show agents', 'show me the agents',
    'show agent network', 'agent network', 'open the dashboard',
    'open my dashboard', 'dashboard', 'show me dashboard',
    'show me the dashboard', 'open agent dashboard',
    'command center', 'show command center', 'open command center',
    'agents status', 'agent status',
];

function isVisionCommand(text: string): boolean {
    const lower = text.toLowerCase();
    return VISION_TRIGGERS.some((t) => lower.includes(t));
}

function isDashboardCommand(text: string): boolean {
    const lower = text.toLowerCase();
    return DASHBOARD_TRIGGERS.some((t) => lower.includes(t));
}

/**
 * Global Voice Command Router — always mounted, handles voice→action routing
 * independently of whether the chat panel is open.
 */
function VoiceCommandRouter() {
    const openWebcam = useVisionStore((s) => s.openWebcam);

    useEffect(() => {
        voiceEngine.onResult((text) => {
            console.log('[VoiceRouter] Got voice result:', text);
            const trimmed = text.trim();
            if (!trimmed) return;

            // Vision commands → open webcam globally
            if (isVisionCommand(trimmed)) {
                console.log('[VoiceRouter] Vision command detected, opening webcam');
                openWebcam(trimmed);
                return;
            }

            // Dashboard commands
            if (isDashboardCommand(trimmed)) {
                window.dispatchEvent(new CustomEvent('jarvis:show-dashboard'));
                return;
            }

            // All other commands → forward to chat panel via event
            // Ensure chat panel is open
            const panelState = usePanelStore.getState();
            if (!panelState.openPanels.includes('chat')) {
                panelState.togglePanel('chat');
            }
            // Dispatch voice message event for ChatPanel to pick up
            window.dispatchEvent(new CustomEvent('jarvis:voice-message', { detail: trimmed }));
        });
    }, [openWebcam]);

    return null;
}

/**
 * Global WebcamCapture — renders when vision store says to show webcam.
 * Results are spoken via TTS and added to chat.
 */
function GlobalWebcam() {
    const showWebcam = useVisionStore((s) => s.showWebcam);
    const webcamQuery = useVisionStore((s) => s.webcamQuery);
    const closeWebcam = useVisionStore((s) => s.closeWebcam);

    // Listen for filler speech events while analyzing
    useEffect(() => {
        const handler = (e: Event) => {
            const detail = (e as CustomEvent).detail;
            if (detail) voiceEngine.speak(detail);
        };
        window.addEventListener('jarvis:speak-filler', handler);
        return () => window.removeEventListener('jarvis:speak-filler', handler);
    }, []);

    if (!showWebcam) return null;

    return (
        <WebcamCapture
            query={webcamQuery}
            onResult={(result) => {
                // Dispatch result as a chat message
                window.dispatchEvent(new CustomEvent('jarvis:vision-result', { detail: result }));
                voiceEngine.speak(result);
            }}
            onClose={closeWebcam}
        />
    );
}

type ViewMode = 'engine' | 'avatar';

export function App() {
    const [booted, setBooted] = useState(false);
    const [showDashboard, setShowDashboard] = useState(false);
    const [viewMode, setViewMode] = useState<ViewMode>('engine');
    const handleReady = useCallback(() => setBooted(true), []);

    // Listen for dashboard open/close events
    useEffect(() => {
        const openHandler = () => setShowDashboard(true);
        const closeHandler = () => setShowDashboard(false);
        window.addEventListener('jarvis:show-dashboard', openHandler);
        window.addEventListener('jarvis:hide-dashboard', closeHandler);
        return () => {
            window.removeEventListener('jarvis:show-dashboard', openHandler);
            window.removeEventListener('jarvis:hide-dashboard', closeHandler);
        };
    }, []);

    const toggleView = useCallback(() => {
        setViewMode((v) => (v === 'engine' ? 'avatar' : 'engine'));
    }, []);

    return (
        <Providers>
            {/* Splash screen — shown until all services are ready */}
            {!booted && <SplashScreen onReady={handleReady} />}

            {/* Global voice→action routing (always mounted) */}
            <VoiceCommandRouter />
            {/* Global webcam overlay (triggered by vision commands from anywhere) */}
            <GlobalWebcam />

            {/* Main app layers — render underneath so they're ready when splash fades */}
            <div style={{ opacity: booted ? 1 : 0, transition: 'opacity 0.5s ease' }}>
                {/* Both views always mounted — preloaded from boot for instant switching */}
                <div style={{ visibility: viewMode === 'engine' ? 'visible' : 'hidden' }}>
                    {/* Layer 0: Sketchfab Arc Reactor — full-screen transparent iframe */}
                    <SketchfabViewer />
                    {/* Layer 1: R3F overlay — particles, data panels, grid (transparent bg) */}
                    <SceneCanvas />
                </div>
                <div style={{ visibility: viewMode === 'avatar' ? 'visible' : 'hidden' }}>
                    {/* Avatar mode — anime girl, preloads in background */}
                    <AvatarView />
                </div>
                {/* Layer 2+: HUD chrome (always visible in both modes) */}
                <HUDOverlay />
                <PanelManager />
                <NotificationLayer />
                <VoiceOverlay />

                {/* Avatar toggle button — fixed bottom-right, offset left of mic button */}
                <button
                    onClick={toggleView}
                    title={viewMode === 'engine' ? 'Switch to Avatar' : 'Switch to Engine'}
                    style={{
                        position: 'fixed',
                        bottom: 24,
                        right: 80,
                        zIndex: 999,
                        width: 48,
                        height: 48,
                        borderRadius: '50%',
                        border: viewMode === 'avatar'
                            ? '2px solid rgba(255,105,180,0.7)'
                            : '2px solid rgba(0,221,255,0.5)',
                        background: viewMode === 'avatar'
                            ? 'rgba(255,105,180,0.15)'
                            : 'rgba(0,221,255,0.08)',
                        backdropFilter: 'blur(8px)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.3s ease',
                        boxShadow: viewMode === 'avatar'
                            ? '0 0 18px rgba(255,105,180,0.3)'
                            : '0 0 12px rgba(0,221,255,0.2)',
                    }}
                >
                    {viewMode === 'engine' ? (
                        /* Anime face icon */
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                            <circle cx="12" cy="10" r="8" stroke="#FF69B4" strokeWidth="1.5" fill="none"/>
                            <circle cx="9" cy="9" r="1.5" fill="#FF69B4"/>
                            <circle cx="15" cy="9" r="1.5" fill="#FF69B4"/>
                            <path d="M9.5 13 Q12 15.5 14.5 13" stroke="#FF69B4" strokeWidth="1.2" fill="none" strokeLinecap="round"/>
                            <path d="M6 5 Q8 2 12 3 Q16 2 18 5" stroke="#FF69B4" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
                            <line x1="5" y1="10" x2="3" y2="14" stroke="#FF69B4" strokeWidth="1.2" strokeLinecap="round"/>
                            <line x1="19" y1="10" x2="21" y2="14" stroke="#FF69B4" strokeWidth="1.2" strokeLinecap="round"/>
                        </svg>
                    ) : (
                        /* Engine/reactor icon */
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                            <circle cx="12" cy="12" r="4" stroke="#00DDFF" strokeWidth="1.5" fill="none"/>
                            <circle cx="12" cy="12" r="8" stroke="#00DDFF" strokeWidth="1" fill="none" opacity="0.5"/>
                            <circle cx="12" cy="12" r="2" fill="#00DDFF" opacity="0.6"/>
                            <line x1="12" y1="2" x2="12" y2="6" stroke="#00DDFF" strokeWidth="1" opacity="0.5"/>
                            <line x1="12" y1="18" x2="12" y2="22" stroke="#00DDFF" strokeWidth="1" opacity="0.5"/>
                            <line x1="2" y1="12" x2="6" y2="12" stroke="#00DDFF" strokeWidth="1" opacity="0.5"/>
                            <line x1="18" y1="12" x2="22" y2="12" stroke="#00DDFF" strokeWidth="1" opacity="0.5"/>
                        </svg>
                    )}
                </button>
            </div>

            {/* Agent Dashboard overlay */}
            {showDashboard && (
                <AgentDashboard onClose={() => setShowDashboard(false)} />
            )}
        </Providers>
    );
}
