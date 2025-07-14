import { GameData, PlayerStats } from '../types/GameData';

export class SaveManager {
  private static readonly SAVE_KEY = 'potato-gang-save';
  private static readonly VERSION = '1.0.0';

  // 기본 게임 데이터
  private static getDefaultGameData(): GameData {
    return {
      player: {
        stats: {
          health: 100,
          maxHealth: 100,
          gold: 0,
          experience: 0,
          level: 1
        },
        position: { x: 512, y: 512 }, // 게임 중앙
        inventory: []
      },
      dialogues: {},
      gameState: {
        currentScene: 'GameScene',
        flags: {},
        customData: {}
      },
      version: SaveManager.VERSION,
      lastSaved: Date.now()
    };
  }

  // 게임 데이터 저장
  public static saveGame(data: Partial<GameData>): void {
    try {
      const currentData = this.loadGame();
      const mergedData: GameData = {
        ...currentData,
        ...data,
        version: SaveManager.VERSION,
        lastSaved: Date.now()
      };
      
      localStorage.setItem(SaveManager.SAVE_KEY, JSON.stringify(mergedData));
      console.log('게임 저장 완료');
    } catch (error) {
      console.error('게임 저장 실패:', error);
    }
  }

  // 게임 데이터 로드
  public static loadGame(): GameData {
    try {
      const savedData = localStorage.getItem(SaveManager.SAVE_KEY);
      if (!savedData) {
        return this.getDefaultGameData();
      }

      const parsed = JSON.parse(savedData) as GameData;
      
      // 버전 호환성 검사
      if (parsed.version !== SaveManager.VERSION) {
        console.warn('저장 데이터 버전 불일치, 기본값으로 초기화');
        return this.getDefaultGameData();
      }

      return parsed;
    } catch (error) {
      console.error('게임 로드 실패:', error);
      return this.getDefaultGameData();
    }
  }

  // 플레이어 스탯 업데이트
  public static updatePlayerStats(stats: Partial<PlayerStats>): void {
    const data = this.loadGame();
    Object.assign(data.player.stats, stats);
    this.saveGame(data);
  }

  // 플래그 설정
  public static setFlag(key: string, value: boolean): void {
    const data = this.loadGame();
    data.gameState.flags[key] = value;
    this.saveGame(data);
  }

  // 플래그 확인
  public static getFlag(key: string): boolean {
    const data = this.loadGame();
    return data.gameState.flags[key] || false;
  }

  // 대화 상태 업데이트
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

  // 저장 데이터 초기화
  public static clearSave(): void {
    localStorage.removeItem(SaveManager.SAVE_KEY);
    console.log('저장 데이터 초기화 완료');
  }
} 