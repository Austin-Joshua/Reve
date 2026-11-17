import { create } from "zustand";

export interface GenerationSettings {
  prompt: string;
  negativePrompt: string;
  modelId: string;
  width: number;
  height: number;
  cfgScale: number;
  steps: number;
  seed: number | null;
  numImages: number;
  scheduler: string;
}

interface GenerationState {
  settings: GenerationSettings;
  isGenerating: boolean;
  currentJobId: string | null;
  progress: number;
  results: Array<{ id: string; url: string }>;
  setPrompt: (prompt: string) => void;
  setNegativePrompt: (negativePrompt: string) => void;
  setModelId: (modelId: string) => void;
  setDimensions: (width: number, height: number) => void;
  setCfgScale: (cfg: number) => void;
  setSteps: (steps: number) => void;
  setIsGenerating: (generating: boolean) => void;
  setProgress: (progress: number) => void;
  setResults: (results: Array<{ id: string; url: string }>) => void;
}

export const useGenerationStore = create<GenerationState>((set) => ({
  settings: {
    prompt: "",
    negativePrompt: "",
    modelId: "FLUX.1-dev",
    width: 1024,
    height: 1024,
    cfgScale: 3.5,
    steps: 28,
    seed: null,
    numImages: 1,
    scheduler: "FlowMatchEulerDiscreteScheduler",
  },
  isGenerating: false,
  currentJobId: null,
  progress: 0,
  results: [],

  setPrompt: (prompt) =>
    set((state) => ({ settings: { ...state.settings, prompt } })),
  setNegativePrompt: (negativePrompt) =>
    set((state) => ({ settings: { ...state.settings, negativePrompt } })),
  setModelId: (modelId) =>
    set((state) => ({ settings: { ...state.settings, modelId } })),
  setDimensions: (width, height) =>
    set((state) => ({ settings: { ...state.settings, width, height } })),
  setCfgScale: (cfgScale) =>
    set((state) => ({ settings: { ...state.settings, cfgScale } })),
  setSteps: (steps) =>
    set((state) => ({ settings: { ...state.settings, steps } })),
  setIsGenerating: (isGenerating) => set({ isGenerating }),
  setProgress: (progress) => set({ progress }),
  setResults: (results) => set({ results }),
}));
