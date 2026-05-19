import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
    plugins: [react()],

    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },

    // Tauri dev server config
    clearScreen: false,
    server: {
        port: 1420,
        strictPort: true,
    },

    envPrefix: ['VITE_', 'TAURI_'],

    build: {
        target: 'esnext',
        minify: !process.env.TAURI_DEBUG ? 'esbuild' : false,
        sourcemap: !!process.env.TAURI_DEBUG,
        rollupOptions: {
            output: {
                manualChunks: {
                    three: ['three'],
                    r3f: ['@react-three/fiber', '@react-three/drei'],
                    gsap: ['gsap'],
                    ui: ['framer-motion'],
                },
            },
        },
        chunkSizeWarningLimit: 500,
    },

    optimizeDeps: {
        include: ['three', '@react-three/fiber'],
    },
});
