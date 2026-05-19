import { useState, useEffect } from 'react';
import { useSystemStore, useAIStore } from '@/core/store';

/**
 * Cinematic HUD overlay — Iron Man style heads-up display.
 * Sits on top of the 3D canvas with status indicators, corners, and scan lines.
 */
export function HUDOverlay() {
    const wsConnected = useSystemStore((s) => s.wsConnected);
    const backendStatus = useSystemStore((s) => s.backendStatus);
    const isThinking = useAIStore((s) => s.isThinking);
    const activeModel = useAIStore((s) => s.activeModel);
    const [time, setTime] = useState(new Date());

    useEffect(() => {
        const id = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(id);
    }, []);

    const timeStr = time.toLocaleTimeString('en-US', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
    });

    return (
        <div
            className="fixed inset-0 pointer-events-none"
            style={{ zIndex: 30 }}
        >
            {/* Corner brackets */}
            <CornerBracket position="top-left" />
            <CornerBracket position="top-right" />
            <CornerBracket position="bottom-left" />
            <CornerBracket position="bottom-right" />

            {/* Top bar */}
            <div className="flex items-center justify-between px-8 py-4">
                {/* Left — JARVIS + status */}
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                        <span
                            className="font-mono text-sm font-bold tracking-[0.3em]"
                            style={{
                                color: '#0A84FF',
                                textShadow: '0 0 10px rgba(10,132,255,0.5)',
                            }}
                        >
                            JARVIS
                        </span>
                        <span
                            className="font-mono text-[9px] tracking-wider"
                            style={{ color: '#4a90d9' }}
                        >
                            OS
                        </span>
                    </div>
                    <StatusDot connected={wsConnected} />
                    <span
                        className="text-[10px] font-mono uppercase tracking-widest"
                        style={{
                            color: backendStatus === 'ready' ? '#30D158' : '#FF9500',
                        }}
                    >
                        {backendStatus}
                    </span>
                </div>

                {/* Center — thinking indicator */}
                <div className="flex items-center gap-2">
                    {isThinking && (
                        <div className="flex items-center gap-2">
                            <PulsingDots />
                            <span
                                className="text-xs font-mono tracking-[0.2em]"
                                style={{
                                    color: '#BF5AF2',
                                    textShadow: '0 0 8px rgba(191,90,242,0.4)',
                                }}
                            >
                                PROCESSING
                            </span>
                        </div>
                    )}
                </div>

                {/* Right — clock + model */}
                <div className="flex items-center gap-4">
                    {activeModel && (
                        <span className="text-[10px] font-mono" style={{ color: '#6688aa' }}>
                            [{activeModel.toUpperCase()}]
                        </span>
                    )}
                    <span
                        className="font-mono text-sm tracking-wider"
                        style={{
                            color: '#00D4FF',
                            textShadow: '0 0 6px rgba(0,212,255,0.3)',
                        }}
                    >
                        {timeStr}
                    </span>
                </div>
            </div>

            {/* Bottom bar */}
            <div className="absolute bottom-3 left-0 right-0 flex items-center justify-between px-8">
                <span className="text-[9px] font-mono tracking-[0.2em]" style={{ color: '#334455' }}>
                    JARVIS v0.1.0-alpha
                </span>
                <div className="flex items-center gap-4">
                    <MiniIndicator label="WS" ok={wsConnected} />
                    <MiniIndicator label="API" ok={backendStatus === 'ready'} />
                    <MiniIndicator label="LLM" ok={false} />
                </div>
                <span className="text-[9px] font-mono tracking-[0.2em]" style={{ color: '#334455' }}>
                    LOCAL-FIRST AI OS
                </span>
            </div>

            {/* Scan line animation */}
            <div
                className="absolute inset-0 pointer-events-none"
                style={{
                    background:
                        'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(10,132,255,0.015) 2px, rgba(10,132,255,0.015) 4px)',
                }}
            />
        </div>
    );
}

function StatusDot({ connected }: { connected: boolean }) {
    return (
        <div
            className={`w-2 h-2 rounded-full ${
                connected
                    ? 'bg-jarvis-growth-green shadow-[0_0_8px_rgba(48,209,88,0.6)]'
                    : 'bg-jarvis-signal-red shadow-[0_0_8px_rgba(255,59,48,0.6)]'
            }`}
        />
    );
}

function PulsingDots() {
    return (
        <div className="flex items-center gap-1">
            {[0, 1, 2].map((i) => (
                <div
                    key={i}
                    className="w-1 h-1 rounded-full"
                    style={{
                        background: '#BF5AF2',
                        animation: `pulse 1s ease-in-out ${i * 0.2}s infinite`,
                    }}
                />
            ))}
        </div>
    );
}

function MiniIndicator({ label, ok }: { label: string; ok: boolean }) {
    return (
        <div className="flex items-center gap-1.5">
            <div
                className="w-1 h-1 rounded-full"
                style={{
                    background: ok ? '#30D158' : '#555',
                    boxShadow: ok ? '0 0 4px #30D158' : 'none',
                }}
            />
            <span
                className="text-[8px] font-mono tracking-wider"
                style={{ color: ok ? '#6688aa' : '#445566' }}
            >
                {label}
            </span>
        </div>
    );
}

function CornerBracket({
    position,
}: {
    position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
}) {
    const size = 20;
    const styles: Record<string, React.CSSProperties> = {
        'top-left': {
            top: 8,
            left: 8,
            borderTop: '1px solid rgba(10,132,255,0.3)',
            borderLeft: '1px solid rgba(10,132,255,0.3)',
        },
        'top-right': {
            top: 8,
            right: 8,
            borderTop: '1px solid rgba(10,132,255,0.3)',
            borderRight: '1px solid rgba(10,132,255,0.3)',
        },
        'bottom-left': {
            bottom: 8,
            left: 8,
            borderBottom: '1px solid rgba(10,132,255,0.3)',
            borderLeft: '1px solid rgba(10,132,255,0.3)',
        },
        'bottom-right': {
            bottom: 8,
            right: 8,
            borderBottom: '1px solid rgba(10,132,255,0.3)',
            borderRight: '1px solid rgba(10,132,255,0.3)',
        },
    };

    return (
        <div
            className="absolute"
            style={{
                width: size,
                height: size,
                ...styles[position],
            }}
        />
    );
}
