import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ---- Scene Store ----
export enum SceneId {
    BOOT = 'boot',
    CONSCIOUSNESS = 'consciousness',
    COMMAND_CENTER = 'command-center',
    MEMORY_PALACE = 'memory-palace',
    AGENT_NETWORK = 'agent-network',
    DIAGNOSTICS = 'diagnostics',
    SCROLLYTELLING = 'scrollytelling',
}

export enum QualityLevel {
    MINIMAL = 0,
    LOW = 1,
    MEDIUM = 2,
    HIGH = 3,
    ULTRA = 4,
}

interface SceneSlice {
    activeScene: SceneId;
    sceneTransitioning: boolean;
    setScene: (scene: SceneId) => void;
    setSceneTransitioning: (v: boolean) => void;
}

export const useSceneStore = create<SceneSlice>()((set) => ({
    activeScene: SceneId.CONSCIOUSNESS,
    sceneTransitioning: false,
    setScene: (scene) => set({ activeScene: scene }),
    setSceneTransitioning: (v) => set({ sceneTransitioning: v }),
}));

// ---- AI Store ----
interface AISlice {
    isThinking: boolean;
    activeModel: string | null;
    streamingResponse: string;
    setThinking: (v: boolean) => void;
    setActiveModel: (model: string | null) => void;
    appendStream: (token: string) => void;
    clearStream: () => void;
}

export const useAIStore = create<AISlice>()((set) => ({
    isThinking: false,
    activeModel: null,
    streamingResponse: '',
    setThinking: (v) => set({ isThinking: v }),
    setActiveModel: (model) => set({ activeModel: model }),
    appendStream: (token) =>
        set((s) => ({ streamingResponse: s.streamingResponse + token })),
    clearStream: () => set({ streamingResponse: '' }),
}));

// ---- Agent Store ----
export interface AgentState {
    id: string;
    name: string;
    status: 'idle' | 'active' | 'busy' | 'error' | 'suspended';
    currentTask: string | null;
}

interface AgentSlice {
    agents: Record<string, AgentState>;
    updateAgent: (id: string, patch: Partial<AgentState>) => void;
}

export const useAgentStore = create<AgentSlice>()((set) => ({
    agents: {},
    updateAgent: (id, patch) =>
        set((s) => ({
            agents: {
                ...s.agents,
                [id]: { ...s.agents[id], ...patch },
            },
        })),
}));

// ---- Panel Store ----
export type PanelId = 'chat' | 'terminal' | 'files' | 'settings' | 'agents' | 'memory' | 'history' | 'activity';

interface PanelSlice {
    openPanels: PanelId[];
    togglePanel: (id: PanelId) => void;
    closePanel: (id: PanelId) => void;
}

export const usePanelStore = create<PanelSlice>()((set) => ({
    openPanels: ['chat'],
    togglePanel: (id) =>
        set((s) => ({
            openPanels: s.openPanels.includes(id)
                ? s.openPanels.filter((p) => p !== id)
                : [...s.openPanels, id],
        })),
    closePanel: (id) =>
        set((s) => ({
            openPanels: s.openPanels.filter((p) => p !== id),
        })),
}));

// ---- Voice Store ----
interface VoiceSlice {
    voiceActive: boolean;
    isListening: boolean;
    micLevel: number;
    ttsPlaying: boolean;
    partialTranscript: string;
    songMode: boolean;
    songBuffer: string;
    setVoiceActive: (v: boolean) => void;
    setListening: (v: boolean) => void;
    setMicLevel: (v: number) => void;
    setTTSPlaying: (v: boolean) => void;
    setPartialTranscript: (v: string) => void;
    setSongMode: (v: boolean) => void;
    setSongBuffer: (v: string) => void;
    appendSongBuffer: (v: string) => void;
}

export const useVoiceStore = create<VoiceSlice>()((set) => ({
    voiceActive: false,
    isListening: false,
    micLevel: 0,
    ttsPlaying: false,
    partialTranscript: '',
    songMode: false,
    songBuffer: '',
    setVoiceActive: (v) => set({ voiceActive: v }),
    setListening: (v) => set({ isListening: v }),
    setMicLevel: (v) => set({ micLevel: v }),
    setTTSPlaying: (v) => set({ ttsPlaying: v }),
    setPartialTranscript: (v) => set({ partialTranscript: v }),
    setSongMode: (v) => set({ songMode: v, songBuffer: v ? '' : '' }),
    setSongBuffer: (v) => set({ songBuffer: v }),
    appendSongBuffer: (v) => set((s) => ({ songBuffer: s.songBuffer ? s.songBuffer + ' ' + v : v })),
}));

// ---- Vision Store (global webcam state) ----
interface VisionSlice {
    showWebcam: boolean;
    webcamQuery: string;
    openWebcam: (query: string) => void;
    closeWebcam: () => void;
}

export const useVisionStore = create<VisionSlice>()((set) => ({
    showWebcam: false,
    webcamQuery: 'Describe what you see',
    openWebcam: (query) => set({ showWebcam: true, webcamQuery: query }),
    closeWebcam: () => set({ showWebcam: false }),
}));

// ---- System Store ----
export interface SystemMetrics {
    cpuUsage: number;
    ramUsedMB: number;
    ramTotalMB: number;
    gpuUsage: number;
    fps: number;
}

interface SystemSlice {
    metrics: SystemMetrics;
    wsConnected: boolean;
    ollamaConnected: boolean;
    backendConnected: boolean;
    backendStatus: 'starting' | 'ready' | 'error';
    updateMetrics: (m: Partial<SystemMetrics>) => void;
    setWsConnected: (v: boolean) => void;
    setOllamaConnected: (v: boolean) => void;
    setBackendConnected: (v: boolean) => void;
    setBackendStatus: (s: 'starting' | 'ready' | 'error') => void;
}

export const useSystemStore = create<SystemSlice>()((set) => ({
    metrics: { cpuUsage: 0, ramUsedMB: 0, ramTotalMB: 0, gpuUsage: 0, fps: 60 },
    wsConnected: false,
    ollamaConnected: false,
    backendConnected: false,
    backendStatus: 'starting',
    setWsConnected: (v) => set({ wsConnected: v }),
    setOllamaConnected: (v) => set({ ollamaConnected: v }),
    setBackendConnected: (v) => set({ backendConnected: v }),
    setBackendStatus: (s) => set({ backendStatus: s }),
    updateMetrics: (m) =>
        set((s) => ({ metrics: { ...s.metrics, ...m } })),
}));

// ---- Task Store (floating task panels) ----
export interface ActiveTask {
    id: string;
    label: string;
    status: 'running' | 'done' | 'error';
    progress?: number;        // 0-100
    detail?: string;
    startedAt: number;
}

interface TaskSlice {
    tasks: ActiveTask[];
    addTask: (task: ActiveTask) => void;
    updateTask: (id: string, patch: Partial<ActiveTask>) => void;
    removeTask: (id: string) => void;
    clearDone: () => void;
}

export const useTaskStore = create<TaskSlice>()((set) => ({
    tasks: [],
    addTask: (task) => set((s) => ({ tasks: [...s.tasks, task] })),
    updateTask: (id, patch) =>
        set((s) => ({
            tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)),
        })),
    removeTask: (id) =>
        set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) })),
    clearDone: () =>
        set((s) => ({ tasks: s.tasks.filter((t) => t.status === 'running') })),
}));

// ---- Settings Store (persisted) ----
interface SettingsSlice {
    qualityLevel: QualityLevel;
    adaptiveQuality: boolean;
    voiceEnabled: boolean;
    overlayEnabled: boolean;
    setQuality: (level: QualityLevel) => void;
    setAdaptiveQuality: (v: boolean) => void;
}

export const useSettingsStore = create<SettingsSlice>()(
    persist(
        (set) => ({
            qualityLevel: QualityLevel.MEDIUM,
            adaptiveQuality: true,
            voiceEnabled: false,
            overlayEnabled: true,
            setQuality: (level) => set({ qualityLevel: level }),
            setAdaptiveQuality: (v) => set({ adaptiveQuality: v }),
        }),
        { name: 'jarvis-settings' }
    )
);

// ---- Activity Log Store ----
export interface ActivityEntry {
    id: string;
    tool: string;
    status: 'running' | 'done' | 'error';
    message: string;
    detail?: string;
    timestamp: number;
}

interface ActivitySlice {
    activities: ActivityEntry[];
    addActivity: (entry: ActivityEntry) => void;
    updateActivity: (id: string, patch: Partial<ActivityEntry>) => void;
    clearActivities: () => void;
}

export const useActivityStore = create<ActivitySlice>()((set) => ({
    activities: [],
    addActivity: (entry) =>
        set((s) => ({ activities: [entry, ...s.activities].slice(0, 100) })),
    updateActivity: (id, patch) =>
        set((s) => ({
            activities: s.activities.map((a) => (a.id === id ? { ...a, ...patch } : a)),
        })),
    clearActivities: () => set({ activities: [] }),
}));

// ---- Chat History Store (persisted) ----
export interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
    timestamp: number;
}

export interface ChatSession {
    id: string;
    title: string;
    messages: ChatMessage[];
    createdAt: number;
}

interface ChatHistorySlice {
    sessions: ChatSession[];
    addSession: (session: ChatSession) => void;
    clearSessions: () => void;
}

export const useChatHistoryStore = create<ChatHistorySlice>()(
    persist(
        (set) => ({
            sessions: [],
            addSession: (session) =>
                set((s) => ({
                    sessions: [session, ...s.sessions].slice(0, 50),
                })),
            clearSessions: () => set({ sessions: [] }),
        }),
        { name: 'jarvis-chat-history' }
    )
);
