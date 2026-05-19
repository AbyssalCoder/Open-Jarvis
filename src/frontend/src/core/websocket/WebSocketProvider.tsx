import {
    createContext,
    useContext,
    useEffect,
    useRef,
    type ReactNode,
} from 'react';
import { useSystemStore, useAIStore, useAgentStore } from '@/core/store';

const BACKEND_WS_URL = 'ws://localhost:8420/ws';

interface WSContextValue {
    send: (type: string, payload: Record<string, unknown>) => void;
}

const WSContext = createContext<WSContextValue>({
    send: () => {
        console.warn('WebSocket not connected');
    },
});

export function useWebSocket() {
    return useContext(WSContext);
}

export function WebSocketProvider({ children }: { children: ReactNode }) {
    const wsRef = useRef<WebSocket | null>(null);
    const reconnectTimer = useRef<ReturnType<typeof setTimeout>>();

    const setWsConnected = useSystemStore((s) => s.setWsConnected);
    const setBackendStatus = useSystemStore((s) => s.setBackendStatus);

    function connect() {
        if (wsRef.current?.readyState === WebSocket.OPEN) return;

        const ws = new WebSocket(BACKEND_WS_URL);
        wsRef.current = ws;

        ws.onopen = () => {
            console.log('[JARVIS] WebSocket connected');
            setWsConnected(true);
            setBackendStatus('ready');
        };

        ws.onmessage = (event) => {
            try {
                const msg = JSON.parse(event.data);
                handleMessage(msg);
            } catch {
                console.warn('[JARVIS] Invalid WS message:', event.data);
            }
        };

        ws.onclose = () => {
            console.log('[JARVIS] WebSocket disconnected');
            setWsConnected(false);
            // Reconnect after 2s
            reconnectTimer.current = setTimeout(connect, 2000);
        };

        ws.onerror = () => {
            setBackendStatus('error');
            ws.close();
        };
    }

    function handleMessage(msg: { type: string; data: Record<string, unknown> }) {
        switch (msg.type) {
            case 'stream.token':
                useAIStore.getState().appendStream(msg.data.token as string);
                break;
            case 'stream.start':
                useAIStore.getState().setThinking(true);
                useAIStore.getState().clearStream();
                break;
            case 'stream.end':
                useAIStore.getState().setThinking(false);
                break;
            case 'agent.state':
                useAgentStore.getState().updateAgent(
                    msg.data.agent_id as string,
                    msg.data as unknown as import('@/core/store').AgentState
                );
                break;
            default:
                // Emit as custom event for other consumers
                window.dispatchEvent(
                    new CustomEvent(`jarvis:${msg.type}`, { detail: msg.data })
                );
        }
    }

    function send(type: string, payload: Record<string, unknown>) {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ type, data: payload }));
        }
    }

    useEffect(() => {
        connect();
        return () => {
            clearTimeout(reconnectTimer.current);
            wsRef.current?.close();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return <WSContext.Provider value={{ send }}>{children}</WSContext.Provider>;
}
