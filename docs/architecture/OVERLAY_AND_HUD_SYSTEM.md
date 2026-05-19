# JARVIS — Overlay & HUD System

## System-Wide Heads-Up Display Architecture

**Version:** 0.1.0-alpha  
**Document Type:** Architecture Specification  
**Module:** Desktop → Overlay & HUD

---

## Table of Contents

1. [HUD Philosophy](#1-hud-philosophy)
2. [Overlay Window Architecture](#2-overlay-window-architecture)
3. [HUD Layouts & Panels](#3-hud-layouts--panels)
4. [Quick Command Palette](#4-quick-command-palette)
5. [Notification System](#5-notification-system)
6. [Voice Indicator](#6-voice-indicator)
7. [Task Progress Overlay](#7-task-progress-overlay)
8. [Screen-Edge Panels](#8-screen-edge-panels)
9. [Transparency & Compositing](#9-transparency--compositing)
10. [Input Handling](#10-input-handling)
11. [Performance Constraints](#11-performance-constraints)
12. [Activation & Hotkeys](#12-activation--hotkeys)

---

## 1. HUD Philosophy

### 1.1 Design Goals

The HUD is JARVIS's ambient presence — always accessible but never intrusive:

1. **Always available** — One hotkey summons JARVIS from any application
2. **Never blocking** — Overlay never obscures critical content
3. **Contextually aware** — HUD adapts to what the user is doing
4. **Visually cohesive** — Matches JARVIS aesthetic (dark, glowing, sci-fi)
5. **Performance-zero** — Near-zero resource usage when idle
6. **Dismissable** — Every element can be dismissed instantly

### 1.2 HUD States

| State | Trigger | Visual | Resource Usage |
|---|---|---|---|
| **Hidden** | Default / Esc | Nothing visible | 0% CPU |
| **Ambient** | Idle after activation | Subtle edge glow | < 0.5% CPU |
| **Active** | Hotkey / voice wake | Full HUD panel visible | < 2% CPU |
| **Expanded** | Panel interaction | Multi-panel layout | < 3% CPU |
| **Voice Mode** | Voice activation | Voice waveform + status | < 2% CPU |
| **Task View** | Task in progress | Progress indicators | < 1% CPU |

---

## 2. Overlay Window Architecture

### 2.1 Tauri Overlay Window

```rust
// Create transparent, always-on-top overlay window
pub fn create_overlay_window(app: &tauri::AppHandle) -> Result<(), String> {
    let monitor = app.primary_monitor()
        .map_err(|e| e.to_string())?
        .ok_or("No primary monitor")?;
    
    let size = monitor.size();
    
    let _overlay = WebviewWindowBuilder::new(
        app,
        "overlay",
        WebviewUrl::App("overlay.html".into()),
    )
    .title("JARVIS HUD")
    .transparent(true)
    .decorations(false)
    .always_on_top(true)
    .skip_taskbar(true)
    .visible(false)              // Start hidden
    .resizable(false)
    .inner_size(size.width as f64, size.height as f64)
    .position(0.0, 0.0)
    .build()
    .map_err(|e| e.to_string())?;
    
    Ok(())
}
```

### 2.2 Click-Through Behavior

```typescript
// The overlay must be click-through for areas without UI elements
// Only opaque/interactive regions capture mouse events

// CSS for the overlay root
const overlayStyles = `
    .overlay-root {
        width: 100vw;
        height: 100vh;
        position: fixed;
        top: 0;
        left: 0;
        pointer-events: none;    /* Click-through by default */
        background: transparent;
    }
    
    .overlay-panel {
        pointer-events: auto;     /* Only panels capture clicks */
    }
`;
```

### 2.3 Overlay React App

```typescript
// overlay.html loads a separate, lightweight React app
// This is NOT the full JARVIS UI — it's a minimal HUD

function OverlayApp() {
    const [hudState, setHudState] = useState<HUDState>('hidden');
    const [panels, setPanels] = useState<PanelConfig[]>([]);
    
    // Listen for activation events from Tauri
    useEffect(() => {
        listen('hotkey:toggle-overlay', () => {
            setHudState(prev => prev === 'hidden' ? 'active' : 'hidden');
        });
        
        listen('hud:show-notification', (event) => {
            // Show notification panel
        });
        
        listen('hud:voice-active', () => {
            setHudState('voice');
        });
    }, []);
    
    if (hudState === 'hidden') return null;
    
    return (
        <div className="overlay-root">
            {hudState === 'active' && <QuickCommandPalette />}
            {hudState === 'voice' && <VoiceIndicator />}
            <NotificationStack />
            <TaskProgressBar />
            {panels.map(panel => <FloatingPanel key={panel.id} config={panel} />)}
        </div>
    );
}
```

---

## 3. HUD Layouts & Panels

### 3.1 Panel Types

```typescript
interface PanelConfig {
    id: string;
    type: PanelType;
    position: PanelPosition;
    size: { width: number; height: number };
    opacity: number;
    draggable: boolean;
    resizable: boolean;
    autoHide: boolean;
    autoHideDelay: number;
}

type PanelType = 
    | 'quick-command'      // Command palette
    | 'chat-mini'          // Mini chat window
    | 'voice-indicator'    // Voice input waveform
    | 'notification'       // Notification toast
    | 'task-progress'      // Running task progress
    | 'system-stats'       // CPU/RAM/GPU mini meters
    | 'agent-status'       // Active agent indicators
    | 'clipboard'          // Clipboard history
    | 'timer'              // Pomodoro / timer
    ;

type PanelPosition = 
    | 'top-left' | 'top-center' | 'top-right'
    | 'center-left' | 'center' | 'center-right'
    | 'bottom-left' | 'bottom-center' | 'bottom-right'
    | { x: number; y: number }  // Custom position
    ;
```

### 3.2 Default HUD Layout

```
┌─────────────────────────────────────────────────────────┐
│  [Agent Status]                          [System Stats] │
│                                                          │
│                                                          │
│                                                          │
│                                                          │
│                     [Quick Command]                      │
│                     (Ctrl+Space)                         │
│                                                          │
│                                                          │
│                                                          │
│                                                [Chat  ] │
│                                                [Mini  ] │
│  [Notifications]                               [Panel ] │
│  [Stack        ]              [Task Progress]  [      ] │
└─────────────────────────────────────────────────────────┘
```

### 3.3 Panel Component

```typescript
function FloatingPanel({ config }: { config: PanelConfig }) {
    const [position, setPosition] = useState(resolvePosition(config.position));
    const [isVisible, setIsVisible] = useState(true);
    
    // Auto-hide behavior
    useEffect(() => {
        if (config.autoHide) {
            const timer = setTimeout(() => setIsVisible(false), config.autoHideDelay);
            return () => clearTimeout(timer);
        }
    }, []);
    
    if (!isVisible) return null;
    
    return (
        <motion.div
            className="overlay-panel"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: config.opacity, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            style={{
                position: 'fixed',
                left: position.x,
                top: position.y,
                width: config.size.width,
                height: config.size.height,
                background: 'rgba(10, 14, 20, 0.85)',
                backdropFilter: 'blur(12px)',
                border: '1px solid rgba(0, 240, 255, 0.15)',
                borderRadius: '12px',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
                overflow: 'hidden',
            }}
            drag={config.draggable}
            onDragEnd={(_, info) => {
                setPosition({ x: position.x + info.offset.x, y: position.y + info.offset.y });
            }}
        >
            <PanelContent type={config.type} />
        </motion.div>
    );
}
```

---

## 4. Quick Command Palette

### 4.1 Command Palette UI

```typescript
function QuickCommandPalette() {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<CommandResult[]>([]);
    const inputRef = useRef<HTMLInputElement>(null);
    
    useEffect(() => {
        inputRef.current?.focus();
    }, []);
    
    const handleSubmit = async () => {
        if (query.startsWith('/')) {
            // Slash command — route to specific agent
            await handleSlashCommand(query);
        } else {
            // Natural language — send to Brain agent
            await sendToJarvis(query);
        }
        setQuery('');
    };
    
    return (
        <motion.div
            className="overlay-panel"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
                position: 'fixed',
                top: '30%',
                left: '50%',
                transform: 'translateX(-50%)',
                width: 600,
                background: 'rgba(10, 14, 20, 0.92)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(0, 240, 255, 0.2)',
                borderRadius: '16px',
                padding: '16px',
            }}
        >
            <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                placeholder="Ask JARVIS anything..."
                style={{
                    width: '100%',
                    background: 'transparent',
                    border: 'none',
                    color: '#E0F0FF',
                    fontSize: '18px',
                    outline: 'none',
                }}
            />
            {results.length > 0 && (
                <div style={{ marginTop: 12 }}>
                    {results.map((r, i) => (
                        <CommandResultItem key={i} result={r} />
                    ))}
                </div>
            )}
        </motion.div>
    );
}
```

### 4.2 Slash Commands

```typescript
const SLASH_COMMANDS: SlashCommand[] = [
    { command: '/code', description: 'Write or edit code', agent: 'coding' },
    { command: '/run', description: 'Run a terminal command', agent: 'terminal' },
    { command: '/search', description: 'Search the web', agent: 'web' },
    { command: '/file', description: 'File operations', agent: 'file' },
    { command: '/remember', description: 'Save to memory', agent: 'memory' },
    { command: '/recall', description: 'Recall from memory', agent: 'memory' },
    { command: '/screenshot', description: 'Analyze screen', agent: 'vision' },
    { command: '/timer', description: 'Set a timer', agent: 'scheduler' },
    { command: '/settings', description: 'Open settings', agent: null },
    { command: '/model', description: 'Switch AI model', agent: 'model_manager' },
];
```

---

## 5. Notification System

### 5.1 Notification Types

```typescript
interface JarvisNotification {
    id: string;
    type: 'info' | 'success' | 'warning' | 'error' | 'agent';
    title: string;
    body: string;
    icon?: string;
    agent?: string;              // Which agent sent this
    actions?: NotificationAction[];
    duration: number;            // Auto-dismiss after ms (0 = sticky)
    priority: 'low' | 'normal' | 'high' | 'urgent';
    timestamp: number;
}

interface NotificationAction {
    label: string;
    action: () => void;
}
```

### 5.2 Notification Stack

```typescript
function NotificationStack() {
    const notifications = useNotificationStore((s) => s.active);
    
    return (
        <div style={{
            position: 'fixed',
            bottom: 20,
            left: 20,
            display: 'flex',
            flexDirection: 'column-reverse',
            gap: 8,
            maxHeight: '40vh',
            overflow: 'hidden',
        }}>
            <AnimatePresence>
                {notifications.slice(0, 5).map((notif) => (
                    <motion.div
                        key={notif.id}
                        className="overlay-panel"
                        initial={{ opacity: 0, x: -100 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -100 }}
                        style={{
                            width: 360,
                            padding: '12px 16px',
                            background: 'rgba(10, 14, 20, 0.9)',
                            backdropFilter: 'blur(12px)',
                            border: `1px solid ${getNotifColor(notif.type)}`,
                            borderRadius: '12px',
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <NotifIcon type={notif.type} />
                            <div>
                                <div style={{ color: '#E0F0FF', fontWeight: 600 }}>{notif.title}</div>
                                <div style={{ color: '#8899AA', fontSize: 13 }}>{notif.body}</div>
                            </div>
                        </div>
                        {notif.actions && (
                            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                                {notif.actions.map((action, i) => (
                                    <button key={i} onClick={action.action}
                                        style={{ color: '#00F0FF', background: 'none', border: '1px solid rgba(0,240,255,0.3)', borderRadius: 6, padding: '4px 12px', cursor: 'pointer' }}>
                                        {action.label}
                                    </button>
                                ))}
                            </div>
                        )}
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>
    );
}
```

---

## 6. Voice Indicator

### 6.1 Voice HUD Element

```typescript
function VoiceIndicator() {
    const isListening = useVoiceStore((s) => s.isListening);
    const audioLevel = useVoiceStore((s) => s.audioLevel);
    const transcript = useVoiceStore((s) => s.partialTranscript);
    
    return (
        <motion.div
            className="overlay-panel"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            style={{
                position: 'fixed',
                bottom: 80,
                left: '50%',
                transform: 'translateX(-50%)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 12,
                padding: '16px 32px',
                background: 'rgba(10, 14, 20, 0.9)',
                backdropFilter: 'blur(16px)',
                border: '1px solid rgba(0, 240, 255, 0.3)',
                borderRadius: '20px',
            }}
        >
            {/* Animated waveform */}
            <VoiceWaveform level={audioLevel} isActive={isListening} />
            
            {/* Live transcript */}
            {transcript && (
                <div style={{ color: '#8899AA', fontSize: 14, maxWidth: 400, textAlign: 'center' }}>
                    {transcript}
                </div>
            )}
            
            <div style={{ color: '#00F0FF', fontSize: 12 }}>
                {isListening ? 'Listening...' : 'Processing...'}
            </div>
        </motion.div>
    );
}
```

---

## 7. Task Progress Overlay

### 7.1 Task Progress Bar

```typescript
function TaskProgressBar() {
    const activeTasks = useTaskStore((s) => s.activeTasks);
    
    if (activeTasks.length === 0) return null;
    
    return (
        <div style={{
            position: 'fixed',
            bottom: 20,
            left: '50%',
            transform: 'translateX(-50%)',
        }}>
            {activeTasks.map((task) => (
                <motion.div
                    key={task.id}
                    className="overlay-panel"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{
                        width: 400,
                        padding: '12px 16px',
                        background: 'rgba(10, 14, 20, 0.9)',
                        backdropFilter: 'blur(12px)',
                        border: '1px solid rgba(0, 240, 255, 0.15)',
                        borderRadius: '12px',
                        marginBottom: 8,
                    }}
                >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                        <span style={{ color: '#E0F0FF', fontSize: 13 }}>{task.name}</span>
                        <span style={{ color: '#00F0FF', fontSize: 12 }}>
                            {task.completedSteps}/{task.totalSteps}
                        </span>
                    </div>
                    <div style={{
                        width: '100%', height: 3, background: 'rgba(255,255,255,0.1)',
                        borderRadius: 2, overflow: 'hidden',
                    }}>
                        <motion.div
                            style={{
                                height: '100%',
                                background: 'linear-gradient(90deg, #00F0FF, #7B61FF)',
                                borderRadius: 2,
                            }}
                            animate={{ width: `${(task.completedSteps / task.totalSteps) * 100}%` }}
                        />
                    </div>
                    <div style={{ color: '#556677', fontSize: 11, marginTop: 4 }}>
                        {task.currentStepDescription}
                    </div>
                </motion.div>
            ))}
        </div>
    );
}
```

---

## 8. Screen-Edge Panels

### 8.1 Edge-Docked Panels

```typescript
function ScreenEdgePanel({ edge, children }: { edge: 'left' | 'right' | 'top' | 'bottom'; children: React.ReactNode }) {
    const [isExpanded, setIsExpanded] = useState(false);
    
    const edgeStyles: Record<string, React.CSSProperties> = {
        right: {
            position: 'fixed', right: 0, top: '50%', transform: 'translateY(-50%)',
            width: isExpanded ? 350 : 4, height: 400,
            borderRadius: '12px 0 0 12px',
        },
        left: {
            position: 'fixed', left: 0, top: '50%', transform: 'translateY(-50%)',
            width: isExpanded ? 350 : 4, height: 400,
            borderRadius: '0 12px 12px 0',
        },
    };
    
    return (
        <motion.div
            className="overlay-panel"
            style={{
                ...edgeStyles[edge],
                background: isExpanded 
                    ? 'rgba(10, 14, 20, 0.92)' 
                    : 'rgba(0, 240, 255, 0.3)',
                backdropFilter: isExpanded ? 'blur(16px)' : 'none',
                border: '1px solid rgba(0, 240, 255, 0.2)',
                cursor: 'pointer',
                overflow: 'hidden',
                transition: 'width 0.3s ease',
            }}
            onMouseEnter={() => setIsExpanded(true)}
            onMouseLeave={() => setIsExpanded(false)}
        >
            {isExpanded && children}
        </motion.div>
    );
}
```

---

## 9. Transparency & Compositing

### 9.1 Visual Layer Stack

```
Layer 5: Notifications (highest z-index)
Layer 4: Voice Indicator
Layer 3: Quick Command Palette
Layer 2: Floating Panels
Layer 1: Edge Panels
Layer 0: Transparent Background (click-through)
```

### 9.2 Glass Morphism Theme

```css
/* Overlay-specific styles — lightweight, no Three.js */
.overlay-glass {
    background: rgba(10, 14, 20, 0.85);
    backdrop-filter: blur(12px) saturate(150%);
    -webkit-backdrop-filter: blur(12px) saturate(150%);
    border: 1px solid rgba(0, 240, 255, 0.12);
    box-shadow: 
        0 4px 30px rgba(0, 0, 0, 0.3),
        inset 0 1px 0 rgba(255, 255, 255, 0.05);
}

.overlay-glow {
    box-shadow: 
        0 0 20px rgba(0, 240, 255, 0.1),
        0 4px 30px rgba(0, 0, 0, 0.3);
}

.overlay-text-primary { color: #E0F0FF; }
.overlay-text-secondary { color: #8899AA; }
.overlay-text-accent { color: #00F0FF; }
```

---

## 10. Input Handling

### 10.1 Keyboard Shortcuts in Overlay

```typescript
const OVERLAY_SHORTCUTS: Record<string, () => void> = {
    'Escape': () => hideOverlay(),
    'Enter': () => submitQuickCommand(),
    'ArrowUp': () => navigateResults(-1),
    'ArrowDown': () => navigateResults(1),
    'Ctrl+V': () => startVoiceInput(),
};

function useOverlayKeyboard() {
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            const key = `${e.ctrlKey ? 'Ctrl+' : ''}${e.key}`;
            if (OVERLAY_SHORTCUTS[key]) {
                e.preventDefault();
                OVERLAY_SHORTCUTS[key]();
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, []);
}
```

---

## 11. Performance Constraints

### 11.1 Overlay Performance Budget

```
The overlay MUST be extremely lightweight:
- No Three.js / WebGL in overlay window
- No heavy animations (CSS transitions only, minimal Framer Motion)
- Idle CPU: 0% (nothing rendering when hidden)
- Active CPU: < 2%
- RAM: < 30MB total for overlay WebView
- No background timers when hidden
- RequestAnimationFrame only for voice waveform

Bundle size for overlay: < 50KB gzipped (separate from main app)
```

### 11.2 Lazy Rendering

```typescript
// Only render panels that are visible
function OverlayApp() {
    const hudState = useHUDStore((s) => s.state);
    
    // When hidden, render NOTHING
    if (hudState === 'hidden') return null;
    
    return (
        <div className="overlay-root">
            {/* Only mount components when needed */}
            <Suspense fallback={null}>
                {hudState === 'active' && <QuickCommandPalette />}
                {hudState === 'voice' && <VoiceIndicator />}
            </Suspense>
            <NotificationStack /> {/* Always mounted but conditionally renders */}
        </div>
    );
}
```

---

## 12. Activation & Hotkeys

### 12.1 Activation Methods

| Method | Trigger | Result |
|---|---|---|
| Global hotkey | `Ctrl+Space` | Toggle quick command palette |
| Voice hotkey | `Ctrl+Shift+V` | Toggle voice input |
| Overlay toggle | `Ctrl+Shift+O` | Toggle full HUD |
| Wake word | "Hey JARVIS" | Activate voice mode |
| System tray | Click tray icon | Show main window |
| Screen edge | Mouse to right edge | Expand edge panel |

### 12.2 State Machine

```
            Ctrl+Space         type/submit
  hidden ──────────────► active ──────────► processing
    ▲                      │                    │
    │                   Escape              complete
    │                      │                    │
    └──────────────────────┘◄───────────────────┘
    
           Ctrl+Shift+V
  hidden ──────────────► voice ──────► processing
    ▲                      │               │
    │                   silence         complete
    └──────────────────────┘◄──────────────┘
```

---

*This document specifies the overlay and HUD system for JARVIS. The HUD is JARVIS's ambient presence — it provides system-wide access to AI capabilities without leaving the current application.*

*Last Updated: 2026-05-19*
