import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { apiFetch } from '@/utils/tauriFetch';

interface BootStep {
    id: string;
    label: string;
    status: 'pending' | 'active' | 'done' | 'error';
}

const BOOT_STEPS: BootStep[] = [
    { id: 'init', label: 'Initializing JARVIS Core', status: 'pending' },
    { id: 'backend', label: 'Starting Backend Services', status: 'pending' },
    { id: 'ollama', label: 'Connecting Ollama AI Engine', status: 'pending' },
    { id: 'models', label: 'Loading AI Models', status: 'pending' },
    { id: 'ready', label: 'Systems Online', status: 'pending' },
];

const OLLAMA_URL = 'http://localhost:11434';

export function SplashScreen({ onReady }: { onReady: () => void }) {
    const [steps, setSteps] = useState<BootStep[]>(BOOT_STEPS);
    const [progress, setProgress] = useState(0);
    const [statusText, setStatusText] = useState('Initializing...');
    const [fadeOut, setFadeOut] = useState(false);

    const updateStep = useCallback((id: string, status: BootStep['status']) => {
        setSteps(prev => prev.map(s => s.id === id ? { ...s, status } : s));
    }, []);

    useEffect(() => {
        let cancelled = false;

        async function boot() {
            // Step 1: Init
            updateStep('init', 'active');
            setStatusText('Initializing JARVIS Core...');
            setProgress(5);
            await sleep(800);
            if (cancelled) return;
            updateStep('init', 'done');
            setProgress(15);

            // Step 2: Wait for Backend first (Tauri starts it automatically)
            updateStep('backend', 'active');
            setStatusText('Starting Backend Services...');
            setProgress(20);

            let backendReady = false;
            for (let i = 0; i < 60; i++) {
                if (cancelled) return;
                try {
                    const resp = await apiFetch('/health', { signal: AbortSignal.timeout(2000) });
                    if (resp.ok) { backendReady = true; break; }
                } catch { /* retry */ }
                setProgress(20 + Math.min(i, 25));
                if (i > 15) setStatusText('Backend is loading, please wait...');
                await sleep(750);
            }

            updateStep('backend', backendReady ? 'done' : 'error');
            setProgress(50);
            if (cancelled) return;

            // Step 3: Check Ollama (via backend proxy to avoid CORS issues)
            updateStep('ollama', 'active');
            setStatusText('Connecting to Ollama AI Engine...');
            setProgress(55);

            let ollamaReady = false;
            for (let i = 0; i < 40; i++) {
                if (cancelled) return;
                try {
                    // Try backend proxy first (works in Tauri, avoids CORS)
                    if (backendReady) {
                        const resp = await apiFetch('/api/ollama/status', { signal: AbortSignal.timeout(3000) });
                        if (resp.ok) {
                            const data = await resp.json();
                            if (data.status === 'ok') { ollamaReady = true; break; }
                        }
                    } else {
                        // Fallback: direct check (works in dev browser)
                        const resp = await fetch(`${OLLAMA_URL}/api/tags`, { signal: AbortSignal.timeout(2000) });
                        if (resp.ok) { ollamaReady = true; break; }
                    }
                } catch { /* retry */ }
                setProgress(55 + Math.min(i, 20));
                setStatusText(i > 10 ? 'Waiting for Ollama to start...' : 'Connecting to Ollama AI Engine...');
                await sleep(1000);
            }

            updateStep('ollama', ollamaReady ? 'done' : 'error');
            setProgress(80);
            if (cancelled) return;

            // Step 4: Models
            updateStep('models', 'active');
            setStatusText('Loading AI Models...');
            setProgress(85);

            if (backendReady) {
                try {
                    const resp = await apiFetch('/api/models', { signal: AbortSignal.timeout(5000) });
                    if (resp.ok) {
                        const data = await resp.json();
                        const modelCount = data?.models?.length || 0;
                        setStatusText(`${modelCount} model${modelCount !== 1 ? 's' : ''} loaded`);
                    }
                } catch { /* ignore */ }
            }

            await sleep(600);
            updateStep('models', 'done');
            setProgress(95);
            if (cancelled) return;

            // Step 5: Ready
            updateStep('ready', 'active');
            setStatusText('All systems operational');
            setProgress(100);
            await sleep(400);
            updateStep('ready', 'done');

            // Fade out
            await sleep(500);
            if (cancelled) return;
            setFadeOut(true);
            await sleep(1000);
            if (!cancelled) onReady();
        }

        boot();
        return () => { cancelled = true; };
    }, [onReady, updateStep]);

    return (
        <AnimatePresence>
            {!fadeOut && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.8 }}
                    style={{
                        position: 'fixed',
                        inset: 0,
                        zIndex: 9999,
                        background: 'radial-gradient(ellipse at center, #0a1628 0%, #050a12 60%, #000000 100%)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontFamily: "'Segoe UI', system-ui, sans-serif",
                        overflow: 'hidden',
                    }}
                >
                    {/* Background grid lines */}
                    <div style={{
                        position: 'absolute', inset: 0, opacity: 0.04,
                        backgroundImage: 'linear-gradient(rgba(0,212,255,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(0,212,255,0.3) 1px, transparent 1px)',
                        backgroundSize: '60px 60px',
                    }} />

                    {/* Scanning line animation */}
                    <motion.div
                        animate={{ top: ['-5%', '105%'] }}
                        transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                        style={{
                            position: 'absolute', left: 0, right: 0, height: '2px',
                            background: 'linear-gradient(90deg, transparent 0%, rgba(0,212,255,0.4) 30%, rgba(0,212,255,0.8) 50%, rgba(0,212,255,0.4) 70%, transparent 100%)',
                            boxShadow: '0 0 20px rgba(0,212,255,0.3)',
                        }}
                    />

                    {/* Hero Icon — Arc Reactor */}
                    <motion.div
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
                        style={{ position: 'relative', width: 200, height: 200, marginBottom: 48 }}
                    >
                        {/* Outer ring */}
                        <motion.svg
                            viewBox="0 0 200 200"
                            style={{ position: 'absolute', inset: 0 }}
                            animate={{ rotate: 360 }}
                            transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
                        >
                            <circle cx="100" cy="100" r="90" fill="none" stroke="rgba(0,212,255,0.15)" strokeWidth="1" />
                            <circle cx="100" cy="100" r="90" fill="none" stroke="rgba(0,212,255,0.6)" strokeWidth="2"
                                strokeDasharray="40 20 10 20" strokeLinecap="round" />
                        </motion.svg>

                        {/* Middle ring */}
                        <motion.svg
                            viewBox="0 0 200 200"
                            style={{ position: 'absolute', inset: 0 }}
                            animate={{ rotate: -360 }}
                            transition={{ duration: 15, repeat: Infinity, ease: 'linear' }}
                        >
                            <circle cx="100" cy="100" r="70" fill="none" stroke="rgba(10,132,255,0.4)" strokeWidth="1.5"
                                strokeDasharray="30 15 5 15" strokeLinecap="round" />
                        </motion.svg>

                        {/* Inner ring */}
                        <motion.svg
                            viewBox="0 0 200 200"
                            style={{ position: 'absolute', inset: 0 }}
                            animate={{ rotate: 360 }}
                            transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
                        >
                            <circle cx="100" cy="100" r="50" fill="none" stroke="rgba(0,212,255,0.5)" strokeWidth="2"
                                strokeDasharray="20 10" strokeLinecap="round" />
                        </motion.svg>

                        {/* Core glow */}
                        <motion.div
                            animate={{ scale: [1, 1.15, 1], opacity: [0.7, 1, 0.7] }}
                            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                            style={{
                                position: 'absolute',
                                left: '50%', top: '50%',
                                width: 40, height: 40,
                                transform: 'translate(-50%, -50%)',
                                borderRadius: '50%',
                                background: 'radial-gradient(circle, rgba(0,212,255,0.9) 0%, rgba(10,132,255,0.4) 50%, transparent 70%)',
                                boxShadow: '0 0 40px rgba(0,212,255,0.6), 0 0 80px rgba(0,212,255,0.3)',
                            }}
                        />

                        {/* Center dot */}
                        <div style={{
                            position: 'absolute',
                            left: '50%', top: '50%',
                            width: 10, height: 10,
                            transform: 'translate(-50%, -50%)',
                            borderRadius: '50%',
                            background: '#00D4FF',
                            boxShadow: '0 0 10px #00D4FF, 0 0 20px rgba(0,212,255,0.5)',
                        }} />

                        {/* Tick marks */}
                        {Array.from({ length: 12 }).map((_, i) => (
                            <div key={i} style={{
                                position: 'absolute',
                                left: '50%', top: '50%',
                                width: 2, height: i % 3 === 0 ? 12 : 6,
                                background: `rgba(0,212,255,${i % 3 === 0 ? 0.6 : 0.3})`,
                                transformOrigin: '50% 0',
                                transform: `translate(-50%, -85px) rotate(${i * 30}deg)`,
                            }} />
                        ))}
                    </motion.div>

                    {/* JARVIS text */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5, duration: 0.8 }}
                        style={{ textAlign: 'center', marginBottom: 48 }}
                    >
                        <h1 style={{
                            fontSize: 42,
                            fontWeight: 200,
                            letterSpacing: 16,
                            color: '#ffffff',
                            margin: 0,
                            textShadow: '0 0 30px rgba(0,212,255,0.3)',
                        }}>
                            J A R V I S
                        </h1>
                        <p style={{
                            fontSize: 11,
                            letterSpacing: 6,
                            color: 'rgba(0,212,255,0.6)',
                            marginTop: 8,
                            textTransform: 'uppercase',
                        }}>
                            Just A Rather Very Intelligent System
                        </p>
                    </motion.div>

                    {/* Progress bar */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.8 }}
                        style={{ width: 400, maxWidth: '80vw' }}
                    >
                        {/* Bar track */}
                        <div style={{
                            width: '100%', height: 3,
                            background: 'rgba(0,212,255,0.1)',
                            borderRadius: 2,
                            overflow: 'hidden',
                            position: 'relative',
                        }}>
                            <motion.div
                                animate={{ width: `${progress}%` }}
                                transition={{ duration: 0.6, ease: 'easeOut' }}
                                style={{
                                    height: '100%',
                                    background: 'linear-gradient(90deg, #0A84FF, #00D4FF)',
                                    borderRadius: 2,
                                    boxShadow: '0 0 12px rgba(0,212,255,0.5), 0 0 4px rgba(0,212,255,0.8)',
                                }}
                            />
                        </div>

                        {/* Progress percentage */}
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            marginTop: 10,
                            fontSize: 11,
                            color: 'rgba(255,255,255,0.4)',
                            letterSpacing: 2,
                        }}>
                            <span>{statusText}</span>
                            <span>{progress}%</span>
                        </div>
                    </motion.div>

                    {/* Boot steps checklist */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 1 }}
                        style={{
                            marginTop: 36,
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 6,
                            minWidth: 280,
                        }}
                    >
                        {steps.map((step) => (
                            <div key={step.id} style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 10,
                                fontSize: 12,
                                color: step.status === 'done' ? 'rgba(0,212,255,0.8)'
                                    : step.status === 'active' ? 'rgba(255,255,255,0.9)'
                                    : step.status === 'error' ? 'rgba(255,149,0,0.8)'
                                    : 'rgba(255,255,255,0.2)',
                                letterSpacing: 1,
                                transition: 'color 0.3s ease',
                            }}>
                                <span style={{ width: 16, textAlign: 'center', fontSize: 10 }}>
                                    {step.status === 'done' ? '✓' :
                                     step.status === 'active' ? '◆' :
                                     step.status === 'error' ? '!' : '○'}
                                </span>
                                <span>{step.label}</span>
                                {step.status === 'active' && (
                                    <motion.span
                                        animate={{ opacity: [0.3, 1, 0.3] }}
                                        transition={{ duration: 1.5, repeat: Infinity }}
                                        style={{ fontSize: 10, color: 'rgba(0,212,255,0.5)' }}
                                    >
                                        ...
                                    </motion.span>
                                )}
                            </div>
                        ))}
                    </motion.div>

                    {/* Bottom version text */}
                    <div style={{
                        position: 'absolute',
                        bottom: 24,
                        fontSize: 10,
                        color: 'rgba(255,255,255,0.15)',
                        letterSpacing: 3,
                    }}>
                        v0.1.0 · OPEN JARVIS · LOCAL-FIRST AI
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
