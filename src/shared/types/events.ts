/** Event types shared between frontend and backend (via WebSocket). */

export interface WSMessage<T = Record<string, unknown>> {
    type: string;
    data: T;
}

// ---- Chat Events ----
export interface ChatMessageEvent {
    content: string;
}

export interface StreamTokenEvent {
    token: string;
}

// ---- Agent Events ----
export interface AgentStateEvent {
    agent_id: string;
    name: string;
    status: 'idle' | 'active' | 'busy' | 'error' | 'suspended';
    currentTask: string | null;
}

// ---- System Events ----
export interface SystemConnectedEvent {
    status: string;
}

export interface SystemMetricsEvent {
    cpu_usage: number;
    ram_used_mb: number;
    ram_total_mb: number;
    gpu_usage: number;
}

// ---- Type-safe event map ----
export interface EventMap {
    'chat.message': ChatMessageEvent;
    'stream.start': Record<string, never>;
    'stream.token': StreamTokenEvent;
    'stream.end': Record<string, never>;
    'agent.state': AgentStateEvent;
    'system.connected': SystemConnectedEvent;
    'system.metrics': SystemMetricsEvent;
}
