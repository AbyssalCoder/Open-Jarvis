import { useEffect, useRef } from 'react';

let frameCount = 0;
let lastTime = performance.now();
let currentFps = 60;

/**
 * Lightweight FPS counter.
 * Samples every second to avoid perf overhead.
 */
export function measureFps(): number {
    frameCount++;
    const now = performance.now();
    if (now - lastTime >= 1000) {
        currentFps = frameCount;
        frameCount = 0;
        lastTime = now;
    }
    return currentFps;
}

export function getFps(): number {
    return currentFps;
}

/**
 * Hook: runs a callback on each rAF tick.
 * Auto-cleans up on unmount.
 */
export function useRaf(cb: (dt: number) => void) {
    const ref = useRef(cb);
    ref.current = cb;

    useEffect(() => {
        let prev = performance.now();
        let raf: number;

        function loop(now: number) {
            const dt = (now - prev) / 1000;
            prev = now;
            ref.current(dt);
            raf = requestAnimationFrame(loop);
        }

        raf = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(raf);
    }, []);
}
