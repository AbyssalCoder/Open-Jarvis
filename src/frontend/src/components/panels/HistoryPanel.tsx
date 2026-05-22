import { useChatHistoryStore, type ChatSession } from '@/core/store';
import { useState } from 'react';

/**
 * Conversation history panel — shows past chat sessions.
 */
export function HistoryPanel() {
    const sessions = useChatHistoryStore((s) => s.sessions);
    const clearSessions = useChatHistoryStore((s) => s.clearSessions);
    const [expanded, setExpanded] = useState<string | null>(null);

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-white/5">
                <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-wider">
                    {sessions.length} Session{sessions.length !== 1 ? 's' : ''}
                </span>
                {sessions.length > 0 && (
                    <button
                        onClick={clearSessions}
                        className="text-[9px] font-mono text-red-400/60 hover:text-red-400 transition-colors"
                    >
                        CLEAR ALL
                    </button>
                )}
            </div>

            {/* Sessions list */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {sessions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full opacity-40">
                        <span className="text-xs font-mono text-gray-500">No conversation history yet</span>
                        <span className="text-[10px] font-mono text-gray-600 mt-1">
                            Start chatting and sessions will appear here
                        </span>
                    </div>
                ) : (
                    sessions.map((session) => (
                        <SessionCard
                            key={session.id}
                            session={session}
                            isExpanded={expanded === session.id}
                            onToggle={() => setExpanded(expanded === session.id ? null : session.id)}
                        />
                    ))
                )}
            </div>
        </div>
    );
}

function SessionCard({ session, isExpanded, onToggle }: {
    session: ChatSession;
    isExpanded: boolean;
    onToggle: () => void;
}) {
    const date = new Date(session.createdAt);
    const timeStr = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const msgCount = session.messages.length;

    return (
        <div
            className="rounded-lg overflow-hidden transition-all duration-200"
            style={{
                background: isExpanded ? 'rgba(10,132,255,0.08)' : 'rgba(255,255,255,0.02)',
                border: `1px solid ${isExpanded ? 'rgba(10,132,255,0.2)' : 'rgba(255,255,255,0.04)'}`,
            }}
        >
            <button
                onClick={onToggle}
                className="w-full text-left px-3 py-2 flex items-center justify-between hover:bg-white/5 transition-colors"
            >
                <div className="flex-1 min-w-0">
                    <p className="text-xs text-white/80 truncate font-mono">
                        {session.title}
                    </p>
                    <p className="text-[9px] text-gray-500 font-mono mt-0.5">
                        {dateStr} {timeStr} · {msgCount} msg{msgCount !== 1 ? 's' : ''}
                    </p>
                </div>
                <span className="text-[10px] text-gray-500 ml-2">
                    {isExpanded ? '▾' : '▸'}
                </span>
            </button>

            {isExpanded && (
                <div className="px-3 pb-2 space-y-1.5 max-h-60 overflow-y-auto">
                    {session.messages.map((msg, i) => (
                        <div key={i} className="text-[11px] font-mono">
                            <span style={{ color: msg.role === 'user' ? '#6688aa' : '#0A84FF' }}>
                                {msg.role === 'user' ? '◇ ' : '◆ '}
                            </span>
                            <span className="text-white/70">
                                {msg.content.slice(0, 200)}{msg.content.length > 200 ? '...' : ''}
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
