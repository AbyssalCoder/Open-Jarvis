import { usePanelStore, type PanelId } from '@/core/store';
import { ChatPanel } from '@/components/chat/ChatPanel';
import { HistoryPanel } from '@/components/panels/HistoryPanel';
import { ActivityPanel } from '@/components/panels/ActivityPanel';

/**
 * Manages the panel layout. Renders open panels in a side drawer.
 * Includes icon buttons for toggling History and Activity panels.
 */
export function PanelManager() {
    const openPanels = usePanelStore((s) => s.openPanels);
    const togglePanel = usePanelStore((s) => s.togglePanel);

    const isHistoryOpen = openPanels.includes('history');
    const isActivityOpen = openPanels.includes('activity');

    return (
        <>
            {/* Panel toggle icons — always visible on the left side */}
            <div className="fixed left-4 top-1/2 -translate-y-1/2 z-50 pointer-events-auto flex flex-col gap-3">
                {/* History icon */}
                <button
                    onClick={() => togglePanel('history')}
                    className="group w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-300"
                    style={{
                        background: isHistoryOpen
                            ? 'rgba(10,132,255,0.2)'
                            : 'rgba(13,21,32,0.7)',
                        border: `1px solid ${isHistoryOpen ? 'rgba(10,132,255,0.4)' : 'rgba(255,255,255,0.06)'}`,
                        backdropFilter: 'blur(10px)',
                        boxShadow: isHistoryOpen ? '0 0 12px rgba(10,132,255,0.2)' : 'none',
                    }}
                    title="Conversation History"
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                        stroke={isHistoryOpen ? '#0A84FF' : '#6688aa'} strokeWidth="1.5"
                        strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 8v4l3 3" />
                        <circle cx="12" cy="12" r="9" />
                        <path d="M3 12h2" />
                    </svg>
                </button>

                {/* Activity icon */}
                <button
                    onClick={() => togglePanel('activity')}
                    className="group w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-300"
                    style={{
                        background: isActivityOpen
                            ? 'rgba(255,149,0,0.15)'
                            : 'rgba(13,21,32,0.7)',
                        border: `1px solid ${isActivityOpen ? 'rgba(255,149,0,0.3)' : 'rgba(255,255,255,0.06)'}`,
                        backdropFilter: 'blur(10px)',
                        boxShadow: isActivityOpen ? '0 0 12px rgba(255,149,0,0.15)' : 'none',
                    }}
                    title="Activity Log"
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                        stroke={isActivityOpen ? '#FF9500' : '#6688aa'} strokeWidth="1.5"
                        strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                    </svg>
                </button>
            </div>

            {/* Panels */}
            {openPanels.length === 0 ? null : (
                <div
                    className="fixed right-0 top-0 bottom-0 z-40 pointer-events-auto flex"
                    style={{ width: openPanels.length > 1 ? '640px' : '420px' }}
                >
                    {openPanels.map((id) => (
                        <PanelSwitch key={id} panelId={id} />
                    ))}
                </div>
            )}
        </>
    );
}

const panelLabels: Record<PanelId, string> = {
    chat: 'CHAT',
    terminal: 'TERMINAL',
    files: 'FILES',
    settings: 'SETTINGS',
    agents: 'AGENTS',
    memory: 'MEMORY',
    history: 'HISTORY',
    activity: 'ACTIVITY',
};

function PanelSwitch({ panelId }: { panelId: PanelId }) {
    const closePanel = usePanelStore((s) => s.closePanel);

    return (
        <div className="flex-1 flex flex-col glass-panel m-2 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-white/5">
                <span className="text-xs font-mono text-jarvis-core-blue uppercase tracking-wider">
                    {panelLabels[panelId] || panelId}
                </span>
                <button
                    onClick={() => closePanel(panelId)}
                    className="text-gray-500 hover:text-white text-sm"
                >
                    ✕
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
                {panelId === 'chat' && <ChatPanel />}
                {panelId === 'history' && <HistoryPanel />}
                {panelId === 'activity' && <ActivityPanel />}
            </div>
        </div>
    );
}
