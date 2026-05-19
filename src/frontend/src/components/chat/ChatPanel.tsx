import { useState, useRef, useEffect, useCallback, type FormEvent } from 'react';
import { useAIStore } from '@/core/store';
import { voiceEngine } from '@/core/voice/VoiceEngine';

const API_BASE = 'http://localhost:8420';

/** Strip markdown formatting so TTS reads clean text */
function stripMarkdown(text: string): string {
    return text
        .replace(/```[\s\S]*?```/g, ' code block omitted ')  // code blocks
        .replace(/`([^`]+)`/g, '$1')          // inline code
        .replace(/\*\*\*(.+?)\*\*\*/g, '$1')  // bold italic
        .replace(/\*\*(.+?)\*\*/g, '$1')      // bold
        .replace(/\*(.+?)\*/g, '$1')          // italic
        .replace(/__(.+?)__/g, '$1')          // underline bold
        .replace(/_(.+?)_/g, '$1')            // italic underscore
        .replace(/~~(.+?)~~/g, '$1')          // strikethrough
        .replace(/^#{1,6}\s+/gm, '')          // headings
        .replace(/^\s*[-*+]\s+/gm, '')        // bullet points
        .replace(/^\s*\d+\.\s+/gm, '')        // numbered lists
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // links
        .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1') // images
        .replace(/^\s*>\s+/gm, '')            // blockquotes
        .replace(/\|/g, ', ')                 // table pipes
        .replace(/---+/g, '')                 // horizontal rules
        .replace(/TOOL_CALL:.*$/gm, '')       // tool call lines
        .replace(/\n{3,}/g, '\n\n')           // excessive newlines
        .trim();
}

interface Message {
    role: 'user' | 'assistant';
    content: string;
}

/**
 * Primary chat interface panel.
 * Uses HTTP SSE streaming to the backend /api/chat endpoint.
 * Integrates with voice engine for STT input and TTS output.
 */
export function ChatPanel() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [streaming, setStreaming] = useState('');
    const isThinking = useAIStore((s) => s.isThinking);
    const bottomRef = useRef<HTMLDivElement>(null);

    // Auto-scroll on new content
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, streaming]);

    const sendMessage = useCallback(
        async (text: string) => {
            const trimmed = text.trim();
            if (!trimmed) return;

            setMessages((prev) => [...prev, { role: 'user', content: trimmed }]);
            setInput('');
            useAIStore.getState().setThinking(true);
            setStreaming('');

            try {
                const resp = await fetch(`${API_BASE}/api/chat`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ message: trimmed }),
                });

                if (!resp.ok || !resp.body) {
                    throw new Error(`HTTP ${resp.status}`);
                }

                const reader = resp.body.getReader();
                const decoder = new TextDecoder();
                let fullResponse = '';
                let buffer = '';

                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    buffer += decoder.decode(value, { stream: true });
                    const lines = buffer.split('\n');
                    buffer = lines.pop() || '';

                    for (const line of lines) {
                        if (!line.startsWith('data: ')) continue;
                        try {
                            const data = JSON.parse(line.slice(6));
                            if (data.type === 'token' && data.token) {
                                fullResponse += data.token;
                                setStreaming(fullResponse);
                            } else if (data.type === 'error') {
                                fullResponse += data.token || '[Error]';
                                setStreaming(fullResponse);
                            }
                        } catch {
                            // skip malformed
                        }
                    }
                }

                // Commit response (clean up TOOL_CALL artifacts)
                if (fullResponse) {
                    const cleanDisplay = fullResponse.replace(/TOOL_CALL:\s*\{.*?\}/gs, '').trim();
                    setMessages((prev) => [
                        ...prev,
                        { role: 'assistant', content: cleanDisplay || fullResponse },
                    ]);
                    setStreaming('');

                    // TTS: speak the response (strip markdown first)
                    voiceEngine.speak(stripMarkdown(fullResponse));
                }
            } catch (err) {
                const isNetworkError = err instanceof TypeError && err.message === 'Failed to fetch';
                const errMsg = isNetworkError
                    ? 'Backend is not running. Please start it first:\n\ncd src/backend\npython main.py\n\nThen also make sure Ollama is running (ollama serve).'
                    : `[Connection error: ${err instanceof Error ? err.message : 'unknown'}]`;
                setMessages((prev) => [
                    ...prev,
                    { role: 'assistant', content: errMsg },
                ]);
                setStreaming('');
            } finally {
                useAIStore.getState().setThinking(false);
            }
        },
        []
    );

    // Wire voice input → send message
    useEffect(() => {
        voiceEngine.onResult((text) => {
            sendMessage(text);
        });
    }, [sendMessage]);

    function handleSubmit(e: FormEvent) {
        e.preventDefault();
        sendMessage(input);
    }

    const isBusy = isThinking || streaming.length > 0;

    return (
        <div className="flex flex-col h-full">
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.length === 0 && !streaming && (
                    <div className="flex flex-col items-center justify-center h-full opacity-40">
                        <div
                            className="text-2xl mb-2"
                            style={{
                                color: '#0A84FF',
                                textShadow: '0 0 20px rgba(10,132,255,0.3)',
                            }}
                        >
                            ◆
                        </div>
                        <p className="text-xs font-mono text-gray-500">
                            Ask JARVIS anything
                        </p>
                        <p className="text-[10px] font-mono text-gray-600 mt-1">
                            Type or click the mic button
                        </p>
                    </div>
                )}

                {messages.map((msg, i) => (
                    <div
                        key={i}
                        className={`text-sm ${
                            msg.role === 'user'
                                ? 'text-gray-300'
                                : 'text-jarvis-arctic-white'
                        }`}
                    >
                        <span
                            className="text-[10px] font-mono block mb-0.5"
                            style={{
                                color:
                                    msg.role === 'user' ? '#6688aa' : '#0A84FF',
                            }}
                        >
                            {msg.role === 'user' ? '◇ YOU' : '◆ JARVIS'}
                        </span>
                        <p className="whitespace-pre-wrap leading-relaxed">
                            {msg.content}
                        </p>
                    </div>
                ))}

                {/* Streaming */}
                {streaming && (
                    <div className="text-sm text-jarvis-arctic-white">
                        <span
                            className="text-[10px] font-mono block mb-0.5"
                            style={{ color: '#0A84FF' }}
                        >
                            ◆ JARVIS
                        </span>
                        <p className="whitespace-pre-wrap leading-relaxed">
                            {streaming}
                            <span className="inline-block w-1.5 h-4 ml-0.5 bg-jarvis-core-blue/60 animate-pulse" />
                        </p>
                    </div>
                )}

                <div ref={bottomRef} />
            </div>

            {/* Input */}
            <form onSubmit={handleSubmit} className="p-3 border-t border-white/5">
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Ask JARVIS..."
                        className="flex-1 bg-white/5 rounded px-3 py-2 text-sm text-white placeholder-gray-600 outline-none focus:ring-1 focus:ring-jarvis-core-blue"
                        disabled={isBusy}
                    />
                    <button
                        type="submit"
                        disabled={isBusy || !input.trim()}
                        className="px-4 py-2 rounded bg-jarvis-core-blue/20 text-jarvis-core-blue text-sm font-mono hover:bg-jarvis-core-blue/30 disabled:opacity-30 transition-colors"
                    >
                        ↵
                    </button>
                </div>
            </form>
        </div>
    );
}
