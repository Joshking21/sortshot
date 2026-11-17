import { create } from 'zustand';
import { CategoryId } from '../db/schema';

export interface ScannerState {
  isScanning: boolean;
  isPaused: boolean;
  totalScreenshots: number;
  processedCount: number;
  folderCounts: Record<CategoryId, number>;
  isPartialAccess: boolean;
  lastScanDurationMs: number | null;
  screenshotsPerSecond: number | null;
  
  // Actions
  setScanning: (isScanning: boolean) => void;
  setPaused: (isPaused: boolean) => void;
  setProgress: (done: number, total: number) => void;
  setFolderCounts: (counts: Record<CategoryId, number>) => void;
  setPartialAccess: (isPartial: boolean) => void;
  setPerformanceMetrics: (durationMs: number, speed: number) => void;
}

export const useScannerStore = create<ScannerState>((set) => ({
  isScanning: false,
  isPaused: false,
  totalScreenshots: 0,
  processedCount: 0,
  folderCounts: {
    bank_details: 0,
    receipt: 0,
    chat: 0,
    event: 0,
    address: 0,
    link: 0,
    code: 0,
    id_document: 0,
    shopping: 0,
    other: 0,
    little_text: 0,
  },
  isPartialAccess: false,
  lastScanDurationMs: null,
  screenshotsPerSecond: null,

  setScanning: (isScanning) => set({ isScanning }),
  setPaused: (isPaused) => set({ isPaused }),
  setProgress: (processedCount, totalScreenshots) => set({ processedCount, totalScreenshots }),
  setFolderCounts: (folderCounts) => set({ folderCounts }),
  setPartialAccess: (isPartialAccess) => set({ isPartialAccess }),
  setPerformanceMetrics: (lastScanDurationMs, screenshotsPerSecond) =>
    set({ lastScanDurationMs, screenshotsPerSecond }),
}));
