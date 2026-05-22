import { useActivityStore, type ActivityEntry } from '@/core/store';

/**
 * Activity log panel — shows what tools/agents are doing in real-time.
 */
export function ActivityPanel() {
    const activities = useActivityStore((s) => s.activities);
    const clearActivities = useActivityStore((s) => s.clearActivities);

    const running = activities.filter((a) => a.status === 'running');

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-white/5">
                <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-wider">
                        Activity Log
                    </span>
                    {running.length > 0 && (
                        <span className="text-[9px] font-mono text-amber-400 animate-pulse">
                            {running.length} running
                        </span>
                    )}
                </div>
                {activities.length > 0 && (
                    <button
                        onClick={clearActivities}
                        className="text-[9px] font-mono text-red-400/60 hover:text-red-400 transition-colors"
                    >
                        CLEAR
                    </button>
                )}
            </div>

            {/* Activity list */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {activities.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full opacity-40">
                        <span className="text-xs font-mono text-gray-500">No activity yet</span>
                        <span className="text-[10px] font-mono text-gray-600 mt-1">
                            Tool executions will show up here
                        </span>
                    </div>
                ) : (
                    activities.map((entry) => (
                        <ActivityCard key={entry.id} entry={entry} />
                    ))
                )}
            </div>
        </div>
    );
}

function ActivityCard({ entry }: { entry: ActivityEntry }) {
    const date = new Date(entry.timestamp);
    const timeStr = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    const statusColors = {
        running: { bg: 'rgba(255,149,0,0.08)', border: 'rgba(255,149,0,0.2)', dot: '#FF9500', text: '#FF9500' },
        done: { bg: 'rgba(48,209,88,0.05)', border: 'rgba(48,209,88,0.1)', dot: '#30D158', text: '#30D158' },
        error: { bg: 'rgba(255,59,48,0.05)', border: 'rgba(255,59,48,0.1)', dot: '#FF3B30', text: '#FF3B30' },
    };

    const colors = statusColors[entry.status];

    return (
        <div
            className="rounded-lg px-3 py-2 transition-all duration-200"
            style={{
                background: colors.bg,
                border: `1px solid ${colors.border}`,
            }}
        >
            <div className="flex items-center gap-2">
                {/* Status dot */}
                <div
                    className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                    style={{
                        background: colors.dot,
                        boxShadow: entry.status === 'running' ? `0 0 6px ${colors.dot}` : 'none',
                        animation: entry.status === 'running' ? 'pulse 1.5s ease-in-out infinite' : 'none',
                    }}
                />

                {/* Tool name */}
                <span className="text-[10px] font-mono font-bold tracking-wider uppercase" style={{ color: colors.text }}>
                    {entry.tool.replace(/_/g, ' ')}
                </span>

                {/* Time */}
                <span className="text-[9px] font-mono text-gray-500 ml-auto">
                    {timeStr}
                </span>
            </div>

            {/* Message */}
            <p className="text-[11px] font-mono text-white/60 mt-1 leading-relaxed">
                {entry.message}
            </p>

            {/* Detail */}
            {entry.detail && (
                <p className="text-[10px] font-mono text-gray-500 mt-0.5">
                    {entry.detail.slice(0, 150)}{entry.detail.length > 150 ? '...' : ''}
                </p>
            )}
        </div>
    );
}
