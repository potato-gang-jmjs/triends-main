import Phaser from 'phaser';
import { GlobalVariableManager } from './GlobalVariableManager';
import { SaveManager } from './SaveManager';

export interface AbilityConfig {
  id: string;
  name: string;
  description: string;
  icon?: string;
}

export class AbilityUnlockSystem {
  private scene: Phaser.Scene;
  private abilities: Map<string, boolean> = new Map();
  private notificationText?: Phaser.GameObjects.Text;
  private notificationTimer?: Phaser.Time.TimerEvent;
  
  // 능력 설정
  private readonly ABILITY_CONFIGS: Record<string, AbilityConfig> = {
    watering_can: {
      id: 'watering_can',
      name: '물뿌리개',
      description: 'Shift키를 눌러 물을 뿌릴 수 있습니다'
    },
    vine_extension: {
      id: 'vine_extension', 
      name: '덩굴 확장',
      description: 'E키를 눌러 덩굴을 뻗을 수 있습니다'
    },
    mirror: {
      id: 'mirror',
      name: '거울',
      description: 'E키를 눌러 거울 모드를 활성화할 수 있습니다'
    }
  };

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.loadAbilities();
    this.createNotificationUI();
  }

  private loadAbilities(): void {
    const gvm = GlobalVariableManager.getInstance();
    
    // 저장된 능력 상태 로드
    for (const abilityId in this.ABILITY_CONFIGS) {
      const unlocked = gvm.get(`ability_${abilityId}_unlocked`) === true;
      this.abilities.set(abilityId, unlocked);
    }
  }

  private createNotificationUI(): void {
    // 알림 텍스트 생성 (화면 중앙 상단)
    this.notificationText = this.scene.add.text(
      this.scene.scale.width / 2,
      100,
      '',
      {
        fontSize: '24px',
        color: '#FFD700',
        backgroundColor: '#000000AA',
        padding: { x: 20, y: 10 },
        align: 'center'
      }
    );
    this.notificationText.setOrigin(0.5);
    this.notificationText.setScrollFactor(0);
    this.notificationText.setDepth(10000);
    this.notificationText.setVisible(false);
  }

  public unlockAbility(abilityId: string): boolean {
    const config = this.ABILITY_CONFIGS[abilityId];
    if (!config) {
      console.warn(`Unknown ability: ${abilityId}`);
      return false;
    }

    // 이미 해금된 경우
    if (this.abilities.get(abilityId)) {
      console.log(`Ability already unlocked: ${abilityId}`);
      return false;
    }

    // 능력 해금
    this.abilities.set(abilityId, true);
    
    // 전역 변수에 저장
    const gvm = GlobalVariableManager.getInstance();
    gvm.set(`ability_${abilityId}_unlocked`, true);
    
    // 저장
    SaveManager.saveGame({});
    
    // UI 알림 표시
    this.showUnlockNotification(config);
    
    // 이벤트 발생
    this.scene.events.emit('ability:unlocked', abilityId);
    
    console.log(`Ability unlocked: ${abilityId}`);
    return true;
  }

  public isAbilityUnlocked(abilityId: string): boolean {
    return this.abilities.get(abilityId) === true;
  }

  private showUnlockNotification(config: AbilityConfig): void {
    if (!this.notificationText) return;

    // 이전 타이머 취소
    if (this.notificationTimer) {
      this.notificationTimer.destroy();
    }

    // 알림 텍스트 설정
    const message = `🎉 새로운 능력 해금!\n${config.name}\n${config.description}`;
    this.notificationText.setText(message);
    this.notificationText.setVisible(true);

    // 페이드 인 애니메이션
    this.notificationText.setAlpha(0);
    this.scene.tweens.add({
      targets: this.notificationText,
      alpha: 1,
      duration: 500,
      ease: 'Power2'
    });

    // 3초 후 페이드 아웃
    this.notificationTimer = this.scene.time.delayedCall(3000, () => {
      this.scene.tweens.add({
        targets: this.notificationText,
        alpha: 0,
        duration: 500,
        ease: 'Power2',
        onComplete: () => {
          this.notificationText?.setVisible(false);
        }
      });
    });
  }

  public getUnlockedAbilities(): string[] {
    const unlocked: string[] = [];
    this.abilities.forEach((isUnlocked, abilityId) => {
      if (isUnlocked) {
        unlocked.push(abilityId);
      }
    });
    return unlocked;
  }

  public resetAllAbilities(): void {
    const gvm = GlobalVariableManager.getInstance();
    
    for (const abilityId in this.ABILITY_CONFIGS) {
      this.abilities.set(abilityId, false);
      gvm.set(`ability_${abilityId}_unlocked`, false);
    }
    
    SaveManager.saveGame({});
    console.log('All abilities have been reset');
  }

  public destroy(): void {
    if (this.notificationTimer) {
      this.notificationTimer.destroy();
    }
    if (this.notificationText) {
      this.notificationText.destroy();
    }
  }
}