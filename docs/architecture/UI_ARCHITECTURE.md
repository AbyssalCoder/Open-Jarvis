# JARVIS — UI Architecture

## Cinematic AI Operating System Interface

**Version:** 0.1.0-alpha  
**Codename:** ARC REACTOR  
**Document Type:** Frontend Architecture Specification

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Technology Stack](#2-technology-stack)
3. [Application Shell](#3-application-shell)
4. [Scene Architecture](#4-scene-architecture)
5. [Component Hierarchy](#5-component-hierarchy)
6. [State Management](#6-state-management)
7. [Routing & Navigation](#7-routing--navigation)
8. [3D Scene System](#8-3d-scene-system)
9. [HUD & Overlay Panels](#9-hud--overlay-panels)
10. [Responsive & Adaptive Design](#10-responsive--adaptive-design)
11. [Performance Architecture](#11-performance-architecture)
12. [Event System](#12-event-system)
13. [WebSocket Integration](#13-websocket-integration)
14. [Audio Integration](#14-audio-integration)
15. [Accessibility](#15-accessibility)
16. [Build & Bundle Strategy](#16-build--bundle-strategy)

---

## 1. Architecture Overview

### 1.1 Design Philosophy

The JARVIS frontend is not a traditional web application. It is a **cinematic AI operating system interface** rendered entirely in the browser engine (WebView2 via Tauri). The interface is primarily a 3D WebGL experience with HTML/CSS overlays for interactive panels.

```
┌────────────────────────────────────────────────────────────────────┐
│                        TAURI WINDOW                                │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                    WebView2 Viewport                         │  │
│  │                                                              │  │
│  │  ┌───────────────────────────────────────────────────────┐   │  │
│  │  │              THREE.JS CANVAS (Full viewport)          │   │  │
│  │  │                                                       │   │  │
│  │  │   ┌─────────────────────────────────────────────┐     │   │  │
│  │  │   │          3D SCENE                           │     │   │  │
│  │  │   │   AI Core · Particles · Environment        │     │   │  │
│  │  │   │   Agent Visualizations · Neural Networks    │     │   │  │
│  │  │   │   Holographic Elements · Reactive Systems   │     │   │  │
│  │  │   └─────────────────────────────────────────────┘     │   │  │
│  │  │                                                       │   │  │
│  │  └───────────────────────────────────────────────────────┘   │  │
│  │                                                              │  │
│  │  ┌───────────────────────────────────────────────────────┐   │  │
│  │  │          HTML/CSS OVERLAY (position: fixed)           │   │  │
│  │  │                                                       │   │  │
│  │  │   ┌─────────┐  ┌──────────┐  ┌────────────────┐      │   │  │
│  │  │   │ HUD     │  │ Chat     │  │ System Status  │      │   │  │
│  │  │   │ Elements│  │ Panel    │  │ Panel          │      │   │  │
│  │  │   └─────────┘  └──────────┘  └────────────────┘      │   │  │
│  │  │                                                       │   │  │
│  │  │   ┌─────────┐  ┌──────────┐  ┌────────────────┐      │   │  │
│  │  │   │ Voice   │  │ Terminal │  │ Agent Status   │      │   │  │
│  │  │   │ Orb     │  │ Panel    │  │ Panel          │      │   │  │
│  │  │   └─────────┘  └──────────┘  └────────────────┘      │   │  │
│  │  └───────────────────────────────────────────────────────┘   │  │
│  └──────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────┘
```

### 1.2 Layer Stack (Z-Order)

| Z-Index | Layer | Content |
|---|---|---|
| 0 | Three.js Canvas | Full-viewport 3D scene |
| 10 | Background Overlays | Ambient effects, vignettes |
| 20 | Main Panels | Chat, terminal, file browser |
| 30 | HUD Elements | Status bars, metrics, agent indicators |
| 40 | Modals | Dialogs, confirmations, settings |
| 50 | Notifications | Toast messages, alerts |
| 60 | Voice Overlay | Voice interaction UI |
| 100 | System | Critical errors, kill switch |

---

## 2. Technology Stack

### 2.1 Core Technologies

| Technology | Version | Purpose |
|---|---|---|
| **React** | 18.x | UI component framework |
| **TypeScript** | 5.x | Type safety |
| **Three.js** | r166+ | 3D rendering engine |
| **React Three Fiber** | 8.x | React binding for Three.js |
| **@react-three/drei** | 9.x | R3F utility components |
| **@react-three/postprocessing** | 2.x | Post-processing effects |
| **GSAP** | 3.12+ | Animation engine |
| **GSAP ScrollTrigger** | 3.12+ | Scroll-driven animations |
| **Framer Motion** | 11.x | React component animations |
| **TailwindCSS** | 3.x | Utility CSS framework |
| **Zustand** | 4.x | Lightweight state management |
| **Vite** | 5.x | Build tool and dev server |
| **@tauri-apps/api** | 2.x | Tauri frontend bridge |

### 2.2 Additional Libraries

| Library | Purpose |
|---|---|
| `leva` | Runtime parameter tweaking (dev mode) |
| `@react-three/rapier` | Physics (optional, for particle interactions) |
| `@pmndrs/assets` | Optimized default assets |
| `suspend-react` | Data loading for R3F |
| `zustand/middleware` | Persist, devtools for Zustand |
| `howler.js` | Audio playback |
| `tone.js` | Procedural audio synthesis (optional) |
| `xterm.js` | Terminal emulator |

---

## 3. Application Shell

### 3.1 Entry Point Structure

```tsx
// src/frontend/src/main.tsx
import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import './styles/globals.css';

const root = createRoot(document.getElementById('root')!);
root.render(<App />);
```

### 3.2 App Component

```tsx
// src/frontend/src/app/App.tsx
export function App() {
    return (
        <Providers>
            <PerformanceMonitor>
                <ThreeCanvas />
                <HUDOverlay />
                <PanelManager />
                <NotificationLayer />
                <VoiceOverlay />
                <AudioEngine />
            </PerformanceMonitor>
        </Providers>
    );
}
```

### 3.3 Provider Stack

```tsx
// src/frontend/src/app/Providers.tsx
export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <ErrorBoundary fallback={<CriticalErrorScreen />}>
            <WebSocketProvider>
                <TauriIPCProvider>
                    <StoreProvider>
                        <AudioProvider>
                            <ThemeProvider>
                                {children}
                            </ThemeProvider>
                        </AudioProvider>
                    </StoreProvider>
                </TauriIPCProvider>
            </WebSocketProvider>
        </ErrorBoundary>
    );
}
```

---

## 4. Scene Architecture

### 4.1 Scene Registry

Each major view is a **Scene** — a self-contained 3D environment with its own camera, lighting, and geometry:

| Scene | Description | Load Priority |
|---|---|---|
| `BootScene` | Startup sequence animation | Immediate |
| `ConsciousnessScene` | AI core visualization (idle state) | After boot |
| `CommandCenterScene` | Main operating view (active state) | After boot |
| `MemoryPalaceScene` | Memory visualization | On demand |
| `AgentNetworkScene` | Agent activity visualization | On demand |
| `DiagnosticsScene` | System diagnostics view | On demand |
| `ScrollytellingScene` | Onboarding/showcase experience | On first launch |

### 4.2 Scene Manager

```tsx
// src/frontend/src/scenes/SceneManager.tsx
interface SceneConfig {
    id: string;
    component: React.LazyExoticComponent<any>;
    camera: CameraConfig;
    lighting: LightingPreset;
    postProcessing: PostProcessingConfig;
    transitionIn: TransitionConfig;
    transitionOut: TransitionConfig;
    preload: string[];  // Assets to preload
}

export function SceneManager() {
    const activeScene = useStore(s => s.activeScene);
    const quality = useStore(s => s.qualityLevel);
    
    return (
        <Canvas
            gl={{ 
                antialias: quality >= QualityLevel.Medium,
                powerPreference: 'high-performance',
                alpha: true
            }}
            dpr={quality >= QualityLevel.High ? [1, 2] : [1, 1]}
            camera={{ fov: 45, near: 0.1, far: 1000 }}
        >
            <Suspense fallback={<LoadingScene />}>
                <AdaptiveQuality />
                <SceneTransition scene={activeScene}>
                    {renderScene(activeScene)}
                </SceneTransition>
                <PostProcessingStack quality={quality} />
            </Suspense>
        </Canvas>
    );
}
```

### 4.3 Scene Transitions

Transitions between scenes use GSAP timelines coordinating:
- Camera position/rotation/FOV interpolation
- Shader uniform crossfades
- Opacity transitions on 3D objects
- Post-processing parameter interpolation
- Audio crossfades

```typescript
// Scene transition timeline
const transition = gsap.timeline()
    .to(currentScene, { opacity: 0, duration: 0.5, ease: 'power2.inOut' })
    .to(camera.position, { 
        x: targetPos.x, y: targetPos.y, z: targetPos.z, 
        duration: 1.2, ease: 'power3.inOut' 
    }, '-=0.3')
    .fromTo(nextScene, 
        { opacity: 0 }, 
        { opacity: 1, duration: 0.5, ease: 'power2.inOut' }, 
        '-=0.3'
    );
```

---

## 5. Component Hierarchy

### 5.1 Component Types

| Type | Rendering | Examples |
|---|---|---|
| **3D Components** | Three.js / R3F | AI Core, particles, environments |
| **HUD Components** | HTML/CSS overlaid on canvas | Status bars, agent indicators |
| **Panel Components** | HTML/CSS with Tailwind | Chat, terminal, file browser |
| **Widget Components** | HTML/CSS compact | Clocks, meters, mini visualizers |
| **Modal Components** | HTML/CSS centered | Settings, confirmations |

### 5.2 3D Component Architecture

```
<Canvas>
  <SceneManager>
    <BootScene>
      ├── <BootLogo />
      ├── <InitializationSequence />
      └── <ParticleField />
    </BootScene>
    
    <ConsciousnessScene>
      ├── <AICore />                    ← Central consciousness visualization
      │   ├── <CoreGeometry />          ← Procedural icosahedron mesh
      │   ├── <CoreShaderMaterial />    ← Custom GLSL reactive shader
      │   ├── <EnergyField />           ← Orbiting energy particles
      │   └── <NeuralConnections />     ← Animated connection lines
      ├── <ParticleEnvironment />       ← Ambient floating particles
      ├── <HolographicGrid />           ← Ground reference grid
      ├── <DataStreams />               ← Flowing data visualizations
      └── <AmbientLighting />           ← Scene lighting rig
    </ConsciousnessScene>
    
    <CommandCenterScene>
      ├── <AICore variant="command" />
      ├── <AgentNodes />                ← Visual agent representations
      ├── <ConnectionGraph />           ← Inter-agent connections
      ├── <DataFlowRivers />            ← Streaming data paths
      ├── <HolographicDisplays />       ← Floating info panels (3D)
      └── <EnvironmentShell />          ← Surrounding environment
    </CommandCenterScene>
  </SceneManager>
</Canvas>
```

### 5.3 HUD Component Architecture

```
<HUDOverlay>
  ├── <TopBar>
  │   ├── <SystemClock />
  │   ├── <ConnectionStatus />
  │   ├── <ModelIndicator />
  │   └── <QuickActions />
  ├── <LeftSidebar>
  │   ├── <AgentStatusList />
  │   └── <TaskQueue />
  ├── <RightSidebar>
  │   ├── <SystemMetrics />
  │   │   ├── <CPUMeter />
  │   │   ├── <RAMMeter />
  │   │   ├── <GPUMeter />
  │   │   └── <NetworkIndicator />
  │   └── <QuickMemory />
  ├── <BottomBar>
  │   ├── <VoiceInputIndicator />
  │   ├── <ChatInputBar />
  │   └── <StatusMessage />
  └── <CornerWidgets>
      ├── <FPSCounter /> (dev mode)
      └── <QualityIndicator />
</HUDOverlay>
```

### 5.4 Panel Architecture

```
<PanelManager>
  ├── <ChatPanel>
  │   ├── <MessageList />
  │   ├── <StreamingMessage />
  │   ├── <ToolCallDisplay />
  │   ├── <CodeBlock />
  │   └── <ChatInput />
  ├── <TerminalPanel>
  │   ├── <XTermEmulator />
  │   └── <TerminalControls />
  ├── <FileExplorer>
  │   ├── <DirectoryTree />
  │   ├── <FilePreview />
  │   └── <SearchBar />
  ├── <CodeEditor>
  │   ├── <MonacoEditor /> (optional, heavy)
  │   └── <SimpleCodeView />
  ├── <SettingsPanel>
  │   ├── <ModelSettings />
  │   ├── <VoiceSettings />
  │   ├── <AppearanceSettings />
  │   └── <PerformanceSettings />
  └── <MemoryBrowser>
      ├── <MemoryTimeline />
      ├── <MemorySearch />
      └── <MemoryDetail />
</PanelManager>
```

---

## 6. State Management

### 6.1 Zustand Store Architecture

```typescript
// Core application store — multiple slices
interface JarvisStore {
    // Scene state
    activeScene: SceneId;
    sceneTransitioning: boolean;
    setScene: (scene: SceneId) => void;
    
    // Quality/Performance
    qualityLevel: QualityLevel;  // LOW, MEDIUM, HIGH, ULTRA
    fps: number;
    adaptiveQuality: boolean;
    setQuality: (level: QualityLevel) => void;
    
    // AI State
    isThinking: boolean;
    activeModel: string | null;
    streamingResponse: string;
    
    // Agent State
    agents: Record<string, AgentState>;
    updateAgent: (id: string, state: Partial<AgentState>) => void;
    
    // Panel State
    openPanels: PanelId[];
    panelPositions: Record<PanelId, PanelPosition>;
    togglePanel: (id: PanelId) => void;
    
    // Voice State
    voiceActive: boolean;
    micLevel: number;
    ttsPlaying: boolean;
    
    // System Metrics
    systemMetrics: SystemMetrics;
    
    // Connection
    wsConnected: boolean;
    backendStatus: 'starting' | 'ready' | 'error';
}
```

### 6.2 Store Slices

Split into focused slices for maintainability:

```typescript
const useSceneStore = create<SceneSlice>()(/* ... */);
const useAIStore = create<AISlice>()(/* ... */);
const useAgentStore = create<AgentSlice>()(/* ... */);
const usePanelStore = create<PanelSlice>()(/* ... */);
const useVoiceStore = create<VoiceSlice>()(/* ... */);
const useSystemStore = create<SystemSlice>()(/* ... */);
const useSettingsStore = create<SettingsSlice>()(
    persist(/* ... */, { name: 'jarvis-settings' })
);
```

### 6.3 Reactive Data Flow

```
WebSocket Event → Event Handler → Store Update → React Re-render
                                                      │
                                    ┌─────────────────┤
                                    │                  │
                              3D Scene Update    Panel Update
                              (useFrame hook)    (React render)
```

---

## 7. Routing & Navigation

### 7.1 Navigation Model

JARVIS uses scene-based navigation, NOT URL-based routing:

```typescript
enum SceneId {
    BOOT = 'boot',
    CONSCIOUSNESS = 'consciousness',
    COMMAND_CENTER = 'command-center',
    MEMORY_PALACE = 'memory-palace',
    AGENT_NETWORK = 'agent-network',
    DIAGNOSTICS = 'diagnostics',
    SCROLLYTELLING = 'scrollytelling'
}

// Navigation is a 3D camera transition, not a page change
function navigateToScene(scene: SceneId) {
    const store = useStore.getState();
    if (store.sceneTransitioning) return;
    
    store.setSceneTransitioning(true);
    // GSAP timeline handles the visual transition
    transitionTimeline(store.activeScene, scene).then(() => {
        store.setScene(scene);
        store.setSceneTransitioning(false);
    });
}
```

### 7.2 Keyboard Navigation

| Shortcut | Action |
|---|---|
| `Ctrl+Space` | Toggle JARVIS (global hotkey via Tauri) |
| `Ctrl+Shift+C` | Open/focus chat panel |
| `Ctrl+Shift+T` | Open/focus terminal panel |
| `Ctrl+Shift+M` | Toggle voice mode |
| `Ctrl+1-6` | Navigate to scene (1=consciousness, 2=command, etc.) |
| `Escape` | Close active panel / cancel operation |
| `Tab` | Cycle through open panels |

---

## 8. 3D Scene System

### 8.1 Rendering Pipeline

```
Frame Start
     │
     ├── useFrame hooks (physics, animation updates)
     │
     ├── Scene Graph Traversal
     │   ├── Update uniforms (time, audio, activity)
     │   ├── Update transforms (GSAP-driven positions)
     │   └── Update materials (reactive shader params)
     │
     ├── Three.js Render Pass
     │   ├── Opaque objects (front-to-back)
     │   ├── Transparent objects (back-to-front)
     │   └── Instanced objects (batched draw calls)
     │
     ├── Post-Processing Stack
     │   ├── Bloom (selective, threshold-based)
     │   ├── ChromaticAberration (subtle)
     │   ├── Vignette
     │   ├── Color grading (LUT)
     │   └── FXAA / SMAA
     │
     └── Composite to screen
```

### 8.2 Custom Shader Architecture

```glsl
// Example: AI Core reactive shader
// src/frontend/src/three/shaders/aiCore.frag

uniform float uTime;
uniform float uActivity;       // 0.0 - 1.0, from agent activity
uniform float uAudioLevel;     // 0.0 - 1.0, from microphone
uniform float uThinking;       // 0.0 - 1.0, during LLM inference
uniform vec3 uBaseColor;       // Primary color
uniform vec3 uAccentColor;     // Secondary color

varying vec3 vNormal;
varying vec3 vPosition;
varying vec2 vUv;

// Noise functions for organic movement
float noise3D(vec3 p) { /* simplex noise */ }

void main() {
    // Base fresnel glow
    float fresnel = pow(1.0 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 3.0);
    
    // Pulsing energy based on activity
    float pulse = sin(uTime * 2.0 + vPosition.y * 5.0) * 0.5 + 0.5;
    pulse *= uActivity;
    
    // Audio reactivity — distort surface
    float audioWave = sin(vPosition.x * 10.0 + uTime * 3.0) * uAudioLevel;
    
    // Thinking state — rapid subtle patterns
    float thinkPattern = noise3D(vPosition * 20.0 + uTime * 5.0) * uThinking;
    
    // Combine
    vec3 color = mix(uBaseColor, uAccentColor, fresnel + pulse);
    color += vec3(thinkPattern * 0.3);
    
    float alpha = fresnel * 0.8 + pulse * 0.3 + 0.2;
    
    gl_FragColor = vec4(color, alpha);
}
```

### 8.3 Procedural Geometry Systems

| System | Geometry Type | Purpose |
|---|---|---|
| AI Core | Morphing icosahedron | Central intelligence representation |
| Neural Network | Instanced lines + spheres | Agent connections |
| Data Streams | GPU instanced particles on curves | Information flow |
| Energy Field | Point cloud with custom shader | Ambient energy |
| Holographic Grid | Grid lines with fade | Ground reference |
| Memory Nodes | Instanced spheres | Memory visualization |
| Environment Shell | Hexagonal shell segments | Surrounding enclosure |

### 8.4 GPU Instancing

For particle-heavy scenes, use instanced rendering:

```tsx
function DataParticles({ count = 10000 }) {
    const meshRef = useRef<THREE.InstancedMesh>(null);
    const dummy = useMemo(() => new THREE.Object3D(), []);
    
    useFrame(({ clock }) => {
        if (!meshRef.current) return;
        const time = clock.elapsedTime;
        
        for (let i = 0; i < count; i++) {
            // Update instance transforms on GPU
            dummy.position.set(
                Math.sin(time + i * 0.01) * 5,
                (i / count) * 10 - 5,
                Math.cos(time + i * 0.01) * 5
            );
            dummy.updateMatrix();
            meshRef.current.setMatrixAt(i, dummy.matrix);
        }
        meshRef.current.instanceMatrix.needsUpdate = true;
    });
    
    return (
        <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
            <sphereGeometry args={[0.02, 4, 4]} />
            <meshBasicMaterial color="#00aaff" transparent opacity={0.6} />
        </instancedMesh>
    );
}
```

---

## 9. HUD & Overlay Panels

### 9.1 Panel System

Panels are draggable, resizable, dockable UI regions overlaid on the 3D scene:

```typescript
interface PanelConfig {
    id: PanelId;
    title: string;
    icon: string;
    defaultPosition: { x: number; y: number };
    defaultSize: { width: number; height: number };
    minSize: { width: number; height: number };
    maxSize: { width: number; height: number };
    resizable: boolean;
    draggable: boolean;
    closable: boolean;
    collapsible: boolean;
    dockable: boolean;
    transparent: boolean;     // Glass-morphism effect
    zIndex: number;
}
```

### 9.2 Glass-Morphism Design

All panels use a glass-morphism aesthetic:

```css
.panel {
    background: rgba(10, 15, 30, 0.75);
    backdrop-filter: blur(20px) saturate(1.5);
    border: 1px solid rgba(100, 180, 255, 0.15);
    border-radius: 12px;
    box-shadow: 
        0 8px 32px rgba(0, 0, 0, 0.4),
        inset 0 1px 0 rgba(255, 255, 255, 0.05);
}

.panel-header {
    background: rgba(100, 180, 255, 0.08);
    border-bottom: 1px solid rgba(100, 180, 255, 0.1);
}

.panel:hover {
    border-color: rgba(100, 180, 255, 0.3);
    box-shadow: 
        0 8px 32px rgba(0, 0, 0, 0.5),
        0 0 20px rgba(100, 180, 255, 0.05),
        inset 0 1px 0 rgba(255, 255, 255, 0.08);
}
```

### 9.3 Panel Layout Presets

| Preset | Description | Layout |
|---|---|---|
| **Focus** | Chat only, full width bottom | Minimal panels |
| **Command** | Chat + Terminal + Status | 3-panel layout |
| **Developer** | Chat + Terminal + Code + Files | 4-panel IDE-like |
| **Monitor** | System metrics + Agent status | Dashboard view |
| **Cinematic** | No panels, full 3D experience | Immersive mode |

---

## 10. Responsive & Adaptive Design

### 10.1 Quality Levels

```typescript
enum QualityLevel {
    LOW = 0,      // CPU-only systems, integrated graphics
    MEDIUM = 1,   // Basic dedicated GPU (2-4GB VRAM)
    HIGH = 2,     // Good GPU (6-8GB VRAM)
    ULTRA = 3     // High-end GPU (12GB+ VRAM)
}

const QUALITY_CONFIGS: Record<QualityLevel, QualityConfig> = {
    [QualityLevel.LOW]: {
        dpr: 1,
        maxParticles: 1000,
        postProcessing: false,
        shadows: false,
        bloom: false,
        antialias: false,
        targetFPS: 30,
        instanceLimit: 5000,
        shaderComplexity: 'simple',
        animationDetail: 'reduced'
    },
    [QualityLevel.MEDIUM]: {
        dpr: 1,
        maxParticles: 5000,
        postProcessing: true,
        shadows: false,
        bloom: true,
        antialias: true,
        targetFPS: 60,
        instanceLimit: 20000,
        shaderComplexity: 'standard',
        animationDetail: 'standard'
    },
    [QualityLevel.HIGH]: {
        dpr: [1, 1.5],
        maxParticles: 20000,
        postProcessing: true,
        shadows: true,
        bloom: true,
        antialias: true,
        targetFPS: 60,
        instanceLimit: 50000,
        shaderComplexity: 'advanced',
        animationDetail: 'full'
    },
    [QualityLevel.ULTRA]: {
        dpr: [1, 2],
        maxParticles: 50000,
        postProcessing: true,
        shadows: true,
        bloom: true,
        antialias: true,
        targetFPS: 60,
        instanceLimit: 100000,
        shaderComplexity: 'cinematic',
        animationDetail: 'cinematic'
    }
};
```

### 10.2 Adaptive Quality System

```typescript
function useAdaptiveQuality() {
    const setQuality = useStore(s => s.setQuality);
    const currentQuality = useStore(s => s.qualityLevel);
    
    const fpsHistory = useRef<number[]>([]);
    
    useFrame((_, delta) => {
        const fps = 1 / delta;
        fpsHistory.current.push(fps);
        
        // Keep last 60 frames (1 second at 60fps)
        if (fpsHistory.current.length > 60) {
            fpsHistory.current.shift();
        }
        
        // Check every 2 seconds
        if (fpsHistory.current.length === 60) {
            const avgFps = fpsHistory.current.reduce((a, b) => a + b) / 60;
            
            if (avgFps < 25 && currentQuality > QualityLevel.LOW) {
                setQuality(currentQuality - 1);  // Downgrade
            } else if (avgFps > 55 && currentQuality < QualityLevel.ULTRA) {
                setQuality(currentQuality + 1);  // Upgrade
            }
            
            fpsHistory.current = [];
        }
    });
}
```

### 10.3 Window Size Handling

| Window Size | Behavior |
|---|---|
| < 800px width | Compact mode: stack panels, reduce HUD |
| 800-1200px | Standard: side-by-side panels |
| 1200-1920px | Full: all HUD elements visible |
| > 1920px | Extended: larger panels, more detail |
| Multi-monitor | Overlay windows on secondary monitors |

---

## 11. Performance Architecture

### 11.1 Render Budget

Target: **16.67ms per frame** (60fps)

| Phase | Budget | Strategy |
|---|---|---|
| JavaScript/React | 4ms | Memoization, selective re-renders |
| Three.js scene graph | 2ms | Frustum culling, LOD |
| GPU draw calls | 6ms | Instancing, batching, merging |
| Post-processing | 3ms | Adaptive quality |
| React DOM overlay | 1.5ms | CSS containment, will-change |
| **Total** | **16.5ms** | — |

### 11.2 React Performance

```typescript
// Memoize expensive computations
const agentNodes = useMemo(() => 
    agents.map(a => createAgentNode(a)), 
    [agents.map(a => a.status).join(',')]
);

// Prevent unnecessary re-renders
const ChatMessage = memo(function ChatMessage({ message }: Props) {
    return <div className="message">{message.content}</div>;
});

// Use refs for frequently updating values (avoid re-renders)
const micLevelRef = useRef(0);
useEffect(() => {
    const unsubscribe = audioEngine.onLevel((level) => {
        micLevelRef.current = level;  // No re-render
        // Pass to shader via uniform ref
    });
    return unsubscribe;
}, []);
```

### 11.3 Three.js Performance

| Technique | Implementation |
|---|---|
| **Instancing** | All repeated geometry uses InstancedMesh |
| **LOD** | Distance-based detail levels for complex objects |
| **Frustum Culling** | Automatic (Three.js default) |
| **Object Pooling** | Reuse particle objects instead of creating/destroying |
| **Texture Atlasing** | Combine small textures into atlases |
| **Geometry Merging** | Static geometry merged into single draw call |
| **Shader Caching** | Compile shaders once, reuse programs |
| **Dispose on unmount** | Properly dispose geometry, materials, textures |

### 11.4 Memory Management

```typescript
// Automatic disposal on component unmount
function useDisposable<T extends { dispose: () => void }>(
    factory: () => T, deps: any[]
): T {
    const ref = useRef<T>();
    
    useEffect(() => {
        ref.current = factory();
        return () => {
            ref.current?.dispose();
        };
    }, deps);
    
    return ref.current!;
}

// Example: properly dispose a render target
const renderTarget = useDisposable(
    () => new THREE.WebGLRenderTarget(1024, 1024),
    []
);
```

---

## 12. Event System

### 12.1 Frontend Event Bus

```typescript
// src/frontend/src/core/events/EventBus.ts
type EventHandler<T = any> = (data: T) => void;

class FrontendEventBus {
    private handlers: Map<string, Set<EventHandler>> = new Map();
    
    on<T>(event: string, handler: EventHandler<T>): () => void {
        if (!this.handlers.has(event)) {
            this.handlers.set(event, new Set());
        }
        this.handlers.get(event)!.add(handler);
        return () => this.handlers.get(event)?.delete(handler);
    }
    
    emit<T>(event: string, data: T): void {
        this.handlers.get(event)?.forEach(handler => handler(data));
    }
    
    once<T>(event: string, handler: EventHandler<T>): () => void {
        const wrapped: EventHandler<T> = (data) => {
            handler(data);
            this.handlers.get(event)?.delete(wrapped);
        };
        return this.on(event, wrapped);
    }
}

export const eventBus = new FrontendEventBus();
```

### 12.2 Event-Driven 3D Updates

```typescript
// 3D scene reacts to backend events
function useBackendEvents() {
    useEffect(() => {
        const unsubs = [
            eventBus.on('agent.status', (data) => {
                // Update agent visualization
                useAgentStore.getState().updateAgent(data.agentId, data);
            }),
            eventBus.on('ai.thinking', (data) => {
                // Activate thinking animation
                useAIStore.getState().setThinking(data.active);
            }),
            eventBus.on('system.metrics', (data) => {
                // Update system visualizations
                useSystemStore.getState().setMetrics(data);
            }),
        ];
        return () => unsubs.forEach(fn => fn());
    }, []);
}
```

---

## 13. WebSocket Integration

### 13.1 WebSocket Client

```typescript
// src/frontend/src/core/websocket/WebSocketClient.ts
class JarvisWebSocket {
    private ws: WebSocket | null = null;
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 10;
    private messageQueue: any[] = [];
    
    async connect(url: string = 'ws://localhost:8765/ws') {
        return new Promise<void>((resolve, reject) => {
            this.ws = new WebSocket(url);
            
            this.ws.onopen = () => {
                this.reconnectAttempts = 0;
                this.flushQueue();
                resolve();
            };
            
            this.ws.onmessage = (event) => {
                const message = JSON.parse(event.data);
                this.handleMessage(message);
            };
            
            this.ws.onclose = () => {
                this.scheduleReconnect();
            };
            
            this.ws.onerror = (error) => {
                reject(error);
            };
        });
    }
    
    send(type: string, data: any) {
        const message = { type, data, id: crypto.randomUUID(), timestamp: Date.now() };
        
        if (this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(message));
        } else {
            this.messageQueue.push(message);
        }
    }
    
    private handleMessage(message: WSMessage) {
        // Route to event bus
        eventBus.emit(message.type, message.data);
        
        // Handle specific message types
        switch (message.type) {
            case 'ai.token':
                useAIStore.getState().appendToken(message.data.token);
                break;
            case 'ai.complete':
                useAIStore.getState().completeResponse(message.data);
                break;
            case 'voice.tts.chunk':
                audioEngine.queueTTSChunk(message.data.audio);
                break;
        }
    }
    
    private scheduleReconnect() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) return;
        
        const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
        this.reconnectAttempts++;
        setTimeout(() => this.connect(), delay);
    }
}
```

---

## 14. Audio Integration

### 14.1 Audio Engine

```typescript
// src/frontend/src/audio/AudioEngine.ts
class AudioEngine {
    private howlInstances: Map<string, Howl> = new Map();
    private ambientPlaying = false;
    private masterVolume = 0.3;
    
    // Sound categories
    readonly SOUNDS = {
        // UI Interactions
        UI_CLICK: 'ui_click',
        UI_HOVER: 'ui_hover',
        UI_OPEN: 'ui_open',
        UI_CLOSE: 'ui_close',
        
        // AI Events
        AI_WAKE: 'ai_wake',
        AI_THINKING: 'ai_thinking',
        AI_RESPONSE: 'ai_response',
        AI_COMPLETE: 'ai_complete',
        
        // System
        BOOT_SEQUENCE: 'boot_sequence',
        NOTIFICATION: 'notification',
        ERROR: 'error',
        SUCCESS: 'success',
        
        // Ambient
        AMBIENT_HUM: 'ambient_hum',
        AMBIENT_DIGITAL: 'ambient_digital',
    };
    
    async initialize() {
        // Preload essential sounds
        await this.preload([
            this.SOUNDS.UI_CLICK,
            this.SOUNDS.AI_WAKE,
            this.SOUNDS.NOTIFICATION,
            this.SOUNDS.BOOT_SEQUENCE
        ]);
    }
    
    play(soundId: string, options?: { volume?: number; loop?: boolean }) {
        const howl = this.howlInstances.get(soundId);
        if (howl) {
            howl.volume((options?.volume ?? 1) * this.masterVolume);
            howl.loop(options?.loop ?? false);
            howl.play();
        }
    }
    
    // TTS Audio Queue for streaming voice output
    private ttsQueue: AudioBuffer[] = [];
    private ttsPlaying = false;
    
    async queueTTSChunk(audioData: ArrayBuffer) {
        const audioContext = new AudioContext();
        const buffer = await audioContext.decodeAudioData(audioData);
        this.ttsQueue.push(buffer);
        
        if (!this.ttsPlaying) {
            this.playNextTTSChunk();
        }
    }
}
```

### 14.2 Microphone Input (for 3D reactivity)

```typescript
class MicrophoneAnalyzer {
    private analyser: AnalyserNode | null = null;
    private dataArray: Uint8Array | null = null;
    
    async start() {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const audioContext = new AudioContext();
        const source = audioContext.createMediaStreamSource(stream);
        this.analyser = audioContext.createAnalyser();
        this.analyser.fftSize = 256;
        source.connect(this.analyser);
        this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    }
    
    getLevel(): number {
        if (!this.analyser || !this.dataArray) return 0;
        this.analyser.getByteFrequencyData(this.dataArray);
        const average = this.dataArray.reduce((a, b) => a + b) / this.dataArray.length;
        return average / 255; // Normalize to 0-1
    }
    
    getFrequencyData(): Uint8Array | null {
        if (!this.analyser || !this.dataArray) return null;
        this.analyser.getByteFrequencyData(this.dataArray);
        return this.dataArray;
    }
}
```

---

## 15. Accessibility

### 15.1 Accessibility Strategy

While JARVIS is primarily a visual experience, core functionality must be accessible:

| Feature | Accessibility |
|---|---|
| Chat interface | Full keyboard navigation, screen reader support |
| Terminal | Standard terminal accessibility |
| Settings | ARIA labels, keyboard navigation |
| Notifications | Screen reader announcements |
| Voice interaction | Primary accessible input method |
| 3D scenes | Decorative — `aria-hidden="true"` |

### 15.2 Keyboard Focus Management

- `Tab` cycles through interactive elements
- `Escape` closes panels/modals
- Arrow keys navigate within panels
- `Enter` activates focused elements
- Focus trap in modal dialogs
- Visible focus indicators on all interactive elements

---

## 16. Build & Bundle Strategy

### 16.1 Vite Configuration

```typescript
// vite.config.ts
export default defineConfig({
    plugins: [react()],
    build: {
        target: 'esnext',
        rollupOptions: {
            output: {
                manualChunks: {
                    'three': ['three'],
                    'r3f': ['@react-three/fiber', '@react-three/drei'],
                    'gsap': ['gsap'],
                    'ui': ['framer-motion'],
                }
            }
        },
        chunkSizeWarningLimit: 500,
        sourcemap: false,  // Production
    },
    optimizeDeps: {
        include: ['three', '@react-three/fiber']
    }
});
```

### 16.2 Bundle Size Targets

| Chunk | Target Size | Actual (Estimated) |
|---|---|---|
| Main (React + App) | < 100KB | ~80KB |
| Three.js | < 200KB | ~160KB |
| R3F + Drei | < 100KB | ~80KB |
| GSAP | < 40KB | ~35KB |
| Shaders | < 20KB | ~15KB |
| Styles (Tailwind) | < 30KB | ~25KB |
| **Total Initial** | **< 500KB** | ~395KB |
| Lazy scenes | ~50-200KB each | On demand |

### 16.3 Asset Pipeline

```
Source Assets
     │
     ├── 3D Models (.blend, .fbx)
     │   └── Export as .glb (Draco compressed)
     │   └── LOD variants for quality levels
     │
     ├── Textures (.png, .jpg)
     │   └── Compress to .ktx2 (Basis Universal)
     │   └── Generate mipmaps
     │   └── Multiple resolutions for quality levels
     │
     ├── HDRIs (.hdr)
     │   └── Convert to .env (prefiltered)
     │   └── Low-res preview for loading
     │
     ├── Audio (.wav)
     │   └── Compress to .webm (Opus) + .mp3 (fallback)
     │   └── Sprite sheets for short sounds
     │
     └── Fonts (.ttf)
         └── Subset to used characters
         └── WOFF2 format
```

---

*This document defines the complete frontend architecture for JARVIS. All UI implementation should follow these patterns and principles.*

*Last Updated: 2026-05-19*
