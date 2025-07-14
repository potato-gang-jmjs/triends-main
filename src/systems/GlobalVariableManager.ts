import { SaveManager } from './SaveManager';

export class GlobalVariableManager {
  private static instance: GlobalVariableManager | null = null;

  public static getInstance(): GlobalVariableManager {
    if (!this.instance) {
      this.instance = new GlobalVariableManager();
    }
    return this.instance;
  }

  // 전역 변수 가져오기
  public get(key: string): any {
    const gameData = SaveManager.loadGame();
    return gameData.gameState.customData[key];
  }

  // 전역 변수 설정
  public set(key: string, value: any): void {
    const gameData = SaveManager.loadGame();
    if (!gameData.gameState.customData) {
      gameData.gameState.customData = {};
    }
    gameData.gameState.customData[key] = value;
    SaveManager.saveGame(gameData);
    console.log(`전역 변수 설정: ${key} = ${value}`);
  }

  // 숫자 전역 변수 증가/감소
  public add(key: string, amount: number): void {
    const currentValue = this.get(key) || 0;
    if (typeof currentValue === 'number') {
      this.set(key, currentValue + amount);
    } else {
      console.warn(`전역 변수 ${key}는 숫자가 아닙니다: ${typeof currentValue}`);
    }
  }

  // 전역 변수 존재 확인
  public has(key: string): boolean {
    const gameData = SaveManager.loadGame();
    return key in (gameData.gameState.customData || {});
  }

  // 전역 변수 삭제
  public remove(key: string): void {
    const gameData = SaveManager.loadGame();
    if (gameData.gameState.customData && key in gameData.gameState.customData) {
      delete gameData.gameState.customData[key];
      SaveManager.saveGame(gameData);
      console.log(`전역 변수 삭제: ${key}`);
    }
  }

  // 모든 전역 변수 가져오기
  public getAll(): Record<string, any> {
    const gameData = SaveManager.loadGame();
    return { ...(gameData.gameState.customData || {}) };
  }

  // 전역 변수 초기화
  public clear(): void {
    const gameData = SaveManager.loadGame();
    gameData.gameState.customData = {};
    SaveManager.saveGame(gameData);
    console.log('모든 전역 변수 초기화됨');
  }

  // 디버그용 전역 변수 출력
  public debugPrint(): void {
    const variables = this.getAll();
    console.log('=== 전역 변수 목록 ===');
    Object.entries(variables).forEach(([key, value]) => {
      console.log(`${key}: ${value} (${typeof value})`);
    });
    console.log('=====================');
  }

  // 기본 변수들 초기화 (게임 시작 시 호출)
  public initializeDefaults(): void {
    // 스토리 진행도
    if (!this.has('story_progress')) {
      this.set('story_progress', 'intro');
    }

    // 평판 시스템
    if (!this.has('reputation')) {
      this.set('reputation', 0);
    }

    // 게임 난이도
    if (!this.has('difficulty')) {
      this.set('difficulty', 'normal');
    }

    // 플레이어 이름
    if (!this.has('player_name')) {
      this.set('player_name', '모험가');
    }

    console.log('기본 전역 변수 초기화 완료');
  }
} 