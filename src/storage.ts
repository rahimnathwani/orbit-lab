const KEY = 'orbit-lab-v1';

export interface SaveData {
  level: number;
  completed: number[];
  muted: boolean;
  showVectors: boolean;
}

const fresh = (): SaveData => ({
  level: 1,
  completed: [],
  muted: false,
  showVectors: true,
});

export function loadSave(): SaveData {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Partial<SaveData> | null;
    if (!raw || typeof raw !== 'object') return fresh();
    return {
      level: Number.isInteger(raw.level) ? raw.level! : 1,
      completed: Array.isArray(raw.completed) ? raw.completed.filter(Number.isInteger) : [],
      muted: raw.muted === true,
      showVectors: raw.showVectors !== false,
    };
  } catch {
    return fresh();
  }
}

export function writeSave(save: SaveData): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(save));
  } catch {
    // Ignore storage errors.
  }
}
