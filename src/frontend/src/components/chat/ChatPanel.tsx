import { useState, useRef, useEffect, useCallback, type FormEvent } from 'react';
import { useAIStore, useActivityStore, useChatHistoryStore, useVisionStore } from '@/core/store';
import { voiceEngine } from '@/core/voice/VoiceEngine';
import { streamChat } from '@/utils/tauriFetch';

/** Vision trigger phrases */
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

/** Show a brief error toast that auto-dismisses */
function _showErrorToast(msg: string) {
    const toast = document.createElement('div');
    toast.textContent = msg.replace(/[\[\]]/g, '').slice(0, 100);
    Object.assign(toast.style, {
        position: 'fixed', top: '20px', right: '20px', zIndex: '9999',
        background: 'rgba(255, 59, 48, 0.15)', border: '1px solid #FF3B3080',
        color: '#FF6B6B', padding: '10px 16px', borderRadius: '8px',
        fontFamily: 'monospace', fontSize: '11px', maxWidth: '300px',
        backdropFilter: 'blur(10px)', animation: 'fadeIn 0.3s ease',
    });
    document.body.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.5s ease';
        setTimeout(() => toast.remove(), 500);
    }, 4000);
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
    const openWebcam = useVisionStore((s) => s.openWebcam);
    const isThinking = useAIStore((s) => s.isThinking);
    const bottomRef = useRef<HTMLDivElement>(null);
    const messageQueueRef = useRef<string[]>([]);
    const processingRef = useRef(false);

    // Auto-scroll on new content
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, streaming]);

    /** Check if a message is a vision command */
    function isVisionCommand(text: string): boolean {
        const lower = text.toLowerCase();
        return VISION_TRIGGERS.some((t) => lower.includes(t));
    }

    /** Check if a message is a dashboard command */
    function isDashboardCommand(text: string): boolean {
        const lower = text.toLowerCase();
        return DASHBOARD_TRIGGERS.some((t) => lower.includes(t));
    }

    const sendMessage = useCallback(
        async (text: string) => {
            const trimmed = text.trim();
            if (!trimmed) return;

            // Check if this is a dashboard command
            if (isDashboardCommand(trimmed)) {
                setMessages((prev) => [...prev, { role: 'user', content: trimmed }]);
                setInput('');
                setMessages((prev) => [...prev, { role: 'assistant', content: 'Opening the agent dashboard for you, sir.' }]);
                voiceEngine.speak('Opening the agent dashboard for you, sir.');
                window.dispatchEvent(new CustomEvent('jarvis:show-dashboard'));
                return;
            }

            // Check if this is a vision/webcam command (use global vision store)
            if (isVisionCommand(trimmed)) {
                setMessages((prev) => [...prev, { role: 'user', content: trimmed }]);
                setInput('');
                openWebcam(trimmed);
                return;
            }

            setMessages((prev) => [...prev, { role: 'user', content: trimmed }]);
            setInput('');
            processingRef.current = true;
            useAIStore.getState().setThinking(true);
            setStreaming('');

            try {
                let fullResponse = '';
                let buffer = '';
                const activeTools = new Map<string, string>(); // toolId -> tool name

                await streamChat(trimmed, (chunkText) => {
                    buffer += chunkText;
                    const lines = buffer.split('\n');
                    buffer = lines.pop() || '';

                    for (const line of lines) {
                        if (!line.startsWith('data: ')) continue;
                        try {
                            const data = JSON.parse(line.slice(6));
                            if (data.type === 'token' && data.token) {
                                fullResponse += data.token;
                                setStreaming(fullResponse);

                                // Detect TOOL_CALL patterns and log to activity store
                                const toolMatch = data.token.match(/TOOL_CALL:\s*\{.*?"tool"\s*:\s*"([^"]+)".*?\}/s)
                                    || fullResponse.match(/TOOL_CALL:\s*\{.*?"tool"\s*:\s*"([^"]+)".*?\}/s);
                                if (toolMatch && !activeTools.has(toolMatch[1])) {
                                    const toolName = toolMatch[1];
                                    const toolId = `${Date.now()}-${toolName}`;
                                    activeTools.set(toolName, toolId);
                                    useActivityStore.getState().addActivity({
                                        id: toolId,
                                        tool: toolName,
                                        status: 'running',
                                        message: `Executing ${toolName}...`,
                                        timestamp: Date.now(),
                                    });
                                }

                                // Detect activity indicators [Doing something...]
                                const activityMatch = data.token.match(/\[([^\]]+\.\.\.)\]/);
                                if (activityMatch) {
                                    const actMsg = activityMatch[1];
                                    const toolHint = actMsg.split(' ')[0].toLowerCase();
                                    // Update the last running activity or create new
                                    const lastToolId = [...activeTools.values()].pop();
                                    if (lastToolId) {
                                        useActivityStore.getState().updateActivity(lastToolId, {
                                            message: actMsg,
                                        });
                                    } else {
                                        useActivityStore.getState().addActivity({
                                            id: `${Date.now()}-${toolHint}`,
                                            tool: toolHint,
                                            status: 'running',
                                            message: actMsg,
                                            timestamp: Date.now(),
                                        });
                                    }
                                }
                            } else if (data.type === 'error') {
                                fullResponse += data.token || '[Error]';
                                setStreaming(fullResponse);
                            }
                        } catch {
                            // skip malformed
                        }
                    }
                });

                // Mark all running activities as done
                activeTools.forEach((toolId) => {
                    useActivityStore.getState().updateActivity(toolId, {
                        status: 'done',
                        message: 'Completed',
                    });
                });

                // Commit response (clean up TOOL_CALL artifacts and error messages)
                if (fullResponse) {
                    let cleanDisplay = fullResponse.replace(/TOOL_CALL:\s*\{.*?\}/gs, '').trim();

                    // Detect singing mode BEFORE stripping control tags
                    const isSinging = cleanDisplay.includes('[SING]');

                    // Remove activity indicators from final display (they were shown during streaming)
                    cleanDisplay = cleanDisplay.replace(/^\[.*?\]\s*\n?/gm, '').trim();

                    // Strip [SING] prefix from display (it's a control tag for TTS)
                    cleanDisplay = cleanDisplay.replace(/^\[SING\]\s*/i, '').trim();

                    // If response is just an error, show as brief notification instead of chat message
                    const isError = /^\[Error:.*\]$/.test(cleanDisplay) || cleanDisplay.includes('All providers failed') || cleanDisplay.includes('quota') || cleanDisplay.includes('RESOURCE_EXHAUSTED');
                    if (isError) {
                        // Show brief error toast (auto-dismiss)
                        _showErrorToast(cleanDisplay);
                        cleanDisplay = "Give me a moment, sir. I'm having a slight connectivity hiccup but nothing I can't handle.";
                    }

                    setMessages((prev) => [
                        ...prev,
                        { role: 'assistant', content: cleanDisplay || fullResponse },
                    ]);
                    setStreaming('');

                    // Save to chat history
                    const now = Date.now();
                    useChatHistoryStore.getState().addSession({
                        id: `session-${now}`,
                        title: trimmed.slice(0, 60),
                        messages: [
                            { role: 'user', content: trimmed, timestamp: now - 1000 },
                            { role: 'assistant', content: cleanDisplay || fullResponse, timestamp: now },
                        ],
                        createdAt: now,
                    });

                    // TTS: speak the response (strip markdown first)
                    voiceEngine.speak(stripMarkdown(cleanDisplay), isSinging);
                }
            } catch (err) {
                // Mark any running activities as error
                useActivityStore.getState().activities
                    .filter((a) => a.status === 'running')
                    .forEach((a) => {
                        useActivityStore.getState().updateActivity(a.id, {
                            status: 'error',
                            message: 'Connection error',
                        });
                    });

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
                processingRef.current = false;
                // Process next queued message if any
                processQueue();
            }
        },
        []
    );

    // Queue-based message processing to prevent mixed/dropped responses
    const processQueue = useCallback(() => {
        if (processingRef.current || messageQueueRef.current.length === 0) return;
        const next = messageQueueRef.current.shift()!;
        sendMessage(next);
    }, [sendMessage]);

    const queueMessage = useCallback((text: string) => {
        const trimmed = text.trim();
        if (!trimmed) return;
        // If currently processing, queue it. Otherwise send immediately.
        if (processingRef.current) {
            messageQueueRef.current.push(trimmed);
        } else {
            sendMessage(trimmed);
        }
    }, [sendMessage]);

    // Wire voice input → send message (via global VoiceCommandRouter event)
    useEffect(() => {
        const handler = (e: Event) => {
            const text = (e as CustomEvent).detail;
            if (text) queueMessage(text);
        };
        const visionHandler = (e: Event) => {
            const result = (e as CustomEvent).detail;
            if (result) {
                setMessages((prev) => [...prev, { role: 'assistant', content: result }]);
            }
        };
        window.addEventListener('jarvis:voice-message', handler);
        window.addEventListener('jarvis:vision-result', visionHandler);
        return () => {
            window.removeEventListener('jarvis:voice-message', handler);
            window.removeEventListener('jarvis:vision-result', visionHandler);
        };
    }, [queueMessage]);

    function handleSubmit(e: FormEvent) {
        e.preventDefault();
        queueMessage(input);
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
                            {streaming.split('\n').map((line, idx) => {
                                // Style activity indicators differently
                                if (line.match(/^\[.*\.\.\.\]$/)) {
                                    return (
                                        <span key={idx} className="block text-[11px] font-mono text-cyan-400/80 animate-pulse mb-1">
                                            {line}
                                        </span>
                                    );
                                }
                                return <span key={idx}>{line}{idx < streaming.split('\n').length - 1 ? '\n' : ''}</span>;
                            })}
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
