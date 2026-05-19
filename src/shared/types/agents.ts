/** Agent types shared between frontend and backend. */

export interface AgentInfo {
    id: string;
    name: string;
    status: 'idle' | 'active' | 'busy' | 'error' | 'suspended';
    capabilities: string[];
    currentTask: string | null;
}

export const AGENT_IDS = [
    'brain',
    'voice',
    'memory',
    'vision',
    'coding',
    'terminal',
    'web',
    'file',
    'productivity',
    'media',
    'personality',
    'system-monitor',
    'mobile-sync',
    'model-manager',
    'autonomous-task',
    'security',
    'overlay-hud',
    'gaming',
    'knowledge',
    'scheduler',
] as const;

export type AgentId = (typeof AGENT_IDS)[number];
