/**
 * API utility that works in both browser and Tauri webview.
 *
 * In Tauri, HTTP fetch from the webview (https://tauri.localhost) to the backend
 * (http://localhost:8420) is blocked by mixed-content restrictions.
 * This module proxies requests through Tauri IPC commands instead.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

const isTauri =
    typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

export const BACKEND_URL = 'http://localhost:8420';

interface ProxyResponse {
    status: number;
    body: string;
}

/**
 * Fetch from the backend. Automatically proxies through Tauri IPC when
 * running inside the Tauri webview.
 */
export async function apiFetch(
    path: string,
    options?: RequestInit,
): Promise<Response> {
    if (!isTauri) {
        return fetch(`${BACKEND_URL}${path}`, options);
    }

    const { invoke } = await import('@tauri-apps/api/core');
    const method = (options?.method || 'GET').toUpperCase();

    if (method === 'GET') {
        const result = await invoke<ProxyResponse>('proxy_get', { path });
        return new Response(result.body, {
            status: result.status,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    const body =
        typeof options?.body === 'string'
            ? options.body
            : JSON.stringify(options?.body ?? {});
    const result = await invoke<ProxyResponse>('proxy_post', { path, body });
    return new Response(result.body, {
        status: result.status,
        headers: { 'Content-Type': 'application/json' },
    });
}

/**
 * Stream a chat message. In Tauri, uses IPC Channel for streaming.
 * In browser, uses native SSE fetch.
 * Calls `onChunk` for each raw SSE text chunk received.
 * Returns the full concatenated response text.
 */
export async function streamChat(
    message: string,
    onChunk: (text: string) => void,
): Promise<void> {
    if (!isTauri) {
        // Browser path — direct SSE fetch
        const resp = await fetch(`${BACKEND_URL}/api/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message }),
        });
        if (!resp.ok || !resp.body) throw new Error(`HTTP ${resp.status}`);
        const reader = resp.body.getReader();
        const decoder = new TextDecoder();
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            onChunk(decoder.decode(value, { stream: true }));
        }
        return;
    }

    // Tauri path — stream through IPC Channel
    const { invoke, Channel } = await import('@tauri-apps/api/core');
    const channel = new Channel<string>();
    channel.onmessage = (chunk: string) => {
        onChunk(chunk);
    };
    await invoke('proxy_stream_chat', { message, onEvent: channel });
}

export { isTauri };
