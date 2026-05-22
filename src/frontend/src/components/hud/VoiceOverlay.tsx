import { useVoiceStore } from '@/core/store';
import { voiceEngine } from '@/core/voice/VoiceEngine';

/**
 * Voice activation overlay — floating mic button + waveform + transcript.
 */
export function VoiceOverlay() {
    const voiceActive = useVoiceStore((s) => s.voiceActive);
    const isListening = useVoiceStore((s) => s.isListening);
    const ttsPlaying = useVoiceStore((s) => s.ttsPlaying);
    const transcript = useVoiceStore((s) => s.partialTranscript);
    const songMode = useVoiceStore((s) => s.songMode);

    if (!voiceEngine.isSupported) return null;

    return (
        <>
            {/* Floating mic button — always visible */}
            <div
                className="fixed bottom-6 right-6 z-[60] pointer-events-auto"
            >
                <button
                    onClick={() => voiceEngine.toggleListening()}
                    className="group relative w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300"
                    style={{
                        background: isListening
                            ? 'radial-gradient(circle, rgba(0,212,255,0.2), rgba(10,132,255,0.1))'
                            : 'rgba(13,21,32,0.8)',
                        border: `1px solid ${
                            isListening
                                ? 'rgba(0,212,255,0.5)'
                                : 'rgba(10,132,255,0.2)'
                        }`,
                        boxShadow: isListening
                            ? '0 0 20px rgba(0,212,255,0.3), 0 0 40px rgba(0,212,255,0.1)'
                            : '0 0 10px rgba(10,132,255,0.1)',
                    }}
                    title={isListening ? 'Stop listening' : 'Start voice input'}
                >
                    {/* Pulsing ring when listening */}
                    {isListening && (
                        <div
                            className="absolute inset-0 rounded-full"
                            style={{
                                border: '1px solid rgba(0,212,255,0.3)',
                                animation: 'ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite',
                            }}
                        />
                    )}
                    <MicIcon active={isListening} />
                </button>

                {/* TTS indicator */}
                {ttsPlaying && (
                    <div
                        className="absolute -top-2 -right-2 w-5 h-5 rounded-full flex items-center justify-center"
                        style={{
                            background: 'rgba(191,90,242,0.3)',
                            border: '1px solid rgba(191,90,242,0.5)',
                        }}
                    >
                        <SpeakerIcon />
                    </div>
                )}
            </div>

            {/* Transcript popup when listening */}
            {voiceActive && (
                <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[60] pointer-events-none">
                    <div
                        className="glass-panel px-6 py-3 flex flex-col items-center gap-2"
                        style={{
                            minWidth: 200,
                            maxWidth: 500,
                            boxShadow: '0 0 30px rgba(0,212,255,0.1)',
                        }}
                    >
                        {/* Waveform dots */}
                        <div className="flex items-center gap-1 h-4">
                            {[0, 1, 2, 3, 4].map((i) => (
                                <div
                                    key={i}
                                    className="w-0.5 rounded-full"
                                    style={{
                                        background: '#00D4FF',
                                        height: isListening ? undefined : 4,
                                        animation: isListening
                                            ? `waveform 0.8s ease-in-out ${i * 0.1}s infinite alternate`
                                            : 'none',
                                    }}
                                />
                            ))}
                        </div>

                        {transcript ? (
                            <p
                                className="text-sm text-center"
                                style={{ color: '#a0b8d0', fontFamily: 'monospace' }}
                            >
                                {transcript}
                            </p>
                        ) : (
                            <p
                                className="text-xs"
                                style={{ color: '#6688aa', fontFamily: 'monospace' }}
                            >
                                Listening...
                            </p>
                        )}

                        <span
                            className="text-[9px] font-mono tracking-[0.2em]"
                            style={{
                                color: songMode ? '#FF69B4' : isListening ? '#00D4FF' : '#FF9500',
                            }}
                        >
                            {songMode ? '🎵 SONG MODE — SING NOW' : isListening ? 'VOICE ACTIVE' : 'PROCESSING'}
                        </span>

                        {/* Song mode done button */}
                        {songMode && (
                            <button
                                onClick={() => voiceEngine.exitSongMode()}
                                className="pointer-events-auto"
                                style={{
                                    marginTop: 4,
                                    background: 'rgba(255,105,180,0.15)',
                                    border: '1px solid rgba(255,105,180,0.4)',
                                    color: '#FF69B4',
                                    padding: '3px 12px',
                                    borderRadius: 4,
                                    cursor: 'pointer',
                                    fontFamily: 'monospace',
                                    fontSize: 9,
                                    letterSpacing: 1,
                                }}
                            >
                                DONE SINGING
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Keyframe styles */}
            <style>{`
                @keyframes waveform {
                    from { height: 4px; }
                    to { height: 16px; }
                }
            `}</style>
        </>
    );
}

function MicIcon({ active }: { active: boolean }) {
    return (
        <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke={active ? '#00D4FF' : '#0A84FF'}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            <line x1="12" y1="19" x2="12" y2="23" />
            <line x1="8" y1="23" x2="16" y2="23" />
        </svg>
    );
}

function SpeakerIcon() {
    return (
        <svg
            width="10"
            height="10"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#BF5AF2"
            strokeWidth="2"
        >
            <path d="M11 5L6 9H2v6h4l5 4V5z" />
            <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
        </svg>
    );
}
