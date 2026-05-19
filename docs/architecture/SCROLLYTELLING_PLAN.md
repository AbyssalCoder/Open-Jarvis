# JARVIS — Scrollytelling & Cinematic Onboarding Plan

## Cinematic Scroll-Driven Introduction Experience

**Version:** 0.1.0-alpha  
**Document Type:** Architecture Specification  
**Module:** Frontend → Scrollytelling Engine

---

## Table of Contents

1. [Overview](#1-overview)
2. [Scroll Engine Architecture](#2-scroll-engine-architecture)
3. [Scene Sequence](#3-scene-sequence)
4. [Scene 1: The Void — Awakening](#4-scene-1-the-void--awakening)
5. [Scene 2: Neural Genesis — Consciousness Forms](#5-scene-2-neural-genesis--consciousness-forms)
6. [Scene 3: Agent Constellation — The Network](#6-scene-3-agent-constellation--the-network)
7. [Scene 4: Capability Showcase — Power Revealed](#7-scene-4-capability-showcase--power-revealed)
8. [Scene 5: Voice Activation — First Contact](#8-scene-5-voice-activation--first-contact)
9. [Scene 6: The Handoff — Enter JARVIS](#9-scene-6-the-handoff--enter-jarvis)
10. [Technical Implementation](#10-technical-implementation)
11. [Typography & Text Animation](#11-typography--text-animation)
12. [Audio Design](#12-audio-design)
13. [Performance Strategy](#13-performance-strategy)
14. [Skip & Accessibility](#14-skip--accessibility)

---

## 1. Overview

### 1.1 Purpose

The scrollytelling sequence is the first thing a user sees when launching JARVIS for the first time. It is a cinematic, scroll-driven experience that introduces the AI system's personality, capabilities, and interface — transforming a cold product launch into an emotional, memorable event.

### 1.2 Inspiration References

- Apple product reveal pages (scroll-driven camera animation)
- Awwwards-winning WebGL experiences
- Iron Man's JARVIS boot sequence
- Three.js showcase projects (particles, morphing geometry)
- GSAP ScrollTrigger-driven storytelling sites

### 1.3 Core Principles

| Principle | Implementation |
|---|---|
| **Never boring** | Every scroll pixel triggers visual change |
| **Progressive reveal** | Information layers in at the right moment |
| **Emotional arc** | Curiosity → Awe → Understanding → Excitement |
| **Performance-first** | Must maintain 60fps on 8GB RAM machines |
| **Skippable** | "Skip to JARVIS" button always visible |

### 1.4 Duration & Length

- **Scroll length:** ~6000vh (6x viewport heights)
- **Estimated read time:** 60–90 seconds at comfortable scroll speed
- **6 scenes** with seamless transitions
- **First-launch only** — Subsequent launches skip to main interface
- **Replay available** in Settings → "Watch Introduction"

---

## 2. Scroll Engine Architecture

### 2.1 Technical Stack

```typescript
// Core dependencies
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useScroll } from '@react-three/drei';
```

### 2.2 Scroll Progress System

```typescript
interface ScrollState {
  totalProgress: number;       // 0..1 across entire experience
  sceneIndex: number;          // 0..5 current scene
  sceneProgress: number;       // 0..1 within current scene
  velocity: number;            // scroll speed for momentum effects
  direction: 'up' | 'down';   // scroll direction
}

// Scene boundaries (normalized 0..1)
const SCENE_BOUNDARIES = [
  { id: 'void',          start: 0.000, end: 0.167 },  // Scene 1
  { id: 'neural',        start: 0.167, end: 0.333 },  // Scene 2
  { id: 'constellation', start: 0.333, end: 0.500 },  // Scene 3
  { id: 'capabilities',  start: 0.500, end: 0.667 },  // Scene 4
  { id: 'voice',         start: 0.667, end: 0.833 },  // Scene 5
  { id: 'handoff',       start: 0.833, end: 1.000 },  // Scene 6
];
```

### 2.3 GSAP ScrollTrigger Configuration

```typescript
const masterTimeline = gsap.timeline({
  scrollTrigger: {
    trigger: '.scrollytelling-container',
    start: 'top top',
    end: 'bottom bottom',
    scrub: 1.5,               // Smooth 1.5s lag behind scroll
    pin: '.canvas-container', // Pin the 3D canvas
    anticipatePin: 1,
  }
});
```

### 2.4 Component Architecture

```
<ScrollytellingExperience>
├── <ScrollContainer>          ← 6000vh scroll area
│   ├── <SceneMarkers/>        ← Invisible scroll anchors
│   └── <TextOverlays/>        ← HTML text that appears at scroll positions
├── <PinnedCanvas>             ← Fixed R3F Canvas (covers viewport)
│   ├── <ScrollCamera/>        ← Camera animated by scroll
│   ├── <Scene1_Void/>
│   ├── <Scene2_Neural/>
│   ├── <Scene3_Constellation/>
│   ├── <Scene4_Capabilities/>
│   ├── <Scene5_Voice/>
│   └── <Scene6_Handoff/>
├── <HUDOverlay/>              ← Progress indicator, skip button
└── <AudioController/>         ← Ambient sound management
```

---

## 3. Scene Sequence

### 3.1 Narrative Arc

```
EMOTIONAL JOURNEY:

  CURIOSITY     AWE        UNDERSTANDING    EXCITEMENT     CONNECTION     IMMERSION
     │           │              │               │              │             │
     ▼           ▼              ▼               ▼              ▼             ▼
  ┌──────┐  ┌──────────┐  ┌───────────┐  ┌───────────┐  ┌──────────┐  ┌─────────┐
  │ VOID │→ │ NEURAL   │→ │ AGENT     │→ │CAPABILITY │→ │ VOICE    │→ │ HANDOFF │
  │      │  │ GENESIS  │  │ CONSTEL.  │  │ SHOWCASE  │  │ ACTIVATE │  │         │
  └──────┘  └──────────┘  └───────────┘  └───────────┘  └──────────┘  └─────────┘
  "What     "It's...      "It has a     "It can do    "I can talk   "Welcome."
  is        alive."       network."     all THIS?"    to it."
  this?"
```

### 3.2 Scene Timing Table

| Scene | Scroll Range | Duration (vh) | Key Visual | Key Text |
|---|---|---|---|---|
| 1. Void | 0–17% | 1000vh | Single photon in darkness | "From nothing..." |
| 2. Neural Genesis | 17–33% | 1000vh | Particle explosion → AI core forms | "...consciousness awakens" |
| 3. Agent Constellation | 33–50% | 1000vh | 20 agent nodes orbit and connect | "A network of intelligence" |
| 4. Capabilities | 50–67% | 1000vh | Feature cards fly in with demos | "Code. Browse. Create. Control." |
| 5. Voice | 67–83% | 1000vh | Waveform visualization | "Speak. I'm listening." |
| 6. Handoff | 83–100% | 1000vh | Camera zooms into AI core → main UI | "Welcome to JARVIS." |

---

## 4. Scene 1: The Void — Awakening

### 4.1 Visual Description

The screen is pure black. As the user begins scrolling, a single particle of light appears at the center — barely visible, pulsing with a subtle cyan glow. As scrolling continues, the particle grows brighter, emitting faint rays. The camera slowly dollies toward the light.

### 4.2 Scroll Keyframes

```
0% → 3%:   Pure black. Text fades in: "Imagine..."
3% → 6%:   Single particle appears, barely visible (opacity 0→0.3)
6% → 10%:  Particle brightens (opacity 0.3→1.0), subtle pulse begins
10% → 14%: Particle emits first rays of light. Text: "An intelligence..."
14% → 17%: Light expands into a lens flare. Camera accelerates toward it
           Text: "...designed for you."
           TRANSITION: Light fills screen → white flash → Scene 2
```

### 4.3 Implementation

```typescript
function Scene1_Void({ progress }: { progress: number }) {
  const particleRef = useRef<THREE.PointLight>(null);
  const localProgress = remapProgress(progress, 0, 0.167);

  // Particle appearance
  const opacity = gsap.utils.clamp(0, 1,
    gsap.utils.mapRange(0.18, 0.6, 0, 1, localProgress)
  );

  // Pulse animation
  const pulseScale = 1 + Math.sin(localProgress * Math.PI * 4) * 0.1;

  // Camera dolly
  const cameraZ = gsap.utils.interpolate(50, 5, localProgress);

  return (
    <group>
      {/* Central photon */}
      <mesh scale={pulseScale * opacity}>
        <sphereGeometry args={[0.05, 16, 16]} />
        <meshBasicMaterial color="#00F0FF" transparent opacity={opacity} />
      </mesh>

      {/* Light rays (appear at 60% scene progress) */}
      {localProgress > 0.6 && (
        <GodRays
          intensity={gsap.utils.mapRange(0.6, 1, 0, 2, localProgress)}
          color="#00F0FF"
        />
      )}

      {/* Bloom post-processing */}
      <EffectComposer>
        <Bloom
          intensity={opacity * 1.5}
          luminanceThreshold={0.2}
        />
      </EffectComposer>
    </group>
  );
}
```

### 4.4 Text Overlays

```typescript
const scene1Text = [
  { text: "Imagine...", start: 0.00, end: 0.15, style: 'hero' },
  { text: "An intelligence...", start: 0.55, end: 0.80, style: 'hero' },
  { text: "...designed for you.", start: 0.80, end: 1.00, style: 'hero-accent' },
];
```

---

## 5. Scene 2: Neural Genesis — Consciousness Forms

### 5.1 Visual Description

From the white flash, thousands of particles explode outward like a Big Bang. They swirl chaotically, then begin organizing into neural pathways. The particles coalesce into the JARVIS AI core — a morphing icosphere with glowing wireframe edges and internal light. The core "breathes" — expanding and contracting as if coming alive.

### 5.2 Scroll Keyframes

```
17% → 20%: White flash fades. Particle explosion outward (1000+ particles)
20% → 24%: Particles orbit chaotically, trails visible
24% → 28%: Particles begin organizing into spiral patterns
28% → 30%: Text: "From chaos..." Neural pathways form between particles
30% → 33%: Particles converge into AI core geometry
            Text: "...consciousness awakens."
            AI core "breathes" for the first time
            TRANSITION: Camera orbits to reveal agent network behind
```

### 5.3 Implementation

```typescript
function Scene2_NeuralGenesis({ progress }: { progress: number }) {
  const localProgress = remapProgress(progress, 0.167, 0.333);
  const particlesRef = useRef<THREE.Points>(null);

  // Phase 1: Explosion (0-30%)
  // Phase 2: Organization (30-60%)
  // Phase 3: Convergence (60-100%)

  const particleCount = 2000;
  const positions = useMemo(() => {
    const pos = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      // Start at center, will animate outward
      pos[i * 3] = 0;
      pos[i * 3 + 1] = 0;
      pos[i * 3 + 2] = 0;
    }
    return pos;
  }, []);

  useFrame(() => {
    if (!particlesRef.current) return;
    const geo = particlesRef.current.geometry;
    const posAttr = geo.attributes.position;

    for (let i = 0; i < particleCount; i++) {
      if (localProgress < 0.3) {
        // Explosion phase
        const angle = (i / particleCount) * Math.PI * 2 * 5;
        const radius = localProgress * 20;
        posAttr.setXYZ(i,
          Math.cos(angle + i) * radius * (Math.random() * 0.5 + 0.5),
          Math.sin(angle * 0.7 + i) * radius * (Math.random() * 0.5 + 0.5),
          Math.cos(angle * 1.3 + i) * radius * 0.3
        );
      } else if (localProgress < 0.6) {
        // Organization phase — spiral toward center
        const orgProgress = (localProgress - 0.3) / 0.3;
        const currentRadius = 20 * (1 - orgProgress * 0.7);
        const angle = (i / particleCount) * Math.PI * 2 + orgProgress * Math.PI;
        posAttr.setXYZ(i,
          Math.cos(angle) * currentRadius * (1 - orgProgress * 0.5),
          Math.sin(angle) * currentRadius * (1 - orgProgress * 0.5),
          Math.sin(i * 0.01 + orgProgress * 2) * currentRadius * 0.2
        );
      } else {
        // Convergence phase — form AI core surface
        const convProgress = (localProgress - 0.6) / 0.4;
        const phi = Math.acos(-1 + (2 * i) / particleCount);
        const theta = Math.sqrt(particleCount * Math.PI) * phi;
        const coreRadius = 2;
        const currentRadius = gsap.utils.interpolate(6, coreRadius, convProgress);
        posAttr.setXYZ(i,
          currentRadius * Math.cos(theta) * Math.sin(phi),
          currentRadius * Math.sin(theta) * Math.sin(phi),
          currentRadius * Math.cos(phi)
        );
      }
    }
    posAttr.needsUpdate = true;
  });

  return (
    <group>
      <points ref={particlesRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={particleCount}
            array={positions}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.05}
          color="#00F0FF"
          transparent
          opacity={0.8}
          blending={THREE.AdditiveBlending}
        />
      </points>

      {/* AI Core appears at convergence */}
      {localProgress > 0.7 && (
        <AICoreGeometry
          opacity={(localProgress - 0.7) / 0.3}
          breatheIntensity={(localProgress - 0.7) / 0.3}
        />
      )}
    </group>
  );
}
```

---

## 6. Scene 3: Agent Constellation — The Network

### 6.1 Visual Description

The camera pulls back to reveal the AI core is not alone. Around it, 20 smaller nodes begin appearing — each representing a specialized agent. Lines of light connect them to the core and to each other, forming a neural constellation. Each node has a subtle icon/label identifying its role: Voice, Memory, Vision, Coding, etc.

### 6.2 Scroll Keyframes

```
33% → 36%: Camera pulls back. First 5 agent nodes appear (Tier 0-1)
36% → 40%: Next 5 nodes appear (Tier 2). Connection lines animate between them
40% → 44%: Remaining 10 nodes appear (Tier 3-5). Full constellation visible
44% → 47%: Text: "20 specialized agents." Connection lines pulse with data flow
47% → 50%: One agent lights up brighter. Label reveals: "Voice Agent"
            Text: "Each one an expert."
            TRANSITION: Camera zooms to capability showcase angle
```

### 6.3 Agent Node Data

```typescript
const AGENT_NODES = [
  // Tier 0 - Core
  { id: 'brain', label: 'Brain', icon: '🧠', tier: 0, color: '#00F0FF', position: [0, 0, 0] },

  // Tier 1 - Essential
  { id: 'voice', label: 'Voice', icon: '🎙️', tier: 1, color: '#7B61FF', position: [3, 2, 0] },
  { id: 'memory', label: 'Memory', icon: '💾', tier: 1, color: '#00D1FF', position: [-3, 2, 0] },
  { id: 'vision', label: 'Vision', icon: '👁️', tier: 1, color: '#FF6B6B', position: [0, 3, 2] },

  // Tier 2 - Action
  { id: 'coding', label: 'Coding', icon: '💻', tier: 2, color: '#4ADE80', position: [4, 0, 2] },
  { id: 'terminal', label: 'Terminal', icon: '⚡', tier: 2, color: '#FB923C', position: [-4, 0, 2] },
  { id: 'web', label: 'Web', icon: '🌐', tier: 2, color: '#F472B6', position: [2, -3, 1] },
  { id: 'file', label: 'Files', icon: '📁', tier: 2, color: '#A78BFA', position: [-2, -3, 1] },

  // Tier 3 - Extended
  { id: 'productivity', label: 'Productivity', icon: '📊', tier: 3, color: '#FFD93D', position: [5, 3, -1] },
  { id: 'media', label: 'Media', icon: '🎬', tier: 3, color: '#FF6B6B', position: [-5, 3, -1] },
  { id: 'system', label: 'System', icon: '🖥️', tier: 3, color: '#6EE7B7', position: [3, -4, -1] },
  { id: 'model', label: 'Models', icon: '🤖', tier: 3, color: '#93C5FD', position: [-3, -4, -1] },

  // Tier 4 - Autonomous
  { id: 'autonomous', label: 'Autonomous', icon: '🔄', tier: 4, color: '#FCA5A5', position: [0, 5, -2] },
  { id: 'scheduler', label: 'Scheduler', icon: '📅', tier: 4, color: '#D8B4FE', position: [0, -5, -2] },
  { id: 'knowledge', label: 'Knowledge', icon: '📚', tier: 4, color: '#67E8F9', position: [5, 0, -2] },
  { id: 'security', label: 'Security', icon: '🛡️', tier: 4, color: '#FDE68A', position: [-5, 0, -2] },

  // Tier 5 - Interface
  { id: 'personality', label: 'Personality', icon: '🎭', tier: 5, color: '#C4B5FD', position: [3, 4, -3] },
  { id: 'overlay', label: 'Overlay', icon: '🔲', tier: 5, color: '#86EFAC', position: [-3, 4, -3] },
  { id: 'mobile', label: 'Mobile', icon: '📱', tier: 5, color: '#FDBA74', position: [3, -4, -3] },
  { id: 'gaming', label: 'Gaming', icon: '🎮', tier: 5, color: '#F9A8D4', position: [-3, -4, -3] },
];
```

---

## 7. Scene 4: Capability Showcase — Power Revealed

### 7.1 Visual Description

Cards/panels fly in from different directions, each showcasing a key capability with a mini-animation. The AI core rotates slowly in the background. Each capability card has a glass-morphism design with a brief animated demo inside.

### 7.2 Capability Cards

```typescript
const CAPABILITY_CARDS = [
  {
    title: "Code",
    subtitle: "Write, debug, execute",
    demo: "CodeEditorAnimation",        // Animated typing in code editor
    icon: "terminal",
    enterFrom: "left",
    scrollRange: [0.50, 0.54],
  },
  {
    title: "Browse",
    subtitle: "Research, navigate, extract",
    demo: "BrowserAnimation",           // Browser opening, scrolling
    icon: "globe",
    enterFrom: "right",
    scrollRange: [0.54, 0.58],
  },
  {
    title: "Create",
    subtitle: "Images, documents, media",
    demo: "CreativeAnimation",          // Paintbrush strokes
    icon: "palette",
    enterFrom: "bottom",
    scrollRange: [0.58, 0.62],
  },
  {
    title: "Control",
    subtitle: "Your entire system",
    demo: "SystemControlAnimation",     // Desktop windows moving
    icon: "monitor",
    enterFrom: "top",
    scrollRange: [0.62, 0.667],
  },
];
```

---

## 8. Scene 5: Voice Activation — First Contact

### 8.1 Visual Description

The screen centers on a large waveform visualization. Text prompts the user: "Try speaking." If the user's microphone is available, real audio input drives the waveform. If not, a simulated waveform plays. The AI core reacts to voice, its geometry morphing in response to frequency.

### 8.2 Voice Waveform System

```typescript
function Scene5_Voice({ progress }: { progress: number }) {
  const localProgress = remapProgress(progress, 0.667, 0.833);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const [hasPermission, setHasPermission] = useState(false);

  // Request microphone access at 50% scene progress
  useEffect(() => {
    if (localProgress > 0.5 && !hasPermission) {
      navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
          const ctx = new AudioContext();
          const analyser = ctx.createAnalyser();
          analyser.fftSize = 256;
          const source = ctx.createMediaStreamSource(stream);
          source.connect(analyser);
          analyserRef.current = analyser;
          setHasPermission(true);
        })
        .catch(() => {
          // Use simulated waveform
          setHasPermission(false);
        });
    }
  }, [localProgress]);

  return (
    <group>
      <WaveformVisualization
        analyser={analyserRef.current}
        simulated={!hasPermission}
        intensity={localProgress}
        color="#7B61FF"
      />

      {/* AI Core reacting to voice */}
      <AICoreGeometry
        scale={1.5}
        voiceReactive={hasPermission}
        analyser={analyserRef.current}
      />
    </group>
  );
}
```

### 8.3 Scroll Keyframes

```
67% → 70%: Scene transition. Waveform line appears (flat/silent)
70% → 75%: Text: "Your voice is the interface."
            Waveform begins subtle simulated movement
75% → 78%: Text: "Speak, and I listen."
            Microphone permission prompt (if not yet granted)
78% → 83%: If mic available: real waveform reacts to user voice
            If no mic: simulated voice response demonstration
            AI Core morphs reactively
            Text: "I understand you."
            TRANSITION: Waveform fades, camera pushes into AI core
```

---

## 9. Scene 6: The Handoff — Enter JARVIS

### 9.1 Visual Description

The camera flies directly into the AI core. As we pass through its surface, the geometry dissolves and the main JARVIS interface fades in behind it. The scrollytelling container fades out, revealing the actual application underneath. This is a seamless transition from marketing to product.

### 9.2 Scroll Keyframes

```
83% → 86%: Camera accelerates toward AI core. Text: "This is JARVIS."
86% → 90%: Camera penetrates core surface. Core geometry dissolves
            into the main UI's particle background
90% → 95%: Main interface elements fade in (sidebar, command bar, etc.)
            Text: "Ready when you are."
95% → 100%: Scrollytelling container fully dissolves
             User is now in the main JARVIS interface
             Boot animation plays briefly
```

### 9.3 Seamless Transition

```typescript
function Scene6_Handoff({ progress, onComplete }: {
  progress: number;
  onComplete: () => void;
}) {
  const localProgress = remapProgress(progress, 0.833, 1.0);

  // Trigger completion when scrollytelling ends
  useEffect(() => {
    if (localProgress >= 0.95) {
      // Mark first-launch as complete
      localStorage.setItem('jarvis-intro-seen', 'true');
      onComplete();
    }
  }, [localProgress]);

  // Camera flies into core
  const cameraZ = gsap.utils.interpolate(10, -5, localProgress);

  // Core dissolves
  const coreOpacity = gsap.utils.clamp(0, 1, 1 - (localProgress - 0.3) / 0.4);

  // Main UI fades in
  const uiOpacity = gsap.utils.clamp(0, 1, (localProgress - 0.5) / 0.3);

  return (
    <group>
      {/* Dissolving AI Core */}
      <AICoreGeometry
        opacity={coreOpacity}
        dissolveProgress={localProgress}
      />

      {/* Main UI fade-in overlay */}
      <Html fullscreen style={{ opacity: uiOpacity }}>
        <MainInterface preview={true} />
      </Html>
    </group>
  );
}
```

---

## 10. Technical Implementation

### 10.1 Scroll Container Structure

```tsx
function ScrollytellingExperience() {
  const [scrollState, setScrollState] = useState<ScrollState>({
    totalProgress: 0,
    sceneIndex: 0,
    sceneProgress: 0,
    velocity: 0,
    direction: 'down',
  });

  return (
    <div className="scrollytelling-root">
      {/* Pinned 3D Canvas */}
      <div className="canvas-container fixed inset-0 z-10">
        <Canvas
          camera={{ position: [0, 0, 20], fov: 60 }}
          gl={{ antialias: true, alpha: true }}
          dpr={[1, 2]}
        >
          <Suspense fallback={<LoadingPlaceholder />}>
            <ScrollSceneManager progress={scrollState} />
          </Suspense>
          <EffectComposer>
            <Bloom intensity={0.5} luminanceThreshold={0.3} />
            <ChromaticAberration offset={[0.001, 0.001]} />
          </EffectComposer>
        </Canvas>
      </div>

      {/* Scroll area (invisible, just provides scroll distance) */}
      <div className="scroll-container relative z-20" style={{ height: '6000vh' }}>
        {/* Text overlays at scroll positions */}
        <TextOverlays progress={scrollState} />
      </div>

      {/* HUD: progress bar + skip button */}
      <div className="hud-overlay fixed z-30">
        <ProgressIndicator progress={scrollState.totalProgress} />
        <SkipButton onClick={handleSkip} />
      </div>
    </div>
  );
}
```

### 10.2 Scene Manager

```typescript
function ScrollSceneManager({ progress }: { progress: ScrollState }) {
  const { totalProgress, sceneIndex } = progress;

  // Only render current scene + neighbors for performance
  const visibleScenes = [sceneIndex - 1, sceneIndex, sceneIndex + 1]
    .filter(i => i >= 0 && i <= 5);

  return (
    <group>
      {visibleScenes.includes(0) && <Scene1_Void progress={totalProgress} />}
      {visibleScenes.includes(1) && <Scene2_Neural progress={totalProgress} />}
      {visibleScenes.includes(2) && <Scene3_Constellation progress={totalProgress} />}
      {visibleScenes.includes(3) && <Scene4_Capabilities progress={totalProgress} />}
      {visibleScenes.includes(4) && <Scene5_Voice progress={totalProgress} />}
      {visibleScenes.includes(5) && <Scene6_Handoff progress={totalProgress} />}
    </group>
  );
}
```

---

## 11. Typography & Text Animation

### 11.1 Text Appearance System

```typescript
interface TextOverlay {
  text: string;
  start: number;          // scroll progress when text begins appearing
  end: number;            // scroll progress when text is fully gone
  style: 'hero' | 'hero-accent' | 'subtitle' | 'caption';
  animation: 'fade-up' | 'typewriter' | 'split-chars' | 'blur-in';
  position: 'center' | 'bottom-left' | 'bottom-center';
}

// Animation implementations
const textAnimations = {
  'fade-up': {
    initial: { opacity: 0, y: 40 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
    transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] },
  },
  'split-chars': {
    // Each character animates independently
    stagger: 0.03,
    initial: { opacity: 0, y: 20, rotateX: -90 },
    animate: { opacity: 1, y: 0, rotateX: 0 },
  },
  'typewriter': {
    // Characters appear one at a time
    stagger: 0.05,
    initial: { opacity: 0 },
    animate: { opacity: 1 },
  },
  'blur-in': {
    initial: { opacity: 0, filter: 'blur(20px)' },
    animate: { opacity: 1, filter: 'blur(0px)' },
    transition: { duration: 1.2 },
  },
};
```

### 11.2 Text Styles

```css
.text-hero {
  font-family: 'Inter', sans-serif;
  font-size: clamp(2rem, 5vw, 4rem);
  font-weight: 300;
  letter-spacing: 0.02em;
  color: rgba(255, 255, 255, 0.95);
}

.text-hero-accent {
  font-family: 'Inter', sans-serif;
  font-size: clamp(2rem, 5vw, 4rem);
  font-weight: 600;
  letter-spacing: 0.02em;
  color: #00F0FF;
  text-shadow: 0 0 40px rgba(0, 240, 255, 0.3);
}

.text-subtitle {
  font-family: 'JetBrains Mono', monospace;
  font-size: clamp(0.875rem, 2vw, 1.25rem);
  font-weight: 400;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.6);
}
```

---

## 12. Audio Design

### 12.1 Audio Layers

```typescript
const SCROLLYTELLING_AUDIO = {
  ambient: {
    file: 'assets/audio/ambient-deep-space.mp3',
    volume: 0.15,
    loop: true,
    fadeIn: 3000,              // 3s fade in at start
  },

  // Scene-specific audio cues
  cues: [
    { scene: 1, event: 'particle-appear', file: 'sfx/soft-ping.mp3', volume: 0.2 },
    { scene: 2, event: 'explosion', file: 'sfx/whoosh-expand.mp3', volume: 0.4 },
    { scene: 2, event: 'convergence', file: 'sfx/crystallize.mp3', volume: 0.3 },
    { scene: 3, event: 'node-appear', file: 'sfx/soft-blip.mp3', volume: 0.15 },
    { scene: 3, event: 'connection', file: 'sfx/electric-connect.mp3', volume: 0.2 },
    { scene: 4, event: 'card-enter', file: 'sfx/slide-glass.mp3', volume: 0.2 },
    { scene: 5, event: 'waveform', file: 'sfx/voice-hum.mp3', volume: 0.3 },
    { scene: 6, event: 'enter-core', file: 'sfx/warp-transition.mp3', volume: 0.5 },
    { scene: 6, event: 'welcome', file: 'sfx/jarvis-welcome.mp3', volume: 0.6 },
  ],

  // User preference
  muted: false,                // Respect user preference
};
```

### 12.2 Audio Controller

```typescript
function useScrollAudio(progress: ScrollState) {
  const howlerRef = useRef<Howl | null>(null);

  useEffect(() => {
    // Start ambient on first scroll
    if (progress.totalProgress > 0.01 && !howlerRef.current) {
      howlerRef.current = new Howl({
        src: [SCROLLYTELLING_AUDIO.ambient.file],
        volume: 0,
        loop: true,
      });
      howlerRef.current.play();
      howlerRef.current.fade(0, SCROLLYTELLING_AUDIO.ambient.volume, 3000);
    }
  }, [progress.totalProgress]);

  // Trigger scene cues
  useEffect(() => {
    const currentCues = SCROLLYTELLING_AUDIO.cues
      .filter(c => c.scene === progress.sceneIndex + 1);
    // Play cues based on scene progress...
  }, [progress.sceneProgress]);
}
```

---

## 13. Performance Strategy

### 13.1 Optimization Techniques

| Technique | Implementation | Impact |
|---|---|---|
| **Scene culling** | Only render current + neighbor scenes | -60% GPU load |
| **Particle LOD** | 2000 particles on HIGH, 500 on LOW | Scales to hardware |
| **Instanced meshes** | Agent nodes use InstancedMesh | Single draw call for 20 nodes |
| **Shader simplification** | Simpler shaders on LOW quality | -40% fragment shader cost |
| **Texture compression** | Use KTX2 compressed textures | -70% VRAM |
| **Lazy loading** | Load scene assets only when approaching | -50% initial load |
| **Request idle callback** | Preload next scene during idle time | Smooth transitions |

### 13.2 Quality Levels

```typescript
const SCROLLYTELLING_QUALITY = {
  LOW: {
    particleCount: 500,
    postProcessing: false,
    shadows: false,
    antialias: false,
    textAnimations: 'simple',    // Only fade, no split-chars
  },
  MEDIUM: {
    particleCount: 1000,
    postProcessing: true,         // Bloom only
    shadows: false,
    antialias: true,
    textAnimations: 'standard',
  },
  HIGH: {
    particleCount: 2000,
    postProcessing: true,         // Bloom + ChromaticAberration
    shadows: true,
    antialias: true,
    textAnimations: 'full',       // All animations
  },
  ULTRA: {
    particleCount: 5000,
    postProcessing: true,         // Full pipeline
    shadows: true,
    antialias: true,
    textAnimations: 'full',
    rayMarching: true,            // Volumetric effects
  },
};
```

### 13.3 Frame Budget

```
Target: 60fps = 16.67ms per frame

Budget allocation for scrollytelling:
├── Scene rendering:     6ms    (36%)
├── Particle update:     3ms    (18%)
├── Post-processing:     3ms    (18%)
├── Text/DOM overlay:    2ms    (12%)
├── Scroll calculation:  1ms    (6%)
└── Headroom:            1.67ms (10%)
```

---

## 14. Skip & Accessibility

### 14.1 Skip Mechanism

```typescript
function SkipButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      className="fixed bottom-8 right-8 z-50
                 px-6 py-3 rounded-full
                 bg-white/10 backdrop-blur-md
                 border border-white/20
                 text-white/70 hover:text-white
                 hover:bg-white/20
                 transition-all duration-300
                 text-sm tracking-widest uppercase"
      onClick={onClick}
      aria-label="Skip introduction and enter JARVIS"
    >
      Skip to JARVIS →
    </button>
  );
}
```

### 14.2 Accessibility

| Feature | Implementation |
|---|---|
| **Keyboard navigation** | Space/Enter to skip, arrow keys to scroll |
| **Reduced motion** | Detect `prefers-reduced-motion`, simplify animations |
| **Screen reader** | `aria-live` regions announce scene changes |
| **Color contrast** | All text meets WCAG AA on dark background |
| **Focus management** | Skip button is first focusable element |
| **No seizure risk** | Flash duration < 3 frames, brightness transitions smooth |

### 14.3 Reduced Motion Alternative

```typescript
function useReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );

  // In reduced motion mode:
  // - Replace particle animations with static layouts
  // - Use simple fade transitions instead of 3D movement
  // - Disable parallax scrolling
  // - Show all text immediately instead of animating
  // - Disable audio
}
```

### 14.4 Replay & Settings

```typescript
// Settings integration
const scrollytellingSettings = {
  // Replay from settings
  replayIntroduction: () => {
    localStorage.removeItem('jarvis-intro-seen');
    window.location.reload();
  },

  // First-launch detection
  shouldShowIntroduction: () => {
    return !localStorage.getItem('jarvis-intro-seen');
  },
};
```

---

*This document specifies the complete scroll-driven onboarding experience for JARVIS. Implementation should begin after the core 3D rendering pipeline is established.*

*Last Updated: 2026-05-19*
