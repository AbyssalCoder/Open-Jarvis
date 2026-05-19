import { useState, useRef, useEffect, useCallback } from 'react';

const MODEL_UID = 'd87547f21f904cfa954f4cf77a1409ac';
const SKETCHFAB_API_URL = 'https://static.sketchfab.com/api/sketchfab-viewer-1.12.1.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const Sketchfab: any;

/**
 * Embeds the Sketchfab Iron Man Arc Reactor model using the official
 * Viewer API.  The API gives us full control: transparent background,
 * no UI chrome, auto-start, and programmatic camera control.
 */
export function SketchfabViewer() {
    const [loaded, setLoaded] = useState(false);
    const [scriptReady, setScriptReady] = useState(false);
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const initCalled = useRef(false);

    // 1. Dynamically load the Sketchfab Viewer API script
    useEffect(() => {
        if (document.querySelector(`script[src="${SKETCHFAB_API_URL}"]`)) {
            setScriptReady(true);
            return;
        }
        const script = document.createElement('script');
        script.src = SKETCHFAB_API_URL;
        script.async = true;
        script.onload = () => setScriptReady(true);
        script.onerror = () => console.error('[JARVIS] Failed to load Sketchfab API');
        document.head.appendChild(script);
    }, []);

    // 2. Initialize the viewer once script + iframe are ready
    const initViewer = useCallback(() => {
        if (!scriptReady || !iframeRef.current || initCalled.current) return;
        if (typeof Sketchfab === 'undefined') return;
        initCalled.current = true;

        const client = new Sketchfab(iframeRef.current);

        client.init(MODEL_UID, {
            success: (api: {
                start: () => void;
                addEventListener: (event: string, cb: () => void) => void;
            }) => {
                api.start();
                api.addEventListener('viewerready', () => {
                    console.log('[JARVIS] Arc Reactor viewer ready');
                    setLoaded(true);
                });
            },
            error: () => {
                console.error('[JARVIS] Sketchfab viewer error');
            },

            // ── Viewer init options ──
            autostart: 1,
            transparent: 1,           // transparent background
            autospin: 0,
            camera: 0,
            preload: 1,
            scrollwheel: 0,

            // Hide ALL UI chrome
            ui_stop: 0,
            ui_inspector: 0,
            ui_hint: 0,
            ui_ar: 0,
            ui_help: 0,
            ui_settings: 0,
            ui_vr: 0,
            ui_fullscreen: 0,
            ui_annotations: 0,
            ui_infos: 0,
            ui_controls: 0,
            ui_watermark_link: 0,
            ui_watermark: 0,
            ui_color: '050A12',        // match JARVIS void black
            dnt: 1,
        });
    }, [scriptReady]);

    useEffect(() => { initViewer(); }, [initViewer]);

    // 3. Fallback: mark loaded after 12 s if viewer is very slow
    useEffect(() => {
        const t = setTimeout(() => setLoaded(true), 12000);
        return () => clearTimeout(t);
    }, []);

    return (
        <>
            {/* Loading overlay while Sketchfab loads */}
            {!loaded && (
                <div
                    style={{
                        position: 'fixed',
                        inset: 0,
                        zIndex: -1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: '#050A12',
                    }}
                >
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 16,
                    }}>
                        <div
                            style={{
                                width: 60,
                                height: 60,
                                border: '2px solid rgba(0,212,255,0.15)',
                                borderTop: '2px solid #00D4FF',
                                borderRadius: '50%',
                                animation: 'spin 1s linear infinite',
                            }}
                        />
                        <span style={{
                            fontFamily: 'monospace',
                            fontSize: 11,
                            color: '#0A84FF',
                            letterSpacing: 3,
                        }}>
                            LOADING ENGINE CORE
                        </span>
                    </div>
                </div>
            )}

            {/* Sketchfab iframe — the API will set its src automatically */}
            <iframe
                ref={iframeRef}
                id="sketchfab-viewer"
                title="JARVIS Engine Core"
                allow="autoplay; fullscreen; xr-spatial-tracking"
                allowFullScreen
                style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    width: '100vw',
                    height: '100vh',
                    border: 'none',
                    zIndex: -1,
                    // Allow interaction during load so the viewer can initialize;
                    // disable pointer events once loaded so clicks reach HUD/R3F.
                    pointerEvents: loaded ? 'none' : 'auto',
                    opacity: loaded ? 1 : 0,
                    transition: 'opacity 1.5s ease',
                }}
            />

            {/* keyframe for the spinner */}
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </>
    );
}
