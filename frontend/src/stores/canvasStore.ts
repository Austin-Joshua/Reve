import { create } from "zustand";

export type ToolType = "select" | "brush" | "eraser" | "text" | "pan";

export interface Layer {
  id: string;
  type: "raster" | "text" | "shape";
  name: string;
  visible: boolean;
  locked: boolean;
  opacity: number;
  zIndex: number;
  transform: {
    x: number;
    y: number;
    width: number;
    height: number;
    rotation: number;
  };
  content: Record<string, any>;
}

interface CanvasState {
  activeTool: ToolType;
  brushSize: number;
  zoom: number;
  pan: { x: number; y: number };
  activeLayerId: string | null;
  layers: Layer[];
  setActiveTool: (tool: ToolType) => void;
  setBrushSize: (size: number) => void;
  setZoom: (zoom: number) => void;
  setPan: (pan: { x: number; y: number }) => void;
  setActiveLayerId: (id: string | null) => void;
  setLayers: (layers: Layer[]) => void;
  addLayer: (layer: Layer) => void;
  removeLayer: (id: string) => void;
  updateLayer: (id: string, updates: Partial<Layer>) => void;
}

export const useCanvasStore = create<CanvasState>((set) => ({
  activeTool: "select",
  brushSize: 32,
  zoom: 1.0,
  pan: { x: 0, y: 0 },
  activeLayerId: null,
  layers: [],

  setActiveTool: (activeTool) => set({ activeTool }),
  setBrushSize: (brushSize) => set({ brushSize }),
  setZoom: (zoom) => set({ zoom }),
  setPan: (pan) => set({ pan }),
  setActiveLayerId: (activeLayerId) => set({ activeLayerId }),
  setLayers: (layers) => set({ layers }),
  addLayer: (layer) =>
    set((state) => ({ layers: [...state.layers, layer], activeLayerId: layer.id })),
  removeLayer: (id) =>
    set((state) => ({
      layers: state.layers.filter((l) => l.id !== id),
      activeLayerId: state.activeLayerId === id ? null : state.activeLayerId,
    })),
  updateLayer: (id, updates) =>
    set((state) => ({
      layers: state.layers.map((l) => (l.id === id ? { ...l, ...updates } : l)),
    })),
}));
