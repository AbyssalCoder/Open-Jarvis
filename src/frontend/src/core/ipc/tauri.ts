import { invoke } from '@tauri-apps/api/core';

export interface SystemInfo {
    cpu_cores: number;
    cpu_usage: number;
    total_ram_mb: number;
    used_ram_mb: number;
    gpu_name: string;
    gpu_vram_mb: number;
    os_name: string;
    hostname: string;
}

export interface HardwareProfile {
    tier: string;
    cpu_threads: number;
    ram_total_mb: number;
    gpu_vram_mb: number;
    recommended_model: string;
    ui_quality: string;
}

export type BackendStatus = 'Starting' | 'Running' | 'Stopped' | 'Error';

/**
 * Typed wrappers around Tauri IPC commands.
 * Falls back gracefully when not running inside Tauri.
 */
export const tauriAPI = {
    async getSystemInfo(): Promise<SystemInfo> {
        return invoke<SystemInfo>('get_system_info');
    },

    async getHardwareProfile(): Promise<HardwareProfile> {
        return invoke<HardwareProfile>('get_hardware_profile');
    },

    async toggleMainWindow(): Promise<void> {
        return invoke('toggle_main_window');
    },

    async createOverlay(): Promise<void> {
        return invoke('create_overlay');
    },

    async getBackendStatus(): Promise<BackendStatus> {
        return invoke<BackendStatus>('get_backend_status');
    },

    async restartBackend(): Promise<void> {
        return invoke('restart_backend');
    },

    async readFile(path: string): Promise<string> {
        return invoke<string>('read_file_safe', { path });
    },

    async writeFile(path: string, content: string): Promise<void> {
        return invoke('write_file_safe', { path, content });
    },
};

/** Check if running inside Tauri shell */
export function isTauri(): boolean {
    return typeof window !== 'undefined' && '__TAURI__' in window;
}
