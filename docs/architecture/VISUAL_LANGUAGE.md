# JARVIS — Visual Language

## Design System & Visual Identity for a Cinematic AI Operating System

**Version:** 0.1.0-alpha  
**Document Type:** Visual Design Specification

---

## Table of Contents

1. [Visual Philosophy](#1-visual-philosophy)
2. [Color System](#2-color-system)
3. [Typography](#3-typography)
4. [Iconography](#4-iconography)
5. [Motion Language](#5-motion-language)
6. [3D Visual Direction](#6-3d-visual-direction)
7. [Material Language](#7-material-language)
8. [Lighting System](#8-lighting-system)
9. [Post-Processing Palette](#9-post-processing-palette)
10. [UI Element Design](#10-ui-element-design)
11. [Reactive Visual Systems](#11-reactive-visual-systems)
12. [Visual Research & References](#12-visual-research--references)
13. [Asset Guidelines](#13-asset-guidelines)
14. [Anti-Patterns](#14-anti-patterns)

---

## 1. Visual Philosophy

### 1.1 Core Visual Identity

JARVIS is not a dashboard. It is a **living digital consciousness** — an AI operating system that breathes, thinks, and responds. Every visual element communicates intelligence.

**Three pillars of the visual language:**

1. **Organic Intelligence** — Not mechanical, not robotic. The AI feels alive, like a biological-digital hybrid. Geometry morphs organically. Particles flow like neural synapses. Light pulses like a heartbeat.

2. **Structural Precision** — Beneath the organic surface is engineering precision. Holographic grids, structured data flows, geometric tessellations. The precision communicates reliability and technical power.

3. **Atmospheric Depth** — Every scene has depth, fog, atmospheric scattering. Nothing floats in a void. The world has a sense of space, scale, and physical presence. Volumetric light beams, dust particles, subtle lens effects.

### 1.2 Visual Anti-Goals

The UI must **NOT** look like:

| Anti-Pattern | Why to Avoid |
|---|---|
| Neon cyberpunk with purple/pink | Overused, lacks sophistication |
| Simple glowing spheres | Generic, lazy, meaningless |
| Floating ring/circle HUDs | Every AI project does this |
| Random particle explosions | Visually noisy, purposeless |
| Dark flat dashboard with charts | Boring, not immersive |
| Tron-style grid world | Dated aesthetic |
| Matrix green text rain | Cliché, 1999 |
| Generic sci-fi hexagons | Overused pattern |

### 1.3 Visual Goals

The UI **MUST** feel like:

| Quality | How to Achieve |
|---|---|
| **Alive** | Organic motion, breathing rhythms, reactive to state |
| **Intelligent** | Purposeful animations, structured data flows |
| **Cinematic** | Depth of field, volumetric lighting, camera work |
| **Premium** | Refined materials, subtle details, smooth 60fps |
| **Mysterious** | Hidden complexity, emergent patterns, depth |
| **Powerful** | Scale, energy, controlled intensity |

---

## 2. Color System

### 2.1 Primary Palette

```
JARVIS COLOR SYSTEM

CORE BLUE          #0A84FF    rgb(10, 132, 255)    — Primary interaction color
DEEP BLUE          #0051A8    rgb(0, 81, 168)      — Depth, backgrounds
ARCTIC WHITE       #E8F0FE    rgb(232, 240, 254)   — Text, highlights
VOID BLACK         #050A12    rgb(5, 10, 18)       — Deep background
SURFACE DARK       #0D1520    rgb(13, 21, 32)      — Panel backgrounds
```

### 2.2 Accent Palette

```
ENERGY CYAN        #00D4FF    rgb(0, 212, 255)     — Active states, energy
WARM AMBER         #FF9500    rgb(255, 149, 0)     — Warnings, attention
SIGNAL RED         #FF3B30    rgb(255, 59, 48)     — Errors, critical
GROWTH GREEN       #30D158    rgb(48, 209, 88)     — Success, health
REASONING VIOLET   #BF5AF2    rgb(191, 90, 242)    — AI thinking, processing
```

### 2.3 Semantic Colors

| State | Color | Usage |
|---|---|---|
| Idle | Core Blue at 40% | Calm, breathing, ambient |
| Active | Core Blue at 100% + Cyan | Processing, responding |
| Thinking | Reasoning Violet | LLM inference in progress |
| Listening | Energy Cyan pulse | Voice input active |
| Speaking | Warm Amber glow | TTS output active |
| Error | Signal Red | Errors, failures |
| Success | Growth Green | Task completed |
| Warning | Warm Amber | Attention needed |
| Autonomous | Violet + Cyan blend | Autonomous execution |

### 2.4 Color Application Rules

1. **Background** — Always dark (VOID BLACK to SURFACE DARK gradient). Never pure black (#000).
2. **Text** — Arctic White for primary, Core Blue for interactive, 60% white for secondary.
3. **Borders** — Core Blue at 10-20% opacity. Never sharp or thick.
4. **Glows** — Core Blue and Energy Cyan. Always with falloff (Gaussian blur). Never hard-edged.
5. **3D Materials** — Dark base with emissive Core Blue. Fresnel edges in Energy Cyan.
6. **Data visualization** — Use full accent palette. Each data type gets a consistent color.

### 2.5 Color in 3D

```glsl
// Standard JARVIS color constants in shaders
const vec3 CORE_BLUE = vec3(0.039, 0.518, 1.0);
const vec3 ENERGY_CYAN = vec3(0.0, 0.831, 1.0);
const vec3 VOID_BLACK = vec3(0.02, 0.039, 0.071);
const vec3 REASONING_VIOLET = vec3(0.749, 0.353, 0.949);
const vec3 WARM_AMBER = vec3(1.0, 0.584, 0.0);
```

---

## 3. Typography

### 3.1 Font Stack

| Role | Font | Weight | Fallback |
|---|---|---|---|
| **Display** | Inter | 700 (Bold) | SF Pro Display, system-ui |
| **Headings** | Inter | 600 (Semibold) | SF Pro Display, system-ui |
| **Body** | Inter | 400 (Regular) | SF Pro Text, system-ui |
| **Monospace** | JetBrains Mono | 400 | SF Mono, Consolas |
| **HUD Numbers** | JetBrains Mono | 500 | SF Mono, Consolas |
| **Labels** | Inter | 500 (Medium) | system-ui |

### 3.2 Type Scale

```css
--text-xs:   0.625rem;    /* 10px — Tiny labels, HUD counters */
--text-sm:   0.75rem;     /* 12px — Secondary text, metadata */
--text-base: 0.875rem;    /* 14px — Body text, chat messages */
--text-md:   1rem;        /* 16px — Emphasis, panel headers */
--text-lg:   1.25rem;     /* 20px — Section headers */
--text-xl:   1.5rem;      /* 24px — Scene titles */
--text-2xl:  2rem;        /* 32px — Boot screen, major headings */
--text-hero: 3.5rem;      /* 56px — Hero text (scrollytelling) */
```

### 3.3 Typography Rules

1. **All caps** — Only for HUD labels and system status indicators
2. **Letter spacing** — +0.05em for caps labels, +0.02em for headings, 0 for body
3. **Line height** — 1.5 for body, 1.2 for headings, 1.0 for HUD
4. **Opacity** — Primary text 100%, secondary 60%, tertiary 40%
5. **Text shadow** — Subtle glow on HUD text: `0 0 10px rgba(10, 132, 255, 0.3)`
6. **Monospace** — Always for code, numbers, system data, terminal output
7. **Truncation** — Long text truncated with ellipsis, never wraps awkwardly

---

## 4. Iconography

### 4.1 Icon Style

- **Style:** Outline/linear with 1.5px stroke
- **Corners:** Rounded (2px radius)
- **Size grid:** 16px, 20px, 24px, 32px
- **Color:** Inherits parent text color
- **Active state:** Fill or increased opacity + glow

### 4.2 Icon Library

Use **Lucide React** as the primary icon set:
- Clean, consistent, well-maintained
- Tree-shakeable (only import used icons)
- Customizable stroke width and size

### 4.3 Custom Icons

Create custom icons for JARVIS-specific concepts:

| Icon | Description | Usage |
|---|---|---|
| AI Core | Stylized neural/geometric shape | Main AI indicator |
| Agent | Node with connections | Agent status |
| Memory | Layered data stack | Memory operations |
| Consciousness | Evolving geometric form | AI state |
| Autonomous | Self-driving circuit | Autonomous mode |
| Vision | Scanning eye | Vision capabilities |
| Voice Waveform | Audio waveform | Voice activity |

---

## 5. Motion Language

### 5.1 Animation Principles

1. **Purpose** — Every animation communicates state, not decoration
2. **Smoothness** — Minimum 60fps, no jank, no stutter
3. **Organic easing** — Prefer `power3.inOut` over linear. Avoid mechanical motion
4. **Layered timing** — Complex animations stagger elements (50-100ms gaps)
5. **Breathing rhythms** — Idle states have slow, organic pulses (2-4 second cycles)
6. **Responsive to state** — Animation speed/intensity changes with system activity

### 5.2 GSAP Easing Defaults

```typescript
const EASE = {
    // UI transitions
    panelOpen: 'power3.out',
    panelClose: 'power3.in',
    fadeIn: 'power2.out',
    fadeOut: 'power2.in',
    
    // 3D camera
    cameraMove: 'power3.inOut',
    cameraOrbit: 'sine.inOut',
    
    // Data/content
    listStagger: 'power2.out',
    contentReveal: 'power4.out',
    
    // Special
    elastic: 'elastic.out(1, 0.5)',
    bounce: 'bounce.out',
    
    // Scroll
    scrollSnap: 'power2.inOut',
};
```

### 5.3 Duration Standards

| Animation Type | Duration | Notes |
|---|---|---|
| Micro-interaction (hover) | 150-200ms | Instant feel |
| Panel open/close | 300-400ms | Smooth but quick |
| Scene transition | 800-1200ms | Cinematic camera move |
| Boot sequence | 3-5 seconds | Dramatic startup |
| Scroll chapter transition | 600-1000ms | Smooth scroll locking |
| Notification appear | 250ms | Quick attention |
| Notification dismiss | 200ms | Quick removal |
| Loading shimmer | Loop (2s cycle) | Continuous |
| Breathing pulse | Loop (3-4s cycle) | Organic idle |

### 5.4 Framer Motion Variants

```typescript
// Standard panel variants
const panelVariants = {
    hidden: { 
        opacity: 0, 
        scale: 0.95, 
        y: 20,
        filter: 'blur(8px)'
    },
    visible: { 
        opacity: 1, 
        scale: 1, 
        y: 0,
        filter: 'blur(0px)',
        transition: { duration: 0.4, ease: [0.25, 0.1, 0.25, 1.0] }
    },
    exit: { 
        opacity: 0, 
        scale: 0.95, 
        y: -10,
        filter: 'blur(4px)',
        transition: { duration: 0.25 }
    }
};

// Stagger list items
const listContainerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: { staggerChildren: 0.05, delayChildren: 0.1 }
    }
};

const listItemVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.3 } }
};
```

---

## 6. 3D Visual Direction

### 6.1 AI Core — The Heart of JARVIS

The AI Core is the central visual element, the "brain" of the system:

**Form:** A morphing geometric structure — NOT a simple sphere or orb

```
Evolution of the AI Core based on state:

IDLE STATE
├── Slowly rotating icosahedron (irregular, organic)
├── Subtle vertex displacement via noise
├── Soft blue emissive glow
├── Gentle breathing scale animation (±5%)
├── Sparse ambient particles orbiting
└── Low-frequency energy pulses

ACTIVE STATE (user interacting)
├── Geometry becomes more complex (subdivision)
├── Stronger vertex displacement (more alive)
├── Brighter core glow, energy cyan accents
├── Faster particle emission
├── Neural connection lines appear
└── Energy field intensifies

THINKING STATE (LLM processing)
├── Rapid micro-rotations
├── Violet/purple color shift
├── Internal light patterns (thinking visualization)
├── Data stream particles flowing inward
├── Geometric complexity increases
└── Subtle geometry fragmentation (processing)

SPEAKING STATE (TTS active)
├── Pulsing to voice amplitude
├── Amber/warm color shifts per syllable
├── Audio-reactive vertex displacement
├── Outward particle emission (speaking)
└── Radial wave effects

AUTONOMOUS STATE (executing tasks)
├── Multiple sub-nodes orbiting
├── Connection lines between nodes
├── Each node represents an active agent
├── Color-coded by agent type
└── Continuous data flow visualization
```

### 6.2 Environment Design

The 3D environment should have multiple depth layers:

```
DEPTH LAYERS (back to front)

Layer 0 — Deep Background
├── Gradient from VOID_BLACK to deep blue
├── Very subtle star/particle field
├── Procedural nebula-like volumetric noise
└── Barely visible, atmospheric

Layer 1 — Mid Background
├── Holographic grid plane (fading into distance)
├── Very subtle hexagonal tessellation
├── Distant geometric structures (barely visible)
└── Sets spatial reference

Layer 2 — Environment Shell
├── Surrounding architectural elements
├── Modular hexagonal panels
├── Data flow channels
├── Structural support beams (holographic)
└── Defines the "room" / "chamber"

Layer 3 — Active Elements
├── AI Core (center)
├── Agent nodes (orbital positions)
├── Data streams (connections)
├── Active visualizations
└── Primary visual focus

Layer 4 — Foreground Effects
├── Lens flare (subtle, not overdone)
├── Floating holographic particles
├── Atmospheric dust
├── UI-integrated 3D elements
└── Close-up details

Layer 5 — Post-Processing
├── Bloom (selective, on emissive objects)
├── Chromatic aberration (very subtle)
├── Vignette
├── Color grading
└── Film grain (barely perceptible)
```

### 6.3 Procedural Systems

Instead of static 3D models, prioritize procedural generation:

| Element | Technique | Reason |
|---|---|---|
| AI Core | Procedural morphing geometry + custom shader | Reactive to state |
| Particles | GPU instanced meshes on computed positions | Performance |
| Neural connections | Tube geometry on computed curves | Dynamic topology |
| Grid | Procedural line segments | Infinite scalability |
| Data streams | Instanced particles along spline curves | Flowing data |
| Energy field | Point cloud with distance-based sizing | Atmospheric |
| Shell panels | Instanced hexagonal meshes | Modular environment |

### 6.4 Lighting Philosophy

```
LIGHTING APPROACH

Primary Light — AI Core Emission
├── Point light at core center
├── Color follows core state
├── Intensity follows activity level
├── Casts subtle shadows on environment

Fill Light — Ambient
├── Hemisphere light (blue sky / dark ground)
├── Very low intensity (0.1-0.2)
├── Prevents pure black areas
├── Always present

Rim Light — Edge Definition
├── Directional light from behind/above
├── Cool blue-white
├── Creates edge separation
├── Highlights geometry complexity

Accent Lights — Agent Nodes
├── Each active agent emits a point light
├── Color matches agent type
├── Intensity follows agent activity
├── Creates dynamic, reactive lighting

Environmental — Grid Reflection
├── Emissive grid lines create ground illumination
├── Very subtle
├── Adds spatial reference
```

---

## 7. Material Language

### 7.1 Core Materials

| Material | Visual Quality | Application |
|---|---|---|
| **Holographic Glass** | Transparent, refractive, iridescent | Panels, shells, containers |
| **Emissive Wire** | Bright, glowing line | Connections, grids, wireframes |
| **Dark Metal** | Nearly black, subtle specular | Structural elements |
| **Energy Plasma** | Bright, flowing, animated | Core, energy systems |
| **Data Crystal** | Semi-transparent, faceted, sparkling | Memory nodes, data objects |
| **Fog Volume** | Volumetric, atmospheric | Background depth |

### 7.2 Material Recipes

```typescript
// Holographic Glass Material
const holographicGlass = {
    transparent: true,
    opacity: 0.15,
    color: '#0A84FF',
    emissive: '#0A84FF',
    emissiveIntensity: 0.1,
    metalness: 0.9,
    roughness: 0.1,
    envMapIntensity: 0.5,
    side: THREE.DoubleSide,
};

// Custom Energy Material (shader-based)
// See three/shaders/energy.frag for full implementation
// Properties: animated noise displacement, fresnel glow,
// audio-reactive intensity, state-driven color shifting
```

### 7.3 Fresnel Effect (Standard)

Every important 3D object should have a fresnel edge glow:

```glsl
// Standard JARVIS fresnel
float fresnel = pow(1.0 - max(dot(viewDirection, normal), 0.0), 3.0);
vec3 fresnelColor = mix(baseColor, ENERGY_CYAN, fresnel * 0.8);
```

---

## 8. Lighting System

### 8.1 Lighting Presets

```typescript
const LIGHTING_PRESETS = {
    idle: {
        ambient: { intensity: 0.15, color: '#1a2a4a' },
        core: { intensity: 0.8, color: '#0A84FF', distance: 15, decay: 2 },
        rim: { intensity: 0.3, color: '#4488cc', position: [0, 10, -10] },
    },
    active: {
        ambient: { intensity: 0.2, color: '#1a3a5a' },
        core: { intensity: 1.5, color: '#00D4FF', distance: 20, decay: 2 },
        rim: { intensity: 0.5, color: '#66aaee', position: [0, 10, -10] },
    },
    thinking: {
        ambient: { intensity: 0.12, color: '#1a1a3a' },
        core: { intensity: 1.2, color: '#BF5AF2', distance: 18, decay: 2 },
        rim: { intensity: 0.4, color: '#8855cc', position: [0, 10, -10] },
    },
    speaking: {
        ambient: { intensity: 0.2, color: '#2a2a1a' },
        core: { intensity: 1.0, color: '#FF9500', distance: 15, decay: 2 },
        rim: { intensity: 0.3, color: '#cc8844', position: [0, 10, -10] },
    },
    error: {
        ambient: { intensity: 0.15, color: '#2a1a1a' },
        core: { intensity: 1.5, color: '#FF3B30', distance: 20, decay: 2 },
        rim: { intensity: 0.4, color: '#cc4444', position: [0, 10, -10] },
    }
};
```

### 8.2 Dynamic Light Transitions

Lighting transitions use GSAP to smoothly interpolate:

```typescript
function transitionLighting(from: LightingPreset, to: LightingPreset) {
    gsap.to(coreLightRef.current, {
        intensity: to.core.intensity,
        color: new THREE.Color(to.core.color),
        duration: 0.8,
        ease: 'power2.inOut'
    });
    gsap.to(ambientLightRef.current, {
        intensity: to.ambient.intensity,
        color: new THREE.Color(to.ambient.color),
        duration: 1.0,
        ease: 'power2.inOut'
    });
}
```

---

## 9. Post-Processing Palette

### 9.1 Effect Stack by Quality Level

| Effect | LOW | MEDIUM | HIGH | ULTRA |
|---|---|---|---|---|
| Bloom | Off | Selective | Full | Cinematic |
| Chromatic Aberration | Off | Off | Subtle | Standard |
| Vignette | CSS fallback | CSS fallback | Post-proc | Post-proc |
| Color Grading | CSS filter | CSS filter | LUT | LUT |
| FXAA | Off | FXAA | FXAA | SMAA |
| Film Grain | Off | Off | Off | Subtle |
| Depth of Field | Off | Off | Off | Optional |
| God Rays | Off | Off | Off | Optional |

### 9.2 Bloom Configuration

```typescript
const bloomConfig = {
    [QualityLevel.MEDIUM]: {
        intensity: 0.5,
        luminanceThreshold: 0.8,
        luminanceSmoothing: 0.3,
        mipmapBlur: true,
        radius: 0.4
    },
    [QualityLevel.HIGH]: {
        intensity: 0.8,
        luminanceThreshold: 0.6,
        luminanceSmoothing: 0.2,
        mipmapBlur: true,
        radius: 0.6
    },
    [QualityLevel.ULTRA]: {
        intensity: 1.0,
        luminanceThreshold: 0.4,
        luminanceSmoothing: 0.15,
        mipmapBlur: true,
        radius: 0.8
    }
};
```

### 9.3 Color Grading

Target look: **Cool blue shadows, neutral midtones, slight warm highlights**

```typescript
// Color grading LUT approach for HIGH/ULTRA
// Generate LUT in DaVinci Resolve or similar:
// - Lift shadows toward deep blue (#0A1530)
// - Midtones neutral with slight desaturation
// - Gain highlights with warm tint (+5% toward amber)
// - Overall contrast: +10%
// - Overall saturation: -10% (cinematic desaturation)

// For LOW/MEDIUM, use CSS filters:
const cssColorGrade = `
    filter: contrast(1.1) saturate(0.9) brightness(1.02);
`;
```

---

## 10. UI Element Design

### 10.1 Buttons

```css
/* Primary Button */
.btn-primary {
    background: linear-gradient(135deg, rgba(10, 132, 255, 0.2), rgba(0, 212, 255, 0.1));
    border: 1px solid rgba(10, 132, 255, 0.3);
    color: #E8F0FE;
    padding: 8px 20px;
    border-radius: 8px;
    font-size: 0.875rem;
    font-weight: 500;
    letter-spacing: 0.02em;
    transition: all 200ms ease;
    backdrop-filter: blur(8px);
}

.btn-primary:hover {
    background: linear-gradient(135deg, rgba(10, 132, 255, 0.35), rgba(0, 212, 255, 0.2));
    border-color: rgba(10, 132, 255, 0.5);
    box-shadow: 0 0 20px rgba(10, 132, 255, 0.15);
}

.btn-primary:active {
    transform: scale(0.98);
    background: linear-gradient(135deg, rgba(10, 132, 255, 0.4), rgba(0, 212, 255, 0.25));
}
```

### 10.2 Input Fields

```css
.input {
    background: rgba(10, 15, 30, 0.6);
    border: 1px solid rgba(100, 180, 255, 0.1);
    border-radius: 8px;
    color: #E8F0FE;
    padding: 10px 16px;
    font-size: 0.875rem;
    backdrop-filter: blur(8px);
    transition: all 200ms ease;
}

.input:focus {
    outline: none;
    border-color: rgba(10, 132, 255, 0.5);
    box-shadow: 0 0 0 3px rgba(10, 132, 255, 0.1);
}

.input::placeholder {
    color: rgba(232, 240, 254, 0.3);
}
```

### 10.3 Cards / Panels

```css
.card {
    background: rgba(13, 21, 32, 0.75);
    backdrop-filter: blur(20px) saturate(1.5);
    border: 1px solid rgba(100, 180, 255, 0.12);
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 
        0 4px 24px rgba(0, 0, 0, 0.4),
        inset 0 1px 0 rgba(255, 255, 255, 0.04);
}

.card-header {
    padding: 12px 16px;
    border-bottom: 1px solid rgba(100, 180, 255, 0.08);
    display: flex;
    align-items: center;
    gap: 8px;
}

.card-body {
    padding: 16px;
}
```

### 10.4 Scrollbar

```css
::-webkit-scrollbar {
    width: 6px;
}
::-webkit-scrollbar-track {
    background: transparent;
}
::-webkit-scrollbar-thumb {
    background: rgba(10, 132, 255, 0.2);
    border-radius: 3px;
}
::-webkit-scrollbar-thumb:hover {
    background: rgba(10, 132, 255, 0.4);
}
```

### 10.5 Notifications / Toasts

```
┌──────────────────────────────────────────┐
│ ◉ Memory saved                          │
│   "User prefers TypeScript for backend"  │
│                              3s ago  ✕   │
└──────────────────────────────────────────┘

Position: top-right
Animation: slide-in from right + fade
Duration: 5s auto-dismiss
Stack: max 3 visible, queue rest
```

---

## 11. Reactive Visual Systems

### 11.1 Voice → Visual

```
Microphone Input
     │
     ├── Audio Level (RMS) → AI Core breathing intensity
     │                     → Particle emission rate
     │                     → Core glow intensity
     │
     ├── Frequency Data (FFT) → AI Core vertex displacement
     │                        → Data stream particle colors
     │                        → Ambient light flicker
     │
     └── Voice Activity → Core color shift (idle→listening)
                        → UI state indicator
                        → HUD voice waveform
```

### 11.2 Agent Activity → Visual

```
Agent State Changes
     │
     ├── Agent Activated → Node lights up
     │                   → Connection line to core appears
     │                   → Particle burst at node
     │
     ├── Agent Processing → Node pulses
     │                    → Data particles flow along connection
     │                    → Local lighting change at node
     │
     ├── Agent Complete → Flash/pulse at node
     │                  → Success particle effect
     │                  → Connection fades
     │
     └── Agent Error → Node turns red
                     → Error pulse effect
                     → Warning particle burst
```

### 11.3 System Metrics → Visual

```
CPU Usage → Background ambient intensity
GPU Usage → Post-processing intensity
RAM Usage → Environment density/complexity
Network → Data stream particle velocity
Disk I/O → Ground grid pulse patterns
```

### 11.4 LLM Inference → Visual

```
Inference Start → Core color → Reasoning Violet
                → Rapid micro-particles
                → Internal light patterns

Token Generation → Per-token pulse
                 → Data stream outflow
                 → Typography animation in chat

Inference End → Core returns to idle
             → Settling particle animation
             → Completion flash
```

---

## 12. Visual Research & References

### 12.1 Key References

| Reference | What to Study | URL/Source |
|---|---|---|
| **Iron Man Jarvis/FRIDAY** | HUD layout, holographic aesthetics | Film reference |
| **Minority Report UI** | Gesture-driven holographic interface | Film reference |
| **Oblivion (2013)** | Clean sci-fi architecture, lighting | Film reference |
| **Awwwards FWA winners** | Premium WebGL execution | awwwards.com |
| **Bruno Simon Portfolio** | Three.js interactive excellence | bruno-simon.com |
| **Active Theory** | Cinematic WebGL experiences | activetheory.net |
| **Resn** | Creative WebGL projects | resn.co.nz |
| **David Hockney immersive** | Spatial experience design | Reference |
| **Apple Vision Pro UI** | Spatial computing aesthetics | apple.com |
| **Unreal Engine MetaHuman** | Realistic digital beings | unrealengine.com |
| **Houdini procedural** | Procedural visual systems | sidefx.com |

### 12.2 WebGL Technique References

| Technique | Source | Purpose |
|---|---|---|
| Instanced particles | Three.js examples | High-performance particles |
| Custom shaders | ShaderToy, The Book of Shaders | Procedural visuals |
| Post-processing | pmndrs/postprocessing | Cinematic effects |
| Procedural geometry | IQ's articles | Organic shapes |
| Camera animations | GSAP + Three.js | Cinematic camera work |
| Scroll-driven 3D | GSAP ScrollTrigger + R3F | Scrollytelling |
| Audio visualization | Web Audio API | Voice reactivity |
| Physics particles | rapier3d | Physical particle systems |

### 12.3 Moodboard Keywords

For asset sourcing and visual direction:

```
Keywords for 3D assets:
- holographic interface
- sci-fi command center
- neural network visualization
- digital consciousness
- futuristic control room
- energy core
- data visualization 3D
- procedural geometry
- cybernetic architecture
- AI brain visualization

Keywords for textures:
- holographic texture
- sci-fi panel texture
- hexagonal grid pattern
- energy field texture
- circuit board abstract
- digital noise texture

Keywords for HDRI:
- dark studio HDRI
- sci-fi interior HDRI
- blue ambient HDRI
- minimal studio lighting
```

---

## 13. Asset Guidelines

### 13.1 3D Model Guidelines

| Property | Guideline | Reason |
|---|---|---|
| Format | .glb (binary glTF) | Smallest size, fastest load |
| Compression | Draco compression | 70-90% size reduction |
| Polycount | < 50K per model | Performance |
| Textures | Max 2048x2048 | VRAM budget |
| Texture format | KTX2 (Basis Universal) | GPU-native compression |
| LOD | 3 levels per important model | Adaptive quality |
| Origin | Center, Y-up | Consistent positioning |

### 13.2 Texture Guidelines

| Type | Format | Size | Channels |
|---|---|---|---|
| Albedo/Color | KTX2 | 1024-2048 | RGB |
| Normal | KTX2 | 1024-2048 | RG (2-channel) |
| Emissive | KTX2 | 512-1024 | RGB |
| Roughness/Metallic | KTX2 | 512-1024 | Single channel packed |
| Alpha/Mask | PNG | 512 | Single channel |

### 13.3 Audio Guidelines

| Type | Format | Bitrate | Duration |
|---|---|---|---|
| UI sounds | WebM Opus | 96kbps | 0.1-1s |
| Ambient loops | WebM Opus | 128kbps | 10-30s |
| Boot sequence | WebM Opus | 128kbps | 3-5s |
| Fallback | MP3 | 128kbps | Same as above |

### 13.4 Asset Budget

| Category | Max Total Size | Loaded at Once |
|---|---|---|
| 3D Models | 20MB | 5MB |
| Textures | 30MB | 10MB |
| Audio | 10MB | 2MB |
| Fonts | 500KB | 200KB |
| Shaders | 100KB | 50KB |
| **Total** | **~60MB** | **~17MB** |

---

## 14. Anti-Patterns

### 14.1 Visual Anti-Patterns to AVOID

| Anti-Pattern | Why It Fails | Better Alternative |
|---|---|---|
| Flat glowing circle as AI | Lazy, generic, meaningless | Procedural morphing geometry |
| Random particle explosion | No purpose, visually noisy | Purposeful particle flow along paths |
| Constant screen shake | Annoying, unprofessional | Subtle camera breathing |
| Excessive lens flare | Distracting, dated | One subtle flare on core glow |
| Neon outline everything | Cheap cyberpunk cliché | Selective glow on key elements |
| Pure black background | Flat, no depth | Gradient with subtle noise |
| Rotating wireframe sphere | 2010 era visualization | Complex procedural geometry |
| Text scrolling matrix-style | Cliché, impractical | Structured data flow visualization |
| Over-animated UI elements | Distracting, slow to use | Subtle, purposeful motion |
| Inconsistent color palette | Chaotic, unprofessional | Strict adherence to color system |

### 14.2 Performance Anti-Patterns

| Anti-Pattern | Impact | Solution |
|---|---|---|
| Uncompressed textures | High VRAM, slow loading | KTX2 compression |
| Non-instanced particles | Thousands of draw calls | GPU instancing |
| Bloom on everything | GPU overload, ugly | Selective bloom via emissive mask |
| Creating objects in render loop | GC pressure, stutters | Object pooling |
| Large shader programs | Slow compilation | Modular shader chunks |
| Unculled geometry | Wasted GPU cycles | Frustum culling, LOD |

---

*This Visual Language document defines every visual decision for JARVIS. Deviation from this system requires documented justification.*

*Last Updated: 2026-05-19*
