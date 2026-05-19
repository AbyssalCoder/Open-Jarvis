import { ReactNode } from 'react';
import { WebSocketProvider } from '@/core/websocket/WebSocketProvider';

interface ProvidersProps {
    children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
    return (
        <ErrorBoundary>
            <WebSocketProvider>
                {children}
            </WebSocketProvider>
        </ErrorBoundary>
    );
}

// Minimal error boundary
import { Component, type ErrorInfo } from 'react';

interface EBState {
    hasError: boolean;
    error: Error | null;
}

class ErrorBoundary extends Component<{ children: ReactNode }, EBState> {
    state: EBState = { hasError: false, error: null };

    static getDerivedStateFromError(error: Error) {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, info: ErrorInfo) {
        console.error('[JARVIS] Critical error:', error, info.componentStack);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div
                    style={{
                        width: '100vw',
                        height: '100vh',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: '#050A12',
                        color: '#FF3B30',
                        fontFamily: 'JetBrains Mono, monospace',
                        gap: 16,
                    }}
                >
                    <h1 style={{ fontSize: 24 }}>JARVIS — Critical Error</h1>
                    <pre style={{ color: '#8899AA', maxWidth: 600, overflow: 'auto' }}>
                        {this.state.error?.message}
                    </pre>
                    <button
                        onClick={() => window.location.reload()}
                        style={{
                            padding: '8px 24px',
                            background: 'transparent',
                            border: '1px solid #0A84FF',
                            color: '#0A84FF',
                            borderRadius: 8,
                            cursor: 'pointer',
                        }}
                    >
                        Restart
                    </button>
                </div>
            );
        }
        return this.props.children;
    }
}
