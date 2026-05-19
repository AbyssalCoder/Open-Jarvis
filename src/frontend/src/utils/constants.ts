/** JARVIS color tokens — single source of truth matching tailwind.config.js */
export const COLORS = {
    CORE_BLUE: '#0A84FF',
    DEEP_BLUE: '#0051A8',
    ARCTIC_WHITE: '#E8F0FE',
    VOID_BLACK: '#050A12',
    SURFACE_DARK: '#0D1520',
    ENERGY_CYAN: '#00D4FF',
    WARM_AMBER: '#FF9500',
    SIGNAL_RED: '#FF3B30',
    GROWTH_GREEN: '#30D158',
    REASONING_VIOLET: '#BF5AF2',
} as const;

/** Backend endpoints */
export const API = {
    BASE: 'http://localhost:8420',
    WS: 'ws://localhost:8420/ws',
    HEALTH: 'http://localhost:8420/health',
    OLLAMA: 'http://localhost:11434',
} as const;

/** Hardware tier thresholds (RAM in MB, VRAM in MB) */
export const HW_TIERS = {
    ULTRA: { ramMin: 32768, vramMin: 12288 },
    HIGH: { ramMin: 24576, vramMin: 8192 },
    MEDIUM: { ramMin: 16384, vramMin: 6144 },
    LOW: { ramMin: 10240, vramMin: 2048 },
    MINIMAL: { ramMin: 8192, vramMin: 0 },
} as const;
