/** Message types for chat and inter-agent communication. */

export interface ChatMessage {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: number;
    agent_id?: string;
    model?: string;
}

export interface AgentMessage {
    from_agent: string;
    to_agent: string;
    type: string;
    payload: Record<string, unknown>;
    priority: number;
}
