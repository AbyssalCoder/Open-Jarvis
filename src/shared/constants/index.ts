/** Shared constants between frontend and backend. */

export const JARVIS_VERSION = '0.1.0-alpha';

export const PORTS = {
    FRONTEND_DEV: 1420,
    BACKEND: 8420,
    OLLAMA: 11434,
} as const;

export const WS_EVENTS = {
    CHAT_MESSAGE: 'chat.message',
    STREAM_START: 'stream.start',
    STREAM_TOKEN: 'stream.token',
    STREAM_END: 'stream.end',
    AGENT_STATE: 'agent.state',
    SYSTEM_CONNECTED: 'system.connected',
    SYSTEM_METRICS: 'system.metrics',
} as const;
