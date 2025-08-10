import { GameData, PlayerStats } from '../types/GameData';

type SaveSlotId = 1 | 2 | 3;

interface SaveSlotPreview {
  level: number;
  health: number;
  maxHealth: number;
  position: { x: number; y: number };
  progress?: string | number;
}

interface SaveMeta {
  slots: Record<SaveSlotId, {
    lastSaved: number | null;
    preview: SaveSlotPreview | null;
  }>;
}

export class SaveManager {
  private static readonly VERSION = '1.0.0';
  private static readonly META_KEY = 'potato-gang-save-meta';
  private static readonly ACTIVE_SLOT_KEY = 'potato-gang-active-slot';

  private static readonly SLOT_KEY_PREFIX = 'potato-gang-save-';

  private static activeSlot: SaveSlotId | null = null;

  // ===== Slot helpers =====
  private static getSlotKey(slot: SaveSlotId): string {
    return `${SaveManager.SLOT_KEY_PREFIX}${slot}`;
  }

  public static getActiveSlot(): SaveSlotId {
    if (this.activeSlot) return this.activeSlot;
    const stored = Number(localStorage.getItem(this.ACTIVE_SLOT_KEY) || '1');
    const slot = (stored === 2 || stored === 3) ? (stored as SaveSlotId) : 1;
    this.activeSlot = slot;
    return slot;
  }

  public static setActiveSlot(slot: SaveSlotId): void {
    this.activeSlot = slot;
    localStorage.setItem(this.ACTIVE_SLOT_KEY, String(slot));
  }

  // ===== Default data =====
  public static createNewGameData(): GameData {
    return {
      player: {
        stats: {
          health: 100,
          maxHealth: 100,
          gold: 0,
          experience: 0,
          level: 1
        },
        position: { x: 512, y: 512 },
        inventory: []
      },
      dialogues: {},
      gameState: {
        currentScene: 'GameScene',
        flags: {},
        customData: {
          // 진행 상황 확장 포인트
          progress: 'start'
        }
      },
      version: SaveManager.VERSION,
      lastSaved: Date.now()
    };
  }

  // ===== Meta management =====
  private static loadMeta(): SaveMeta {
    try {
      const raw = localStorage.getItem(this.META_KEY);
      if (!raw) {
        return { slots: { 1: { lastSaved: null, preview: null }, 2: { lastSaved: null, preview: null }, 3: { lastSaved: null, preview: null } } };
      }
      const parsed = JSON.parse(raw) as SaveMeta;
      // 보정
      parsed.slots = parsed.slots || { 1: { lastSaved: null, preview: null }, 2: { lastSaved: null, preview: null }, 3: { lastSaved: null, preview: null } } as any;
      return parsed;
    } catch {
      return { slots: { 1: { lastSaved: null, preview: null }, 2: { lastSaved: null, preview: null }, 3: { lastSaved: null, preview: null } } };
    }
  }

  private static saveMeta(meta: SaveMeta): void {
    localStorage.setItem(this.META_KEY, JSON.stringify(meta));
  }

  private static updateMetaFromData(slot: SaveSlotId, data: GameData): void {
    const meta = this.loadMeta();
    meta.slots[slot] = {
      lastSaved: data.lastSaved,
      preview: {
        level: data.player.stats.level,
        health: data.player.stats.health,
        maxHealth: data.player.stats.maxHealth,
        position: { ...data.player.position },
        progress: data.gameState?.customData?.progress
      }
    };
    this.saveMeta(meta);
  }

  public static listSlots(): Array<{ id: SaveSlotId; exists: boolean; lastSaved: number | null; preview: SaveSlotPreview | null }> {
    const meta = this.loadMeta();
    return ([1, 2, 3] as SaveSlotId[]).map((id) => {
      const key = this.getSlotKey(id);
      const exists = !!localStorage.getItem(key);
      const m = meta.slots[id] || { lastSaved: null, preview: null };
      return { id, exists, lastSaved: m.lastSaved, preview: m.preview };
    });
  }

  public static slotExists(id: SaveSlotId): boolean {
    return !!localStorage.getItem(this.getSlotKey(id));
  }

  // ===== Save / Load per slot =====
  public static saveGame(data: Partial<GameData>, slot?: SaveSlotId): void {
    try {
      const effectiveSlot = slot ?? this.getActiveSlot();
      const currentData = this.loadGame(effectiveSlot);
      const mergedData: GameData = {
        ...currentData,
        ...data,
        version: SaveManager.VERSION,
        lastSaved: Date.now()
      };
      localStorage.setItem(this.getSlotKey(effectiveSlot), JSON.stringify(mergedData));
      this.updateMetaFromData(effectiveSlot, mergedData);
      console.log(`게임 저장 완료 (슬롯 ${effectiveSlot})`);
    } catch (error) {
      console.error('게임 저장 실패:', error);
    }
  }

  public static loadGame(slot?: SaveSlotId): GameData {
    try {
      const effectiveSlot = slot ?? this.getActiveSlot();
      const savedData = localStorage.getItem(this.getSlotKey(effectiveSlot));
      if (!savedData) {
        return this.createNewGameData();
      }
      const parsed = JSON.parse(savedData) as GameData;
      if (parsed.version !== SaveManager.VERSION) {
        console.warn('저장 데이터 버전 불일치, 기본값으로 초기화');
        return this.createNewGameData();
      }
      return parsed;
    } catch (error) {
      console.error('게임 로드 실패:', error);
      return this.createNewGameData();
    }
  }

  // ===== Mutators =====
  public static updatePlayerStats(stats: Partial<PlayerStats>): void {
    const data = this.loadGame();
    Object.assign(data.player.stats, stats);
    this.saveGame(data);
  }

  public static setFlag(key: string, value: boolean): void {
    const data = this.loadGame();
    data.gameState.flags[key] = value;
    this.saveGame(data);
  }

  public static getFlag(key: string): boolean {
    const data = this.loadGame();
    return data.gameState.flags[key] || false;
  }

  public static updateDialogueState(npcId: string, state: Partial<any>): void {
    const data = this.loadGame();
    if (!data.dialogues[npcId]) {
      data.dialogues[npcId] = {
        completedDialogues: [],
        variables: {}
      };
    }
    data.dialogues[npcId] = { ...data.dialogues[npcId], ...state };
    this.saveGame(data);
  }

  // ===== Slot operations =====
  public static clearSave(slot?: SaveSlotId): void {
    const effectiveSlot = slot ?? this.getActiveSlot();
    localStorage.removeItem(this.getSlotKey(effectiveSlot));
    // 메타 업데이트
    const meta = this.loadMeta();
    meta.slots[effectiveSlot] = { lastSaved: null, preview: null };
    this.saveMeta(meta);
    console.log(`저장 데이터 초기화 완료 (슬롯 ${effectiveSlot})`);
  }

  public static initializeSlot(slot: SaveSlotId): void {
    const data = this.createNewGameData();
    this.saveGame(data, slot);
  }
}