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
    private synthesis: SpeechSynthesis;
    private preferredVoice: SpeechSynthesisVoice | null = null;
    private _onResult: ((text: string) => void) | null = null;

    constructor() {
        this.synthesis = window.speechSynthesis;
        this.initRecognition();
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
                store.setPartialTranscript(interimTranscript);
            }

            if (finalTranscript && this._onResult) {
                store.setPartialTranscript('');
                this._onResult(finalTranscript.trim());
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
            // Auto-restart if still in voice mode
            if (store.voiceActive && store.isListening) {
                try {
                    this.recognition?.start();
                } catch {
                    // Already started
                }
            }
        };
    }

    private loadVoice() {
        const loadVoices = () => {
            const voices = this.synthesis.getVoices();
            // Prefer a deep male English voice — JARVIS-like
            const preferred = [
                'Google UK English Male',
                'Microsoft David',
                'Microsoft Mark',
                'Daniel',
                'Google US English',
                'Alex',
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
            // Fallback: first English voice
            this.preferredVoice =
                voices.find((v) => v.lang.startsWith('en')) || null;
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
    }

    toggleListening() {
        const store = useVoiceStore.getState();
        if (store.isListening) {
            this.stopListening();
        } else {
            this.startListening();
        }
    }

    speak(text: string): Promise<void> {
        return new Promise((resolve) => {
            // Cancel any ongoing speech
            this.synthesis.cancel();

            const utterance = new SpeechSynthesisUtterance(text);
            if (this.preferredVoice) {
                utterance.voice = this.preferredVoice;
            }
            utterance.rate = 1.0;
            utterance.pitch = 0.9; // Slightly lower for JARVIS feel
            utterance.volume = 1.0;

            const store = useVoiceStore.getState();
            store.setTTSPlaying(true);

            utterance.onend = () => {
                store.setTTSPlaying(false);
                resolve();
            };

            utterance.onerror = () => {
                store.setTTSPlaying(false);
                resolve();
            };

            this.synthesis.speak(utterance);
        });
    }

    stopSpeaking() {
        this.synthesis.cancel();
        useVoiceStore.getState().setTTSPlaying(false);
    }
}

// Global singleton
export const voiceEngine = new VoiceEngine();
