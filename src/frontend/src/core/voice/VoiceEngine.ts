/**
 * Voice Engine — Web Speech API integration for STT + TTS.
 * Works directly in the browser. No backend voice deps needed.
 *
 * - STT: SpeechRecognition (continuous, interim results)
 * - TTS: SpeechSynthesis with JARVIS-like voice selection
 */

import { useVoiceStore } from '@/core/store';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SpeechRecognitionAny = any;

class VoiceEngine {
    private recognition: SpeechRecognitionAny = null;
    private wakeRecognition: SpeechRecognitionAny = null;
    private synthesis: SpeechSynthesis;
    private preferredVoice: SpeechSynthesisVoice | null = null;
    private _onResult: ((text: string) => void) | null = null;
    private wakeListening = false;
    private songTimer: ReturnType<typeof setTimeout> | null = null;
    private _songBuffer = '';

    // Song mode triggers
    private static SONG_TRIGGERS = [
        'identify this song', 'identify the song', 'what song is this',
        'recognize this song', 'which song', 'name this song',
        'guess the song', 'listen to this song', 'can you identify',
        'do you know this song', 'what am i singing', 'what am i humming',
        'listen to me sing', 'i will sing', "i'm going to sing", "i'll sing",
        'let me sing', 'hear me sing',
    ];

    // Sing request triggers (user wants JARVIS to sing)
    private static SING_REQUEST_TRIGGERS = [
        'sing ', 'sing me ', 'can you sing', 'please sing',
        'sing a song', 'sing for me', 'sing something',
    ];

    // Wake words that activate JARVIS
    private static WAKE_WORDS = [
        'wake up jarvis', 'arise', 'wakey wakey', 'hey jarvis',
        'jarvis', 'hey', 'wake up',
    ];

    constructor() {
        this.synthesis = window.speechSynthesis;
        this.initRecognition();
        this.initWakeWordListener();
        this.loadVoice();
    }

    private initRecognition() {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const win = window as any;
        const SpeechRecognitionCtor = win.SpeechRecognition || win.webkitSpeechRecognition;

        if (!SpeechRecognitionCtor) {
            console.warn('[Voice] SpeechRecognition not supported');
            return;
        }

        this.recognition = new SpeechRecognitionCtor();
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.recognition.lang = 'en-US';

        this.recognition.onresult = (event: SpeechRecognitionAny) => {
            const store = useVoiceStore.getState();
            let interimTranscript = '';
            let finalTranscript = '';

            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    finalTranscript += transcript;
                } else {
                    interimTranscript += transcript;
                }
            }

            if (interimTranscript) {
                store.setPartialTranscript(
                    store.songMode ? `🎵 ${this._songBuffer} ${interimTranscript}` : interimTranscript
                );
            }

            if (finalTranscript) {
                const trimmed = finalTranscript.trim();
                if (!trimmed) return;

                // Check if this is a song mode trigger
                const lower = trimmed.toLowerCase();
                const isSongTrigger = VoiceEngine.SONG_TRIGGERS.some(t => lower.includes(t));

                if (isSongTrigger && !store.songMode) {
                    // Enter song mode — tell user to start singing
                    console.log('[Voice] Song mode activated');
                    store.setSongMode(true);
                    this._songBuffer = '';
                    store.setPartialTranscript('🎵 Listening to your song... sing away!');
                    // Speak confirmation
                    this.speak("Go ahead darling, I'm listening! Sing your heart out and I'll figure it out. hehe");
                    return;
                }

                // If in song mode, buffer the lyrics
                if (store.songMode) {
                    this._songBuffer += (this._songBuffer ? ' ... ' : '') + trimmed;
                    store.appendSongBuffer(trimmed);
                    store.setPartialTranscript(`🎵 ${this._songBuffer}`);
                    console.log('[Voice] Song buffer:', this._songBuffer);

                    // Reset the silence timer — wait 6 seconds of silence before sending
                    if (this.songTimer) clearTimeout(this.songTimer);
                    this.songTimer = setTimeout(() => {
                        this._finishSongMode();
                    }, 6000);
                    return;
                }

                // Normal mode — check if user wants JARVIS to sing
                const isSingRequest = VoiceEngine.SING_REQUEST_TRIGGERS.some(t => lower.includes(t));
                if (isSingRequest) {
                    // Pass directly — brain.py handles [SING] prefix
                    store.setPartialTranscript('');
                    if (this._onResult) this._onResult(trimmed);
                    return;
                }

                // Normal result
                store.setPartialTranscript('');
                if (this._onResult) this._onResult(trimmed);
            }
        };

        this.recognition.onerror = (event: SpeechRecognitionAny) => {
            console.warn('[Voice] Recognition error:', event.error);
            if (event.error !== 'no-speech') {
                this.stopListening();
            }
        };

        this.recognition.onend = () => {
            const store = useVoiceStore.getState();
            // Auto-restart if still in voice mode AND TTS is not playing
            if (store.voiceActive && store.isListening && !store.ttsPlaying) {
                // Small delay to avoid rapid restart loops
                setTimeout(() => {
                    const s = useVoiceStore.getState();
                    if (s.voiceActive && s.isListening && !s.ttsPlaying) {
                        try {
                            this.recognition?.start();
                        } catch {
                            // Already started or context issue — retry once more
                            setTimeout(() => {
                                try { this.recognition?.start(); } catch { /* give up */ }
                            }, 500);
                        }
                    }
                }, 100);
            }
        };
    }

    private initWakeWordListener() {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const win = window as any;
        const SpeechRecognitionCtor = win.SpeechRecognition || win.webkitSpeechRecognition;
        if (!SpeechRecognitionCtor) return;

        this.wakeRecognition = new SpeechRecognitionCtor();
        this.wakeRecognition.continuous = true;
        this.wakeRecognition.interimResults = true;
        this.wakeRecognition.lang = 'en-US';

        this.wakeRecognition.onresult = (event: SpeechRecognitionAny) => {
            const store = useVoiceStore.getState();
            // Don't process wake words if already actively listening
            if (store.isListening) return;

            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript.toLowerCase().trim();
                const isWake = VoiceEngine.WAKE_WORDS.some(w => transcript.includes(w));

                if (isWake && event.results[i].isFinal) {
                    console.log('[Voice] Wake word detected:', transcript);
                    // Stop wake listener, start active listening
                    this.stopWakeWordListener();
                    this.startListening();

                    // Play a subtle activation sound / speak a greeting
                    const greetings = [
                        "Yes sir?",
                        "I'm here, darling.",
                        "At your service.",
                        "Awake and ready, sir.",
                        "You called? hehe",
                    ];
                    const greeting = greetings[Math.floor(Math.random() * greetings.length)];
                    // Dispatch a wake event so the UI can show it
                    window.dispatchEvent(new CustomEvent('jarvis:wake', { detail: { greeting } }));
                    break;
                }
            }
        };

        this.wakeRecognition.onerror = (event: SpeechRecognitionAny) => {
            if (event.error !== 'no-speech' && event.error !== 'aborted') {
                console.warn('[Voice] Wake listener error:', event.error);
            }
        };

        this.wakeRecognition.onend = () => {
            const store = useVoiceStore.getState();
            // Auto-restart wake listener if not actively listening
            if (this.wakeListening && !store.isListening && !store.ttsPlaying) {
                try {
                    setTimeout(() => {
                        if (this.wakeListening) {
                            this.wakeRecognition?.start();
                        }
                    }, 500);
                } catch {
                    // Already started
                }
            }
        };

        // Auto-start wake word listener after a short delay
        setTimeout(() => this.startWakeWordListener(), 3000);
    }

    startWakeWordListener() {
        if (!this.wakeRecognition || this.wakeListening) return;
        const store = useVoiceStore.getState();
        if (store.isListening) return; // Don't start if already actively listening

        this.wakeListening = true;
        try {
            this.wakeRecognition.start();
            console.log('[Voice] Wake word listener started');
        } catch {
            // Already started
        }
    }

    stopWakeWordListener() {
        this.wakeListening = false;
        try {
            this.wakeRecognition?.stop();
        } catch {
            // Already stopped
        }
    }

    private loadVoice() {
        const loadVoices = () => {
            const voices = this.synthesis.getVoices();
            // Prefer natural-sounding female voices (newer neural voices first)
            // Microsoft's newer voices (Jenny, Aria, Sara) sound much more natural
            // than older ones (Zira). Google UK Female is also smooth and expressive.
            const preferred = [
                'Microsoft Jenny',       // Neural voice — warm, natural, expressive
                'Microsoft Aria',        // Neural voice — confident, smooth
                'Microsoft Sara',        // Neural voice — soft, pleasant
                'Google UK English Female', // Smooth British accent — fits FRIDAY
                'Microsoft Hazel',       // UK female — sophisticated
                'Microsoft Zira',        // Classic Windows female (last resort)
                'Samantha',              // macOS — smooth, natural
                'Karen',                 // macOS Australian — warm
                'Fiona',                 // macOS UK female — elegant
                'Moira',                 // macOS Irish female — charming
            ];
            for (const name of preferred) {
                const found = voices.find(
                    (v) => v.name.includes(name) && v.lang.startsWith('en')
                );
                if (found) {
                    this.preferredVoice = found;
                    console.log('[Voice] Selected TTS voice:', found.name);
                    return;
                }
            }
            // Fallback: find any female-sounding English voice
            const englishVoices = voices.filter((v) => v.lang.startsWith('en'));
            const femaleHints = ['female', 'woman', 'jenny', 'aria', 'sara', 'zira', 'hazel', 'susan', 'eva', 'emma', 'linda', 'samantha', 'karen', 'fiona', 'moira'];
            const femaleVoice = englishVoices.find((v) =>
                femaleHints.some((h) => v.name.toLowerCase().includes(h))
            );
            this.preferredVoice = femaleVoice || englishVoices[0] || null;
            if (this.preferredVoice) {
                console.log('[Voice] Selected TTS voice (fallback):', this.preferredVoice.name);
            }
        };

        loadVoices();
        this.synthesis.onvoiceschanged = loadVoices;
    }

    get isSupported(): boolean {
        return this.recognition !== null;
    }

    onResult(cb: (text: string) => void) {
        this._onResult = cb;
    }

    /** Finish song mode — send buffered lyrics to the AI for identification */
    private _finishSongMode() {
        const store = useVoiceStore.getState();
        const lyrics = this._songBuffer.trim();
        console.log('[Voice] Song mode finished, lyrics:', lyrics);

        store.setSongMode(false);
        store.setSongBuffer('');
        store.setPartialTranscript('');
        this._songBuffer = '';
        if (this.songTimer) { clearTimeout(this.songTimer); this.songTimer = null; }

        if (lyrics && this._onResult) {
            // Send as a song identification request
            this._onResult(`Identify this song from these lyrics: ${lyrics}`);
        }
    }

    /** Manually enter song listening mode */
    enterSongMode() {
        const store = useVoiceStore.getState();
        store.setSongMode(true);
        this._songBuffer = '';
        store.setPartialTranscript('🎵 Listening... sing or hum your song!');
        // Start listening if not already
        if (!store.isListening) {
            this.startListening();
        }
    }

    /** Cancel song mode without sending */
    exitSongMode() {
        // If there's buffered content, send it before exiting
        if (this._songBuffer.trim()) {
            this._finishSongMode();
        } else {
            const store = useVoiceStore.getState();
            store.setSongMode(false);
            store.setSongBuffer('');
            store.setPartialTranscript('');
            this._songBuffer = '';
            if (this.songTimer) { clearTimeout(this.songTimer); this.songTimer = null; }
        }
    }

    startListening() {
        if (!this.recognition) return;

        const store = useVoiceStore.getState();
        store.setVoiceActive(true);
        store.setListening(true);
        store.setPartialTranscript('');

        try {
            this.recognition.start();
        } catch {
            // Already started
        }
    }

    stopListening() {
        const store = useVoiceStore.getState();
        store.setListening(false);
        store.setVoiceActive(false);
        store.setPartialTranscript('');

        try {
            this.recognition?.stop();
        } catch {
            // Already stopped
        }

        // Restart wake word listener after stopping active listening
        setTimeout(() => this.startWakeWordListener(), 1000);
    }

    toggleListening() {
        const store = useVoiceStore.getState();
        if (store.isListening) {
            this.stopListening();
        } else {
            this.startListening();
        }
    }

    /**
     * Sanitize text for TTS — strip markdown, special chars, code blocks
     * so the voice doesn't read out asterisks, hashes, backticks, etc.
     */
    private sanitizeForSpeech(text: string): string {
        let clean = text;
        // Remove code blocks
        clean = clean.replace(/```[\s\S]*?```/g, 'code block omitted');
        // Remove inline code backticks
        clean = clean.replace(/`([^`]+)`/g, '$1');
        // Remove markdown bold/italic markers
        clean = clean.replace(/\*{1,3}([^*]+)\*{1,3}/g, '$1');
        clean = clean.replace(/_{1,3}([^_]+)_{1,3}/g, '$1');
        // Remove markdown headers
        clean = clean.replace(/^#{1,6}\s*/gm, '');
        // Remove markdown links — keep display text
        clean = clean.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
        // Remove bullet points and list markers
        clean = clean.replace(/^[\s]*[-*+]\s/gm, '');
        clean = clean.replace(/^[\s]*\d+\.\s/gm, '');
        // Remove HTML tags
        clean = clean.replace(/<[^>]+>/g, '');
        // Remove remaining special characters that sound bad when read
        clean = clean.replace(/[~|><{}\[\]\\]/g, '');
        // Collapse multiple spaces/newlines
        clean = clean.replace(/\n{2,}/g, '. ');
        clean = clean.replace(/\n/g, ' ');
        clean = clean.replace(/\s{2,}/g, ' ');
        return clean.trim();
    }

    private audioElement: HTMLAudioElement | null = null;
    private currentAudioUrl: string | null = null;

    /**
     * Speak using high-quality neural TTS from backend (edge-tts).
     * Falls back to Web Speech API if backend is unavailable.
     */
    async speak(text: string, singing = false): Promise<void> {
        // Cancel any ongoing speech
        this.stopSpeaking();

        const store = useVoiceStore.getState();
        const wasListening = store.isListening;
        if (wasListening) {
            try { this.recognition?.stop(); } catch { /* ok */ }
        }

        const cleanText = this.sanitizeForSpeech(text);
        if (!cleanText) return;

        store.setTTSPlaying(true);

        const resumeMic = () => {
            store.setTTSPlaying(false);
            if (wasListening && store.voiceActive) {
                setTimeout(() => {
                    try { this.recognition?.start(); } catch { /* ok */ }
                }, 300);
            } else {
                // Restart wake word listener after TTS finishes
                setTimeout(() => this.startWakeWordListener(), 500);
            }
        };

        try {
            // Try neural TTS via backend
            await this.speakNeural(cleanText, resumeMic, singing);
        } catch {
            // Fallback to Web Speech API
            this.speakFallback(cleanText, resumeMic);
        }
    }

    private speakNeural(text: string, onDone: () => void, singing = false): Promise<void> {
        return new Promise((resolve, reject) => {
            const isTauri = '__TAURI_INTERNALS__' in window;

            if (isTauri) {
                // Use Tauri IPC proxy to bypass mixed-content blocking
                import('@tauri-apps/api/core').then(({ invoke }) => {
                    invoke<string>('proxy_tts', { text, singing })
                        .then((base64Audio) => {
                            // Decode base64 to audio blob
                            const binaryStr = atob(base64Audio);
                            const bytes = new Uint8Array(binaryStr.length);
                            for (let i = 0; i < binaryStr.length; i++) {
                                bytes[i] = binaryStr.charCodeAt(i);
                            }
                            const blob = new Blob([bytes], { type: 'audio/mpeg' });

                            if (this.currentAudioUrl) {
                                URL.revokeObjectURL(this.currentAudioUrl);
                            }
                            this.currentAudioUrl = URL.createObjectURL(blob);
                            this.audioElement = new Audio(this.currentAudioUrl);
                            this.audioElement.volume = 1.0;
                            this.audioElement.onended = () => { onDone(); resolve(); };
                            this.audioElement.onerror = () => { onDone(); reject(new Error('Audio playback failed')); };
                            this.audioElement.play().catch(() => { onDone(); reject(new Error('Audio play blocked')); });
                        })
                        .catch((err) => {
                            console.warn('[Voice] Tauri TTS proxy failed:', err);
                            reject(err);
                        });
                }).catch(reject);
            } else {
                // Browser mode — direct fetch
                const backendUrl = 'http://localhost:8420';
                fetch(`${backendUrl}/api/tts`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ text, singing }),
                })
                .then((resp) => {
                    if (!resp.ok) throw new Error('TTS backend unavailable');
                    return resp.blob();
                })
                .then((blob) => {
                    if (this.currentAudioUrl) {
                        URL.revokeObjectURL(this.currentAudioUrl);
                    }
                    this.currentAudioUrl = URL.createObjectURL(blob);
                    this.audioElement = new Audio(this.currentAudioUrl);
                    this.audioElement.volume = 1.0;
                    this.audioElement.onended = () => { onDone(); resolve(); };
                    this.audioElement.onerror = (e) => {
                        console.warn('[Voice] Neural audio error, falling back:', e);
                        onDone(); reject(new Error('Audio playback failed'));
                    };
                    this.audioElement.play().catch((e) => {
                        console.warn('[Voice] Audio play blocked:', e);
                        onDone(); reject(new Error('Audio play blocked'));
                    });
                })
                .catch((err) => reject(err));
            }
        });
    }

    private speakFallback(text: string, onDone: () => void) {
        this.synthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        if (this.preferredVoice) {
            utterance.voice = this.preferredVoice;
        }
        utterance.rate = 0.95;
        utterance.pitch = 1.15;
        utterance.volume = 1.0;

        utterance.onend = onDone;
        utterance.onerror = onDone;
        this.synthesis.speak(utterance);
    }

    stopSpeaking() {
        // Stop neural audio
        if (this.audioElement) {
            this.audioElement.pause();
            this.audioElement.currentTime = 0;
            this.audioElement = null;
        }
        if (this.currentAudioUrl) {
            URL.revokeObjectURL(this.currentAudioUrl);
            this.currentAudioUrl = null;
        }
        // Stop Web Speech API
        this.synthesis.cancel();
        useVoiceStore.getState().setTTSPlaying(false);
    }
}

// Global singleton
export const voiceEngine = new VoiceEngine();
