import { usePanelStore, type PanelId } from '@/core/store';
import { ChatPanel } from '@/components/chat/ChatPanel';

/**
 * Manages the panel layout. Renders open panels in a side drawer.
 */
export function PanelManager() {
    const openPanels = usePanelStore((s) => s.openPanels);

    if (openPanels.length === 0) return null;

    return (
        <div
            className="fixed right-0 top-0 bottom-0 z-40 pointer-events-auto flex"
            style={{ width: '420px' }}
        >
            {openPanels.map((id) => (
                <PanelSwitch key={id} panelId={id} />
            ))}
        </div>
    );
}

function PanelSwitch({ panelId }: { panelId: PanelId }) {
    const closePanel = usePanelStore((s) => s.closePanel);

    return (
        <div className="flex-1 flex flex-col glass-panel m-2 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-white/5">
                <span className="text-xs font-mono text-jarvis-core-blue uppercase tracking-wider">
                    {panelId}
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
                {/* Other panels rendered here when built */}
            </div>
        </div>
    );
}
