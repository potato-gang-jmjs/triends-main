import { ConditionContext } from '../types/GameData';
import { Player } from '../entities/Player';
import { SaveManager } from './SaveManager';
import { GlobalVariableManager } from './GlobalVariableManager';

export class ConditionEvaluator {
  private player: Player;
  private globalManager: GlobalVariableManager;

  constructor(player: Player) {
    this.player = player;
    this.globalManager = GlobalVariableManager.getInstance();
  }

  // 조건 평가 메인 메서드
  public evaluate(condition: string): boolean {
    if (!condition || condition.trim() === '') {
      return true;
    }

    try {
      // 네임스페이스 기반 조건인지 확인 (점이 포함된 경우)
      if (condition.includes('.')) {
        return this.evaluateNamespacedCondition(condition);
      } else {
        // 기존 방식 (하위 호환성)
        return this.evaluateLegacyCondition(condition);
      }
    } catch (error) {
      console.error('조건 평가 오류:', condition, error);
      return false;
    }
  }

  // 네임스페이스 기반 조건 평가 (player.gold >= 100, flags.shop_unlocked == true)
  private evaluateNamespacedCondition(condition: string): boolean {
    // 조건 파싱: "namespace.property operator value"
    const match = condition.match(/^(player|flags|global)\.(\w+)\s*(>=|<=|>|<|==|!=)\s*(.+)$/);
    
    if (!match) {
      console.warn('네임스페이스 조건 파싱 실패:', condition);
      return false;
    }

    const [, namespace = '', property = '', operator = '', valueStr = ''] = match;
    
    // 네임스페이스별 값 가져오기
    let currentValue: any;
    switch (namespace) {
      case 'player':
        currentValue = this.player.stats[property as keyof typeof this.player.stats];
        break;
      case 'flags':
        currentValue = SaveManager.getFlag(property);
        break;
      case 'global':
        currentValue = this.globalManager.get(property);
        break;
      default:
        console.warn('알 수 없는 네임스페이스:', namespace);
        return false;
    }

    // 값이 undefined인 경우 처리
    if (currentValue === undefined) {
      // flags와 global의 경우 기본값 설정
      if (namespace === 'flags') {
        currentValue = false;
      } else if (namespace === 'global') {
        currentValue = 0; // 또는 null
      } else {
        console.warn(`${namespace}.${property} 값을 찾을 수 없음`);
        return false;
      }
    }

    // 비교 수행
    return this.compareValues(currentValue, operator, valueStr);
  }

  // 기존 방식 조건 평가 (gold>=10, level>5)
  private evaluateLegacyCondition(condition: string): boolean {
    const match = condition.match(/(\w+)(>=|<=|>|<|==|!=)(\w+)/);
    
    if (!match) {
      console.warn('기존 조건 파싱 실패:', condition);
      return false;
    }

    const [, property = '', operator = '', valueStr = ''] = match;
    
    // 플레이어 스탯에서 값 가져오기
    const currentValue = this.player.stats[property as keyof typeof this.player.stats];
    
    if (typeof currentValue !== 'number') {
      console.warn('알 수 없는 플레이어 스탯:', property);
      return false;
    }

    return this.compareValues(currentValue, operator, valueStr);
  }

  // 값 비교 수행
  private compareValues(currentValue: any, operator: string, valueStr: string): boolean {
    // 값 타입에 따른 파싱
    let targetValue: any;
    
    // 불린 값 처리
    if (valueStr.toLowerCase() === 'true') {
      targetValue = true;
    } else if (valueStr.toLowerCase() === 'false') {
      targetValue = false;
    } 
    // 숫자 값 처리  
    else if (/^\-?\d+(\.\d+)?$/.test(valueStr)) {
      targetValue = parseFloat(valueStr);
    }
    // 문자열 값 처리 (따옴표 제거)
    else {
      targetValue = valueStr.replace(/^['"]|['"]$/g, '');
    }

    // 타입 검사
    if (typeof currentValue !== typeof targetValue) {
      // 숫자 비교의 경우 문자열을 숫자로 변환 시도
      if (typeof currentValue === 'number' && typeof targetValue === 'string') {
        const numTarget = parseFloat(targetValue);
        if (!isNaN(numTarget)) {
          targetValue = numTarget;
        }
      } else if (typeof currentValue === 'string' && typeof targetValue === 'number') {
        const numCurrent = parseFloat(currentValue);
        if (!isNaN(numCurrent)) {
          currentValue = numCurrent;
        }
      }
    }

    // 연산자에 따른 비교
    switch (operator) {
      case '>=': return currentValue >= targetValue;
      case '<=': return currentValue <= targetValue;
      case '>': return currentValue > targetValue;
      case '<': return currentValue < targetValue;
      case '==': return currentValue === targetValue;
      case '!=': return currentValue !== targetValue;
      default:
        console.warn('알 수 없는 연산자:', operator);
        return false;
    }
  }

  // 컨텍스트 정보 가져오기 (디버그용)
  public getContext(): ConditionContext {
    return {
      player: this.player.stats,
      flags: this.getAllFlags(),
      global: this.globalManager.getAll()
    };
  }

  // 모든 플래그 가져오기
  private getAllFlags(): Record<string, boolean> {
    const gameData = SaveManager.loadGame();
    return gameData.gameState.flags || {};
  }

  // 디버그용 조건 테스트
  public debugTest(condition: string): void {
    console.log(`=== 조건 테스트: ${condition} ===`);
    const result = this.evaluate(condition);
    console.log(`결과: ${result}`);
    console.log('현재 컨텍스트:', this.getContext());
    console.log('============================');
  }
} 