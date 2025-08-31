import { Player } from '../entities/Player';
import { SaveManager } from './SaveManager';
import { GlobalVariableManager } from './GlobalVariableManager';
import { PlayerStats, Item } from '../types/GameData';
import { AbilityUnlockSystem } from './AbilityUnlockSystem';

export class ActionProcessor {
  private player: Player;
  private globalManager: GlobalVariableManager;
  private abilitySystem?: AbilityUnlockSystem;

  constructor(player: Player, abilitySystem?: AbilityUnlockSystem) {
    this.player = player;
    this.globalManager = GlobalVariableManager.getInstance();
    this.abilitySystem = abilitySystem;
  }

  public setAbilitySystem(abilitySystem: AbilityUnlockSystem): void {
    this.abilitySystem = abilitySystem;
  }

  // 액션 문자열을 파싱하고 실행
  public processAction(actionString: string | null | undefined): void {
    if (!actionString) return;

    // 여러 액션이 ';'로 구분되어 있을 수 있음
    const actions = actionString.split(';');
    
    actions.forEach(action => {
      this.executeAction(action.trim());
    });
  }

  // 개별 액션 실행
  private executeAction(action: string): void {
    if (!action) return;

    const parts = action.split(':');
    const actionType = parts[0];

    switch (actionType) {
      case 'add_stat':
        this.handleAddStat(parts);
        break;
      case 'set_stat':
        this.handleSetStat(parts);
        break;
      case 'add_item':
        this.handleAddItem(parts);
        break;
      case 'remove_item':
        this.handleRemoveItem(parts);
        break;
      case 'set_flag':
        this.handleSetFlag(parts);
        break;
      case 'trigger_event':
        this.handleTriggerEvent(parts);
        break;
      case 'set_global':
        this.handleSetGlobal(parts);
        break;
      case 'add_global':
        this.handleAddGlobal(parts);
        break;
      case 'unlock_ability':
        this.handleUnlockAbility(parts);
        break;
      case 'teleport':
        this.handleTeleport(parts);
        break;
      default:
        console.warn(`알 수 없는 액션 타입: ${actionType}`);
    }
  }

  // 스탯 추가 (add_stat:gold:50)
  private handleAddStat(parts: string[]): void {
    if (parts.length !== 3 || !parts[1] || !parts[2]) {
      console.error('add_stat 액션 형식 오류:', parts);
      return;
    }

    const statName = parts[1] as keyof PlayerStats;
    const amount = parseInt(parts[2]);

    if (isNaN(amount)) {
      console.error('add_stat 값 오류:', parts[2]);
      return;
    }

    this.player.addStat(statName, amount);
  }

  // 스탯 설정 (set_stat:health:100)
  private handleSetStat(parts: string[]): void {
    if (parts.length !== 3 || !parts[1] || !parts[2]) {
      console.error('set_stat 액션 형식 오류:', parts);
      return;
    }

    const statName = parts[1] as keyof PlayerStats;
    const value = parseInt(parts[2]);

    if (isNaN(value)) {
      console.error('set_stat 값 오류:', parts[2]);
      return;
    }

    this.player.setStat(statName, value);
  }

  // 아이템 추가 (add_item:health_potion:3)
  private handleAddItem(parts: string[]): void {
    if (parts.length !== 3 || !parts[1] || !parts[2]) {
      console.error('add_item 액션 형식 오류:', parts);
      return;
    }

    const itemId = parts[1];
    const quantity = parseInt(parts[2]);

    if (isNaN(quantity)) {
      console.error('add_item 수량 오류:', parts[2]);
      return;
    }

    this.addToInventory(itemId, quantity);
  }

  // 아이템 제거 (remove_item:key:1)
  private handleRemoveItem(parts: string[]): void {
    if (parts.length !== 3 || !parts[1] || !parts[2]) {
      console.error('remove_item 액션 형식 오류:', parts);
      return;
    }

    const itemId = parts[1];
    const quantity = parseInt(parts[2]);

    if (isNaN(quantity)) {
      console.error('remove_item 수량 오류:', parts[2]);
      return;
    }

    this.removeFromInventory(itemId, quantity);
  }

  // 플래그 설정 (set_flag:shop_unlocked:true)
  private handleSetFlag(parts: string[]): void {
    if (parts.length !== 3 || !parts[1] || !parts[2]) {
      console.error('set_flag 액션 형식 오류:', parts);
      return;
    }

    const flagName = parts[1];
    const value = parts[2].toLowerCase() === 'true';

    SaveManager.setFlag(flagName, value);
    console.log(`플래그 설정: ${flagName} = ${value}`);
  }

  // 전역 변수 설정 (set_global:reputation:50 또는 set_global:story_progress:chapter2)
  private handleSetGlobal(parts: string[]): void {
    if (parts.length !== 3 || !parts[1] || !parts[2]) {
      console.error('set_global 액션 형식 오류:', parts);
      return;
    }

    const variableName = parts[1];
    const value = parts[2];

         // 숫자인지 확인
     const numValue = parseInt(value);
     if (!isNaN(numValue)) {
       this.globalManager.set(variableName, numValue);
     } else {
       this.globalManager.set(variableName, value);
     }

    console.log(`전역 변수 설정: ${variableName} = ${value}`);
  }

  // 전역 변수 증가/감소 (add_global:reputation:10)
  private handleAddGlobal(parts: string[]): void {
    if (parts.length !== 3) {
      console.error('add_global 액션 형식 오류:', parts);
      return;
    }

    const varName = parts[1] || '';
    const amountStr = parts[2] || '0';
    const amount = parseFloat(amountStr);

    if (isNaN(amount)) {
      console.error('add_global: 숫자가 아닌 값:', amountStr);
      return;
    }

    this.globalManager.add(varName, amount);
  }

  // 능력 해금 (unlock_ability:watering_can)
  private handleUnlockAbility(parts: string[]): void {
    if (parts.length !== 2 || !parts[1]) {
      console.error('unlock_ability 액션 형식 오류:', parts);
      return;
    }

    const abilityId = parts[1];
    
    if (!this.abilitySystem) {
      console.warn('능력 해금 시스템이 초기화되지 않았습니다');
      return;
    }

    this.abilitySystem.unlockAbility(abilityId);
  }

  // 텔레포트 (teleport:main:400,300)
  private handleTeleport(parts: string[]): void {
    if (parts.length !== 3 || !parts[1] || !parts[2]) {
      console.error('teleport 액션 형식 오류:', parts);
      return;
    }

    const mapId = parts[1];
    const coords = parts[2].split(',');
    
    if (coords.length !== 2) {
      console.error('teleport 좌표 형식 오류:', parts[2]);
      return;
    }

    const x = parseInt(coords[0] || '0');
    const y = parseInt(coords[1] || '0');

    if (isNaN(x) || isNaN(y)) {
      console.error('teleport 좌표 값 오류:', coords);
      return;
    }

    // 게임 씬에 텔레포트 이벤트 발송
    (this.player as any).scene.events.emit('teleport', { mapId, x, y });
    console.log(`텔레포트: ${mapId} (${x}, ${y})`);
  }

  // 이벤트 트리거 (trigger_event:level_up)
  private handleTriggerEvent(parts: string[]): void {
    if (parts.length !== 2 || !parts[1]) {
      console.error('trigger_event 액션 형식 오류:', parts);
      return;
    }

    const eventName = parts[1];
    this.triggerCustomEvent(eventName);
  }

  // 인벤토리에 아이템 추가
  private addToInventory(itemId: string, quantity: number): void {
    const gameData = SaveManager.loadGame();
    
    // 기존 아이템 찾기
    const existingItem = gameData.player.inventory.find(item => item.id === itemId);
    
    if (existingItem) {
      existingItem.quantity += quantity;
    } else {
      // 새 아이템 추가
      const newItem: Item = {
        id: itemId,
        name: this.getItemName(itemId),
        quantity: quantity,
        type: this.getItemType(itemId)
      };
      gameData.player.inventory.push(newItem);
    }

    SaveManager.saveGame(gameData);
    console.log(`아이템 추가: ${itemId} x${quantity}`);
  }

  // 인벤토리에서 아이템 제거
  private removeFromInventory(itemId: string, quantity: number): void {
    const gameData = SaveManager.loadGame();
    const itemIndex = gameData.player.inventory.findIndex(item => item.id === itemId);
    
    if (itemIndex === -1) {
      console.warn(`제거할 아이템을 찾을 수 없음: ${itemId}`);
      return;
    }

    const item = gameData.player.inventory[itemIndex];
    if (item) {
      item.quantity -= quantity;

      if (item.quantity <= 0) {
        gameData.player.inventory.splice(itemIndex, 1);
      }
    }

    SaveManager.saveGame(gameData);
    console.log(`아이템 제거: ${itemId} x${quantity}`);
  }

  // 아이템 이름 매핑 (나중에 별도 파일로 분리 가능)
  private getItemName(itemId: string): string {
    const itemNames: Record<string, string> = {
      'health_potion': '체력 포션',
      'mana_potion': '마나 포션',
      'key': '열쇠',
      'sword': '검',
      'shield': '방패'
    };
    return itemNames[itemId] || itemId;
  }

  // 아이템 타입 매핑
  private getItemType(itemId: string): string {
    const itemTypes: Record<string, string> = {
      'health_potion': 'consumable',
      'mana_potion': 'consumable',
      'key': 'key_item',
      'sword': 'weapon',
      'shield': 'armor'
    };
    return itemTypes[itemId] || 'misc';
  }

  // 커스텀 이벤트 처리
  private triggerCustomEvent(eventName: string): void {
    console.log(`커스텀 이벤트 트리거: ${eventName}`);
    
    // 이벤트별 로직 구현
    switch (eventName) {
      case 'shop_open':
        // 상점 열기 로직
        console.log('상점 열림!');
        break;
      case 'level_up':
        // 레벨업 로직
        this.handleLevelUp();
        break;
      default:
        console.log(`처리되지 않은 이벤트: ${eventName}`);
    }
  }

  // 레벨업 처리
  private handleLevelUp(): void {
    const currentLevel = this.player.stats.level;
    const newLevel = currentLevel + 1;
    
    this.player.setStat('level', newLevel);
    this.player.setStat('maxHealth', this.player.stats.maxHealth + 10);
    this.player.setStat('health', this.player.stats.maxHealth);
    
    console.log(`레벨업! ${currentLevel} → ${newLevel}`);
  }
} 