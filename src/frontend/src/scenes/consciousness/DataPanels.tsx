import { useRef, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { useSystemStore, useAIStore, useTaskStore, type ActiveTask } from '@/core/store';
import { apiFetch } from '@/utils/tauriFetch';

/* ════════════════════════════════════════════════════════════
   Floating holographic data panels around the engine core.
   Weather · Stocks · Clock · Battery · System · AI · Network
   + dynamic task panels that appear when AI is working.
   ════════════════════════════════════════════════════════════ */

export function DataPanels() {
    const tasks = useTaskStore((s) => s.tasks);

    return (
        <group>
            {/* ─── Row 1: Top ─── */}
            <FloatingPanel position={[1.6, 1.6, 3]} rotation={[0, -0.5, 0]}>
                <ClockPanel />
            </FloatingPanel>

            <FloatingPanel position={[-1.6, 1.6, 3]} rotation={[0, 0.5, 0]}>
                <WeatherPanel />
            </FloatingPanel>

            {/* ─── Row 2: Mid ─── */}
            <FloatingPanel position={[2.0, 0.2, 3.5]} rotation={[0, -0.6, 0]}>
                <SystemPanel />
            </FloatingPanel>

            <FloatingPanel position={[-2.0, 0.2, 3.5]} rotation={[0, 0.6, 0]}>
                <NetworkPanel />
            </FloatingPanel>

            {/* ─── Row 3: Bottom ─── */}
            <FloatingPanel position={[1.5, -1.2, 3.8]} rotation={[0, -0.55, 0]}>
                <AIStatusPanel />
            </FloatingPanel>

            <FloatingPanel position={[-1.5, -1.0, 3.8]} rotation={[0, 0.55, 0]}>
                <BatteryPanel />
            </FloatingPanel>

            {/* ─── Stocks mini-strip ─── */}
            <FloatingPanel position={[0, 2.2, 2.5]} rotation={[0, 0, 0]}>
                <StocksPanel />
            </FloatingPanel>

            {/* ─── Dynamic task panels ─── */}
            {tasks.map((task, i) => (
                <FloatingPanel
                    key={task.id}
                    position={[0, -1.8 - i * 0.6, 4.5]}
                    rotation={[0, 0, 0]}
                >
                    <TaskPanel task={task} />
                </FloatingPanel>
            ))}

            {/* Corner labels */}
            <HoloLabel position={[1.4, 2.1, 1]} text="CORE SYSTEMS" />
            <HoloLabel position={[-1.4, 2.1, 1]} text="DIAGNOSTICS" />
            <HoloLabel position={[0, -2.5, 2]} text="JARVIS OS v0.1.0" />
        </group>
    );
}

/* ────────────────────── FloatingPanel wrapper ────────────────────── */

function FloatingPanel({
    position,
    rotation,
    children,
}: {
    position: [number, number, number];
    rotation?: [number, number, number];
    children: React.ReactNode;
}) {
    const ref = useRef<THREE.Group>(null!);

    useFrame((state) => {
        if (ref.current) {
            ref.current.position.y =
                position[1] + Math.sin(state.clock.elapsedTime * 0.8 + position[0]) * 0.06;
        }
    });

    return (
        <group ref={ref} position={position} rotation={rotation}>
            <Html
                transform
                occlude={false}
                distanceFactor={3.5}
                style={{ pointerEvents: 'none', userSelect: 'none' }}
            >
                <div className="holo-panel">{children}</div>
            </Html>
        </group>
    );
}

/* ────────────────────── Panel Contents ────────────────────── */

const LBL: React.CSSProperties = {
    fontSize: 9, color: '#0A84FF', letterSpacing: 3, marginBottom: 6, fontFamily: 'monospace',
};

/* ─── Clock ─── */
function ClockPanel() {
    const [time, setTime] = useState(new Date());
    useEffect(() => { const id = setInterval(() => setTime(new Date()), 1000); return () => clearInterval(id); }, []);
    const h = time.getHours().toString().padStart(2, '0');
    const m = time.getMinutes().toString().padStart(2, '0');
    const s = time.getSeconds().toString().padStart(2, '0');
    const date = time.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

    return (
        <div style={{ width: 150, padding: 10 }}>
            <div style={LBL}>LOCAL TIME</div>
            <div style={{ fontSize: 28, fontWeight: 200, color: '#00D4FF', fontFamily: 'monospace', letterSpacing: 2 }}>
                {h}:{m}<span style={{ fontSize: 14, opacity: 0.6 }}>:{s}</span>
            </div>
            <div style={{ fontSize: 10, color: '#4a90d9', fontFamily: 'monospace', marginTop: 2 }}>{date}</div>
        </div>
    );
}

/* ─── Weather ─── */
function WeatherPanel() {
    const [w, setW] = useState<{ temp: number; cond: string; icon: string; city: string } | null>(null);

    useEffect(() => {
        async function load() {
            try {
                const r = await apiFetch('/api/weather');
                if (r.ok) {
                    const d = await r.json();
                    setW({
                        temp: d.temp,
                        cond: d.condition,
                        icon: weatherIcon(d.code),
                        city: d.city,
                    });
                } else {
                    setW({ temp: 0, cond: 'No data', icon: '—', city: 'Offline' });
                }
            } catch { setW({ temp: 0, cond: 'No data', icon: '—', city: 'Offline' }); }
        }
        load();
        const id = setInterval(load, 300_000);
        return () => clearInterval(id);
    }, []);

    return (
        <div style={{ width: 140, padding: 10 }}>
            <div style={LBL}>WEATHER</div>
            {w ? (
                <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 20 }}>{w.icon}</span>
                        <span style={{ fontSize: 22, color: '#00D4FF', fontFamily: 'monospace', fontWeight: 200 }}>{w.temp}°C</span>
                    </div>
                    <div style={{ fontSize: 8, color: '#6688aa', fontFamily: 'monospace', marginTop: 2 }}>{w.cond}</div>
                    <div style={{ fontSize: 7, color: '#4a6a8a', fontFamily: 'monospace', marginTop: 1 }}>{w.city}</div>
                </>
            ) : <div style={{ fontSize: 9, color: '#4a6a8a', fontFamily: 'monospace' }}>Loading...</div>}
        </div>
    );
}

function weatherIcon(code: number): string {
    if (code === 113) return '☀️';
    if (code === 116) return '⛅';
    if ([119, 122].includes(code)) return '☁️';
    if ([176, 263, 266, 293, 296, 299, 302].includes(code)) return '🌧️';
    if ([200, 386, 389].includes(code)) return '⛈️';
    if ([227, 230, 323, 326, 329, 332, 335, 338].includes(code)) return '❄️';
    if ([143, 248, 260].includes(code)) return '🌫️';
    return '🌤️';
}

/* ─── Stocks / Crypto ─── */
function StocksPanel() {
    const [stocks, setStocks] = useState([
        { sym: 'BTC', price: '—', chg: '—', up: true },
        { sym: 'ETH', price: '—', chg: '—', up: true },
        { sym: 'SOL', price: '—', chg: '—', up: true },
        { sym: 'DOGE', price: '—', chg: '—', up: false },
    ]);

    useEffect(() => {
        async function fetchPrices() {
            try {
                const resp = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana,dogecoin&vs_currencies=usd&include_24hr_change=true');
                if (resp.ok) {
                    const data = await resp.json();
                    const map: Record<string, { id: string }> = {
                        BTC: { id: 'bitcoin' },
                        ETH: { id: 'ethereum' },
                        SOL: { id: 'solana' },
                        DOGE: { id: 'dogecoin' },
                    };
                    setStocks(prev => prev.map(s => {
                        const coin = data[map[s.sym]?.id];
                        if (coin) {
                            const price = coin.usd;
                            const change = coin.usd_24h_change || 0;
                            return {
                                ...s,
                                price: price >= 1000 ? `${(price / 1000).toFixed(1)}K` : price.toFixed(2),
                                chg: `${change >= 0 ? '+' : ''}${change.toFixed(2)}%`,
                                up: change >= 0,
                            };
                        }
                        return s;
                    }));
                }
            } catch { /* use fallback */ }
        }
        fetchPrices();
        const id = setInterval(fetchPrices, 60000); // refresh every minute
        return () => clearInterval(id);
    }, []);

    return (
        <div style={{ display: 'flex', gap: 14, padding: '6px 12px' }}>
            {stocks.map(s => (
                <div key={s.sym} style={{ fontFamily: 'monospace', textAlign: 'center' }}>
                    <div style={{ fontSize: 7, color: '#6688aa', letterSpacing: 1 }}>{s.sym}</div>
                    <div style={{ fontSize: 10, color: '#00D4FF' }}>{s.price}</div>
                    <div style={{ fontSize: 7, color: s.up ? '#30D158' : '#FF3B30' }}>{s.chg}</div>
                </div>
            ))}
        </div>
    );
}

/* ─── Battery ─── */
function BatteryPanel() {
    const [batt, setBatt] = useState<{ level: number; charging: boolean } | null>(null);

    useEffect(() => {
        (async () => {
            try {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const nav = navigator as any;
                if (nav.getBattery) {
                    const b = await nav.getBattery();
                    const upd = () => setBatt({ level: Math.round(b.level * 100), charging: b.charging });
                    upd();
                    b.addEventListener('levelchange', upd);
                    b.addEventListener('chargingchange', upd);
                }
            } catch { /* not available */ }
        })();
    }, []);

    const level = batt?.level ?? 100;
    const barColor = level > 50 ? '#30D158' : level > 20 ? '#FF9500' : '#FF3B30';

    return (
        <div style={{ width: 130, padding: 10 }}>
            <div style={LBL}>BATTERY</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 30, height: 14, border: '1px solid #4a6a8a', borderRadius: 2, position: 'relative', overflow: 'hidden' }}>
                    <div style={{ width: `${level}%`, height: '100%', background: barColor, boxShadow: `0 0 4px ${barColor}60`, transition: 'width 1s ease' }} />
                    <div style={{ position: 'absolute', right: -3, top: 2, width: 2, height: 8, background: '#4a6a8a', borderRadius: '0 1px 1px 0' }} />
                </div>
                <span style={{ fontSize: 16, color: barColor, fontFamily: 'monospace', fontWeight: 200 }}>{level}%</span>
            </div>
            <div style={{ fontSize: 7, color: '#4a6a8a', fontFamily: 'monospace', marginTop: 2 }}>
                {batt?.charging ? '⚡ CHARGING' : 'ON BATTERY'}
            </div>
        </div>
    );
}

/* ─── System ─── */
function SystemPanel() {
    const metrics = useSystemStore(s => s.metrics);
    return (
        <div style={{ width: 140, padding: 10 }}>
            <div style={LBL}>SYSTEM</div>
            <MetricBar label="CPU" value={metrics.cpuUsage} color="#0A84FF" />
            <MetricBar label="RAM" value={metrics.ramTotalMB > 0 ? (metrics.ramUsedMB / metrics.ramTotalMB) * 100 : 0} color="#00D4FF" />
            <MetricBar label="GPU" value={metrics.gpuUsage} color="#BF5AF2" />
            <div style={{ fontSize: 9, color: '#30D158', fontFamily: 'monospace', marginTop: 4 }}>{metrics.fps} FPS</div>
        </div>
    );
}

function MetricBar({ label, value, color }: { label: string; value: number; color: string }) {
    return (
        <div style={{ marginBottom: 3 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 8, fontFamily: 'monospace', color: '#8899aa' }}>
                <span>{label}</span><span>{Math.round(value)}%</span>
            </div>
            <div style={{ height: 2, background: 'rgba(10,132,255,0.15)', borderRadius: 1, marginTop: 1 }}>
                <div style={{ width: `${Math.min(value, 100)}%`, height: '100%', background: color, borderRadius: 1, boxShadow: `0 0 4px ${color}50`, transition: 'width 0.5s' }} />
            </div>
        </div>
    );
}

/* ─── AI Status ─── */
function AIStatusPanel() {
    const isThinking = useAIStore(s => s.isThinking);
    const activeModel = useAIStore(s => s.activeModel);
    return (
        <div style={{ width: 130, padding: 10 }}>
            <div style={LBL}>AI ENGINE</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
                <div style={{ width: 5, height: 5, borderRadius: '50%', background: isThinking ? '#BF5AF2' : '#30D158', boxShadow: isThinking ? '0 0 6px #BF5AF2' : '0 0 6px #30D158' }} />
                <span style={{ fontSize: 10, color: isThinking ? '#BF5AF2' : '#30D158', fontFamily: 'monospace' }}>
                    {isThinking ? 'PROCESSING' : 'READY'}
                </span>
            </div>
            <div style={{ fontSize: 8, color: '#6688aa', fontFamily: 'monospace' }}>MODEL: {activeModel || 'AUTO'}</div>
        </div>
    );
}

/* ─── Network ─── */
function NetworkPanel() {
    const wsConnected = useSystemStore(s => s.wsConnected);
    const ollamaConnected = useSystemStore(s => s.ollamaConnected);
    const backendConnected = useSystemStore(s => s.backendConnected);
    return (
        <div style={{ width: 130, padding: 10 }}>
            <div style={LBL}>NETWORK</div>
            <StatusRow label="WebSocket" ok={wsConnected} />
            <StatusRow label="Ollama" ok={ollamaConnected} />
            <StatusRow label="Backend" ok={backendConnected} />
        </div>
    );
}

function StatusRow({ label, ok }: { label: string; ok: boolean }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3 }}>
            <div style={{ width: 4, height: 4, borderRadius: '50%', background: ok ? '#30D158' : '#FF9500', boxShadow: ok ? '0 0 3px #30D158' : '0 0 3px #FF9500' }} />
            <span style={{ fontSize: 8, color: '#8899aa', fontFamily: 'monospace' }}>{label}</span>
            <span style={{ fontSize: 8, color: ok ? '#30D158' : '#FF9500', fontFamily: 'monospace', marginLeft: 'auto' }}>{ok ? 'ON' : 'OFF'}</span>
        </div>
    );
}

/* ─── Task Panel (dynamic — pops up when AI works on something) ─── */
function TaskPanel({ task }: { task: ActiveTask }) {
    const c = task.status === 'running' ? '#BF5AF2' : task.status === 'done' ? '#30D158' : '#FF3B30';
    return (
        <div style={{ width: 200, padding: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <div style={{ width: 5, height: 5, borderRadius: '50%', background: c, boxShadow: `0 0 6px ${c}`, animation: task.status === 'running' ? 'pulse 1.5s infinite' : 'none' }} />
                <span style={{ fontSize: 9, color: '#00D4FF', fontFamily: 'monospace', letterSpacing: 1 }}>{task.label.toUpperCase()}</span>
            </div>
            {task.progress !== undefined && (
                <div style={{ height: 2, background: 'rgba(10,132,255,0.15)', borderRadius: 1, marginBottom: 3 }}>
                    <div style={{ width: `${task.progress}%`, height: '100%', background: '#BF5AF2', borderRadius: 1, boxShadow: '0 0 4px #BF5AF250', transition: 'width 0.3s' }} />
                </div>
            )}
            {task.detail && <div style={{ fontSize: 8, color: '#6688aa', fontFamily: 'monospace' }}>{task.detail}</div>}
        </div>
    );
}

/* ─── Floating label ─── */
function HoloLabel({ position, text }: { position: [number, number, number]; text: string }) {
    const ref = useRef<THREE.Group>(null!);
    useFrame((state) => { ref.current.position.y = position[1] + Math.sin(state.clock.elapsedTime + position[0]) * 0.04; });
    return (
        <group ref={ref} position={position}>
            <Html transform occlude={false} distanceFactor={10} style={{ pointerEvents: 'none', userSelect: 'none' }}>
                <div style={{ fontSize: 8, fontFamily: 'monospace', color: '#0A84FF', letterSpacing: 3, opacity: 0.45, whiteSpace: 'nowrap', textShadow: '0 0 6px rgba(10,132,255,0.3)' }}>
                    {text}
                </div>
            </Html>
        </group>
    );
}
