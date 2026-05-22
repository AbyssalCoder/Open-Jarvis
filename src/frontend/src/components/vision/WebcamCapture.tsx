/**
 * Webcam Capture + Live YOLO Detection component.
 * Opens webcam, runs continuous YOLO detection with green bounding box overlays,
 * and provides an "Analyze" button for detailed AI analysis.
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Detection {
    label: string;
    confidence: number;
    x1: number; y1: number; x2: number; y2: number;
}

interface WebcamCaptureProps {
    query?: string;
    onResult: (result: string) => void;
    onClose: () => void;
}

const BACKEND_URL = 'http://localhost:8420';

const LABEL_COLORS: Record<string, string> = {
    person: '#00FF41', car: '#FF6600', dog: '#FF00FF', cat: '#00FFFF',
    phone: '#FFFF00', laptop: '#FF3366', bottle: '#33FF99', cup: '#FF9933',
    book: '#6699FF', chair: '#FF66CC', tv: '#66FFCC', keyboard: '#CC99FF',
};
function getLabelColor(label: string): string {
    return LABEL_COLORS[label] || '#00FF41';
}

export function WebcamCapture({ query = "Describe what you see", onResult, onClose }: WebcamCaptureProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const detectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [ready, setReady] = useState(false);
    const [analyzing, setAnalyzing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [status, setStatus] = useState('Initializing camera...');
    const [detections, setDetections] = useState<Detection[]>([]);
    const [autoAnalyzeCountdown, setAutoAnalyzeCountdown] = useState(6);
    const mountedRef = useRef(true);
    const detectingRef = useRef(false);
    const autoAnalyzeDone = useRef(false);

    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
            if (detectTimerRef.current) clearTimeout(detectTimerRef.current);
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(t => t.stop());
                streamRef.current = null;
            }
        };
    }, []);

    // Start webcam
    useEffect(() => {
        let cancelled = false;

        async function startWebcam() {
            try {
                setStatus('Requesting camera access...');

                if (!navigator.mediaDevices?.getUserMedia) {
                    setError('Camera not available in this environment');
                    return;
                }

                let mediaStream: MediaStream;
                try {
                    mediaStream = await navigator.mediaDevices.getUserMedia({
                        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
                        audio: false,
                    });
                } catch {
                    mediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
                }

                if (cancelled) { mediaStream.getTracks().forEach(t => t.stop()); return; }

                streamRef.current = mediaStream;
                if (videoRef.current) {
                    videoRef.current.srcObject = mediaStream;
                    videoRef.current.onloadedmetadata = () => {
                        videoRef.current?.play().then(() => {
                            if (!cancelled) {
                                setReady(true);
                                setStatus('Live detection active');
                            }
                        }).catch(() => { if (!cancelled) setError('Camera playback failed'); });
                    };
                }
            } catch (e) {
                if (!cancelled) setError(`Camera access denied: ${e}`);
            }
        }

        startWebcam();
        return () => { cancelled = true; };
    }, []);

    // Send frame to YOLO backend for detection
    const detectFrame = useCallback(async () => {
        if (detectingRef.current || !videoRef.current || !canvasRef.current || !streamRef.current) return;
        detectingRef.current = true;

        const video = videoRef.current;
        const canvas = canvasRef.current;
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;

        const ctx = canvas.getContext('2d');
        if (!ctx) { detectingRef.current = false; return; }
        ctx.drawImage(video, 0, 0);

        try {
            const blob = await new Promise<Blob | null>((resolve) =>
                canvas.toBlob(resolve, 'image/jpeg', 0.6)
            );
            if (!blob || !mountedRef.current) { detectingRef.current = false; return; }

            const isTauri = '__TAURI_INTERNALS__' in window;

            if (isTauri) {
                const { invoke } = await import('@tauri-apps/api/core');
                const arrayBuffer = await blob.arrayBuffer();
                const bytes = new Uint8Array(arrayBuffer);
                let binary = '';
                for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
                const imageBase64 = btoa(binary);

                const resultJson = await invoke<string>('proxy_vision_detect', { imageBase64 });
                const data = JSON.parse(resultJson);
                if (mountedRef.current) setDetections(data.detections || []);
            } else {
                const formData = new FormData();
                formData.append('file', blob, 'frame.jpg');
                const detectUrl = query && query !== 'Describe what you see'
                    ? `${BACKEND_URL}/api/vision/detect?query=${encodeURIComponent(query)}`
                    : `${BACKEND_URL}/api/vision/detect`;
                const resp = await fetch(detectUrl, {
                    method: 'POST',
                    body: formData,
                });
                if (resp.ok) {
                    const data = await resp.json();
                    if (mountedRef.current) setDetections(data.detections || []);
                }
            }
        } catch {
            // Silent — detection is best-effort
        } finally {
            detectingRef.current = false;
        }
    }, []);

    // Live detection loop (~2 FPS) — pass query for GroundingDINO routing
    useEffect(() => {
        if (!ready) return;

        const loop = () => {
            if (!mountedRef.current) return;
            detectFrame();
            detectTimerRef.current = setTimeout(loop, 500);
        };

        loop();
        return () => { if (detectTimerRef.current) clearTimeout(detectTimerRef.current); };
    }, [ready, detectFrame]);

    // Draw bounding boxes on overlay canvas
    useEffect(() => {
        const overlay = overlayCanvasRef.current;
        const video = videoRef.current;
        if (!overlay || !video) return;

        const rect = video.getBoundingClientRect();
        overlay.width = rect.width;
        overlay.height = rect.height;

        const ctx = overlay.getContext('2d');
        if (!ctx) return;
        ctx.clearRect(0, 0, overlay.width, overlay.height);

        const scaleX = overlay.width;
        const scaleY = overlay.height;

        for (const det of detections) {
            const x = det.x1 * scaleX;
            const y = det.y1 * scaleY;
            const w = (det.x2 - det.x1) * scaleX;
            const h = (det.y2 - det.y1) * scaleY;
            const color = getLabelColor(det.label);

            // Bounding box
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            ctx.strokeRect(x, y, w, h);

            // Corner accents
            const cornerLen = Math.min(w, h) * 0.2;
            ctx.lineWidth = 3;
            ctx.beginPath(); ctx.moveTo(x, y + cornerLen); ctx.lineTo(x, y); ctx.lineTo(x + cornerLen, y); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(x + w - cornerLen, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w, y + cornerLen); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(x, y + h - cornerLen); ctx.lineTo(x, y + h); ctx.lineTo(x + cornerLen, y + h); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(x + w - cornerLen, y + h); ctx.lineTo(x + w, y + h); ctx.lineTo(x + w, y + h - cornerLen); ctx.stroke();

            // Label background + text
            const label = `${det.label} ${Math.round(det.confidence * 100)}%`;
            ctx.font = 'bold 12px monospace';
            const textW = ctx.measureText(label).width + 10;
            ctx.fillStyle = color;
            ctx.fillRect(x, y + h + 2, textW, 18);
            ctx.fillStyle = '#000';
            ctx.fillText(label, x + 5, y + h + 15);
        }
    }, [detections]);

    // Full analysis (capture + YOLO + LLM)
    const captureAndAnalyze = useCallback(async () => {
        if (!videoRef.current || !canvasRef.current || !streamRef.current) return;
        setAnalyzing(true);
        setStatus('Running full AI analysis...');

        const video = videoRef.current;
        const canvas = canvasRef.current;
        canvas.width = video.videoWidth || 1280;
        canvas.height = video.videoHeight || 720;
        const ctx = canvas.getContext('2d');
        if (!ctx) { setAnalyzing(false); return; }
        ctx.drawImage(video, 0, 0);

        canvas.toBlob(async (blob) => {
            if (!blob) { setAnalyzing(false); return; }
            try {
                const isTauri = '__TAURI_INTERNALS__' in window;
                if (isTauri) {
                    const { invoke } = await import('@tauri-apps/api/core');
                    const arrayBuffer = await blob.arrayBuffer();
                    const bytes = new Uint8Array(arrayBuffer);
                    let binary = '';
                    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
                    const resultJson = await invoke<string>('proxy_vision', { imageBase64: btoa(binary), query });
                    const data = JSON.parse(resultJson);
                    onResult(data.result || 'No analysis returned');
                } else {
                    const formData = new FormData();
                    formData.append('file', blob, 'webcam-frame.jpg');
                    const resp = await fetch(`${BACKEND_URL}/api/vision/analyze?query=${encodeURIComponent(query)}`, {
                        method: 'POST', body: formData,
                    });
                    if (resp.ok) {
                        const data = await resp.json();
                        onResult(data.result || 'No analysis returned');
                    } else {
                        onResult('Vision analysis failed.');
                    }
                }
            } catch (e) {
                onResult(`Vision error: ${e}`);
            } finally {
                setAnalyzing(false);
                setStatus('Live detection active');
            }
        }, 'image/jpeg', 0.85);
    }, [query, onResult]);

    // Auto-analyze: countdown from 6s after webcam is ready, then auto-trigger
    useEffect(() => {
        if (!ready || autoAnalyzeDone.current) return;

        const interval = setInterval(() => {
            setAutoAnalyzeCountdown((prev) => {
                if (prev <= 1) {
                    clearInterval(interval);
                    if (!autoAnalyzeDone.current) {
                        autoAnalyzeDone.current = true;
                        const fillers = [
                            "Let me take a look...",
                            "Analyzing what I see...",
                            "Give me a moment to process this...",
                            "Scanning the scene...",
                            "Let me check what's in front of you...",
                        ];
                        const filler = fillers[Math.floor(Math.random() * fillers.length)];
                        window.dispatchEvent(new CustomEvent('jarvis:speak-filler', { detail: filler }));
                        captureAndAnalyze();
                    }
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [ready, captureAndAnalyze]);

    const handleClose = useCallback(() => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(t => t.stop());
            streamRef.current = null;
        }
        onClose();
    }, [onClose]);

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                style={{
                    position: 'fixed',
                    top: 0, left: 0, right: 0, bottom: 0,
                    zIndex: 9999,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'rgba(0, 0, 0, 0.9)',
                    backdropFilter: 'blur(8px)',
                }}
            >
                <div style={{
                    position: 'relative',
                    border: '2px solid #00FF41',
                    borderRadius: 12,
                    overflow: 'hidden',
                    boxShadow: '0 0 40px rgba(0, 255, 65, 0.2)',
                    maxWidth: '85vw',
                    maxHeight: '85vh',
                }}>
                    <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%', maxWidth: 900, display: 'block' }} />

                    {/* Bounding box overlay */}
                    <canvas ref={overlayCanvasRef} style={{
                        position: 'absolute', top: 0, left: 0,
                        width: '100%', height: '100%', pointerEvents: 'none',
                    }} />

                    <canvas ref={canvasRef} style={{ display: 'none' }} />

                    {/* Top bar */}
                    <div style={{
                        position: 'absolute', top: 0, left: 0, right: 0,
                        padding: '10px 16px',
                        background: 'linear-gradient(to bottom, rgba(0,0,0,0.8), transparent)',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <span style={{
                                color: ready ? '#00FF41' : '#FF9500',
                                fontFamily: 'monospace', fontSize: 11, letterSpacing: 2,
                            }}>
                                {ready ? '◉ LIVE DETECTION' : '◎ INITIALIZING'}
                            </span>
                            {ready && (
                                <span style={{
                                    color: '#00D4FF', fontFamily: 'monospace', fontSize: 10,
                                    background: 'rgba(0,212,255,0.1)', padding: '2px 8px',
                                    borderRadius: 4, border: '1px solid rgba(0,212,255,0.3)',
                                }}>
                                    {detections.length} object{detections.length !== 1 ? 's' : ''}
                                </span>
                            )}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <button
                                onClick={captureAndAnalyze}
                                disabled={analyzing || !ready}
                                style={{
                                    background: analyzing ? 'rgba(255,149,0,0.2)' : 'rgba(0,255,65,0.15)',
                                    border: `1px solid ${analyzing ? '#FF9500' : '#00FF41'}`,
                                    color: analyzing ? '#FF9500' : '#00FF41',
                                    padding: '4px 14px', borderRadius: 4, cursor: 'pointer',
                                    fontFamily: 'monospace', fontSize: 10, letterSpacing: 1,
                                }}
                            >
                                {analyzing ? '⟳ ANALYZING...' : autoAnalyzeCountdown > 0 && !autoAnalyzeDone.current ? `⚡ AUTO ${autoAnalyzeCountdown}s` : '⚡ ANALYZE'}
                            </button>
                            <button
                                onClick={handleClose}
                                style={{
                                    background: 'none', border: '1px solid #FF3B30',
                                    color: '#FF3B30', padding: '4px 12px', borderRadius: 4,
                                    cursor: 'pointer', fontFamily: 'monospace', fontSize: 10,
                                }}
                            >
                                ✕ CLOSE
                            </button>
                        </div>
                    </div>

                    {/* Bottom status */}
                    <div style={{
                        position: 'absolute', bottom: 0, left: 0, right: 0,
                        padding: '8px 16px',
                        background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    }}>
                        <span style={{ color: '#556677', fontFamily: 'monospace', fontSize: 9 }}>{status}</span>
                        <span style={{ color: '#334455', fontFamily: 'monospace', fontSize: 9 }}>
                            YOLO v8n • {detections.map(d => d.label).filter((v, i, a) => a.indexOf(v) === i).join(', ') || 'scanning...'}
                        </span>
                    </div>

                    {error && (
                        <div style={{
                            position: 'absolute', top: '50%', left: '50%',
                            transform: 'translate(-50%, -50%)',
                            color: '#FF3B30', fontFamily: 'monospace', fontSize: 12,
                            textAlign: 'center', padding: 20,
                            background: 'rgba(0,0,0,0.8)', borderRadius: 8,
                        }}>
                            {error}
                            <br />
                            <button onClick={handleClose} style={{
                                marginTop: 12, background: 'none',
                                border: '1px solid #FF3B30', color: '#FF3B30',
                                padding: '6px 16px', borderRadius: 4, cursor: 'pointer',
                                fontFamily: 'monospace', fontSize: 10,
                            }}>Close</button>
                        </div>
                    )}
                </div>
            </motion.div>
        </AnimatePresence>
    );
}
