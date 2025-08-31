import Phaser from 'phaser';
import { InteractiveObject } from './InteractiveObject';
import { GlobalVariableManager } from '../../systems/GlobalVariableManager';
import { InteractiveDef } from '../../types/ObjectTypes';
import { ActionProcessor } from '../../systems/ActionProcessor';

export class CliffWateringCan extends InteractiveObject {
  private isCollected: boolean = false;
  private vineIndicator?: Phaser.GameObjects.Text;
  private x: number;
  private y: number;

  constructor(scene: Phaser.Scene, x: number, y: number, runner?: ActionProcessor) {
    const def: InteractiveDef = {
      kind: 'interactive',
      id: `cliff_watering_can_${Math.floor(x)}_${Math.floor(y)}`,
      pos: { x: x / 64, y: y / 64 }, // 타일 좌표로 변환
      sprite: { type: 'sprite', key: 'watering_can_item', frame: 0 },
      collider: 'static'
    };
    super(scene, def, 64, runner);
    
    this.x = x;
    this.y = y;
    
    // 이미 획득했는지 체크
    const gvm = GlobalVariableManager.getInstance();
    this.isCollected = gvm.get('watering_can_collected') === true;
  }
  
  public enablePhysics(textureKeyForTiles: string): void {
    super.enablePhysics(textureKeyForTiles);
    this.initializeVisuals();
  }
  
  private initializeVisuals(): void {
    const visualSprite = (this.sprite as any).linked || this.sprite;
    if (!visualSprite) return;
    
    // 절벽 너머에 있다는 것을 시각적으로 표현
    visualSprite.setScale(0.8);
    visualSprite.setAlpha(0.9);
    
    // 덩굴로 가져올 수 있다는 힌트 표시
    this.createVineIndicator();
    
    if (this.isCollected) {
      visualSprite.setVisible(false);
      this.vineIndicator?.setVisible(false);
    }
  }

  private createVineIndicator(): void {
    // 물뿌리개 위에 힌트 텍스트 표시
    this.vineIndicator = this.scene.add.text(
      this.x,
      this.y - 30,
      '🌿',
      {
        fontSize: '20px',
        align: 'center'
      }
    );
    this.vineIndicator.setOrigin(0.5);
    
    // 위아래로 움직이는 애니메이션
    this.scene.tweens.add({
      targets: this.vineIndicator,
      y: this.y - 35,
      duration: 1000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
  }

  public canInteractWithVine(): boolean {
    // 덩굴로 상호작용 가능한지 체크
    if (this.isCollected) return false;
    
    const gvm = GlobalVariableManager.getInstance();
    const vineUnlocked = gvm.get('ability_vine_extension_unlocked') === true;
    
    return vineUnlocked;
  }

  public collectWithVine(): void {
    if (this.isCollected) return;
    
    // 물뿌리개 획득 처리
    this.isCollected = true;
    
    // 전역 변수 설정
    const gvm = GlobalVariableManager.getInstance();
    gvm.set('watering_can_collected', true);
    
    // 물뿌리개 능력 해금
    this.scene.events.emit('unlock_ability', 'watering_can');
    
    // 획득 애니메이션
    this.scene.tweens.add({
      targets: this,
      scale: 0,
      alpha: 0,
      duration: 500,
      ease: 'Power2',
      onComplete: () => {
        // 상위 클래스에 setVisible이 없으므로 제거
        // this.setVisible(false);
        this.vineIndicator?.destroy();
        
        // 획득 메시지
        this.showCollectionMessage();
      }
    });
  }

  private showCollectionMessage(): void {
    const message = this.scene.add.text(
      this.x,
      this.y,
      '물뿌리개를 획득했습니다!\nShift키로 물을 뿌릴 수 있습니다',
      {
        fontSize: '16px',
        color: '#4fc3f7',
        backgroundColor: '#000000AA',
        padding: { x: 10, y: 5 },
        align: 'center'
      }
    );
    message.setOrigin(0.5);
    message.setDepth(10000);
    
    // 위로 올라가며 사라지는 애니메이션
    this.scene.tweens.add({
      targets: message,
      y: this.y - 50,
      alpha: 0,
      duration: 2000,
      ease: 'Power2',
      onComplete: () => {
        message.destroy();
      }
    });
  }

  protected handleInteraction(): void {
    // 직접 상호작용은 불가능 (너무 멀리 있음)
    const message = this.scene.add.text(
      this.scene.cameras.main.width / 2,
      this.scene.cameras.main.height - 100,
      '너무 멀어서 손이 닿지 않습니다...',
      {
        fontSize: '14px',
        color: '#ffffff',
        backgroundColor: '#000000AA',
        padding: { x: 10, y: 5 }
      }
    );
    message.setOrigin(0.5);
    message.setScrollFactor(0);
    message.setDepth(10000);
    
    this.scene.time.delayedCall(2000, () => {
      message.destroy();
    });
  }

  public update(dt: number): void {
    super.update(dt);
    
    // 덩굴 힌트 표시 업데이트
    if (this.vineIndicator && !this.isCollected) {
      const canInteract = this.canInteractWithVine();
      this.vineIndicator.setVisible(canInteract);
    }
  }

  public destroyObject(): void {
    if (this.vineIndicator) {
      this.vineIndicator.destroy();
    }
    // 부모 클래스에 destroy 메서드 호출이 필요하다면 추가
  }
}