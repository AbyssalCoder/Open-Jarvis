/** @type {import('tailwindcss').Config} */
export default {
    content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
    theme: {
        extend: {
            colors: {
                jarvis: {
                    'core-blue': '#0A84FF',
                    'deep-blue': '#0051A8',
                    'arctic-white': '#E8F0FE',
                    'void-black': '#050A12',
                    'surface-dark': '#0D1520',
                    'energy-cyan': '#00D4FF',
                    'warm-amber': '#FF9500',
                    'signal-red': '#FF3B30',
                    'growth-green': '#30D158',
                    'reasoning-violet': '#BF5AF2',
                },
            },
            fontFamily: {
                sans: ['Inter', 'SF Pro Display', 'system-ui', 'sans-serif'],
                mono: ['JetBrains Mono', 'SF Mono', 'Consolas', 'monospace'],
            },
            fontSize: {
                'hud-xs': '0.625rem',
                'hud-sm': '0.75rem',
            },
            backdropBlur: {
                glass: '12px',
            },
            animation: {
                'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                glow: 'glow 2s ease-in-out infinite alternate',
            },
            keyframes: {
                glow: {
                    '0%': { boxShadow: '0 0 5px rgba(10, 132, 255, 0.2)' },
                    '100%': { boxShadow: '0 0 20px rgba(10, 132, 255, 0.6)' },
                },
            },
        },
    },
    plugins: [],
};
