/** Model types shared between frontend and backend. */

export interface ModelInfo {
    name: string;
    provider: 'ollama' | 'gemini' | 'openrouter' | 'local-gguf';
    size_gb: number;
    context_window: number;
    capabilities: ('chat' | 'code' | 'vision' | 'embedding')[];
}

export type HardwareTier = 'ultra' | 'high' | 'medium' | 'low' | 'minimal';

export interface HardwareProfile {
    tier: HardwareTier;
    cpu_threads: number;
    ram_total_mb: number;
    gpu_vram_mb: number;
    recommended_model: string;
    ui_quality: string;
}
