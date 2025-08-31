import Phaser from 'phaser';
import { BlockerObject } from './BlockerObject';
import { GlobalVariableManager } from '../../systems/GlobalVariableManager';
import { BlockerDef } from '../../types/ObjectTypes';
import { ActionProcessor } from '../../systems/ActionProcessor';

export class BurningVine extends BlockerObject {
  private fireParticles?: Phaser.GameObjects.Particles.ParticleEmitter;
  private isExtinguished: boolean = false;
  private burnAnimation?: Phaser.Tweens.Tween;
  private x: number;
  private y: number;

  constructor(scene: Phaser.Scene, x: number, y: number, runner?: ActionProcessor) {
    const def: BlockerDef = {
      kind: 'blocker',
      id: `burning_vine_${Math.floor(x)}_${Math.floor(y)}`,
      pos: { x: x, y: y }, // 타일 좌표 그대로 사용
      sprite: { type: 'sprite', key: 'vine', frame: 0 },
      collider: 'static'
    };
    super(scene, def, 64, runner);
    
    // ObjectManager에서 이미 픽셀 좌표로 변환되어 전달됨
    this.x = x;
    this.y = y;
    
    // 이미 제거되었는지 체크
    const gvm = GlobalVariableManager.getInstance();
    const vineId = `burning_vine_${Math.floor(x)}_${Math.floor(y)}`;
    this.isExtinguished = gvm.get(vineId + '_extinguished') === true;
  }
  
  public enablePhysics(textureKeyForTiles: string): void {
    super.enablePhysics(textureKeyForTiles);
    
    // enablePhysics 후에 스프라이트 설정
    this.initializeVisuals();
  }
  
  private initializeVisuals(): void {
    // 스프라이트가 생성된 후에 시각적 설정 적용
    const visualSprite = (this.sprite as any).linked || this.sprite;
    if (!visualSprite) return;
    
    // 덩굴 초기 설정 (크기 3배 축소)
    visualSprite.setScale(1.2 / 3);
    
    if (this.isExtinguished) {
      visualSprite.setVisible(false);
      if (this.sprite.body) {
        this.scene.physics.world.disable(this.sprite);
      }
    }
  }

  // private createFireEffect(): void {
  //   // 간단한 화염 효과 (파티클 대신 스프라이트 애니메이션)
  //   const visualSprite = (this.sprite as any).linked || this.sprite;
  //   if (!visualSprite) return;
    
  //   this.burnAnimation = this.scene.tweens.add({
  //     targets: visualSprite,
  //     alpha: { from: 0.7, to: 1 },
  //     scaleX: { from: 1.1 / 3, to: 1.3 / 3 },
  //     scaleY: { from: 1.1 / 3, to: 1.3 / 3 },
  //     duration: 500,
  //     yoyo: true,
  //     repeat: -1,
  //     ease: 'Sine.easeInOut'
  //   });
  // }

  // private createBurnAnimation(): void {
  //   // 붉은색과 주황색 사이를 오가는 효과
  //   this.scene.time.addEvent({
  //     delay: 200,
  //     callback: () => {
  //       if (!this.isExtinguished) {
  //         const visualSprite = (this.sprite as any).linked || this.sprite;
  //         if (visualSprite) {
  //           const tint = Phaser.Math.Between(0, 1) === 0 ? 0xff6600 : 0xff3300;
  //           visualSprite.setTint(tint);
  //         }
  //       }
  //     },
  //     loop: true
  //   });
  // }

  public canExtinguishWithWater(): boolean {
    // 물뿌리개로 끌 수 있는지 체크
    if (this.isExtinguished) return false;
    
    const gvm = GlobalVariableManager.getInstance();
    const hasWateringCan = gvm.get('watering_can_collected') === true;
    const wateringCanUnlocked = gvm.get('ability_watering_can_unlocked') === true;
    
    // 물뿌리개를 획득했거나 능력이 해금되었으면 사용 가능
    return hasWateringCan || wateringCanUnlocked;
  }

  public extinguishWithWater(): void {
    if (this.isExtinguished) return;
    
    this.isExtinguished = true;
    
    // 상태 저장
    const gvm = GlobalVariableManager.getInstance();
    const vineId = `burning_vine_${Math.floor(this.x)}_${Math.floor(this.y)}`;
    gvm.set(vineId + '_extinguished', true);
    
    // 불 끄기 애니메이션
    if (this.burnAnimation) {
      this.burnAnimation.stop();
    }
    
    // 덩굴이 바로 사라짐
    const visualSprite = (this.sprite as any).linked || this.sprite;
    if (visualSprite) {
      this.scene.tweens.add({
        targets: visualSprite,
        alpha: 0,
        scale: 0,
        duration: 500,
        ease: 'Power2',
        onComplete: () => {
          // 충돌체 비활성화
          if (this.sprite.body) {
            this.scene.physics.world.disable(this.sprite);
          }
          visualSprite.setVisible(false);
          
          // 성공 메시지
          this.showExtinguishMessage();
        }
      });
    }
  }

  // private createSmokeEffect(): void {
  //   // 간단한 연기 효과
  //   for (let i = 0; i < 5; i++) {
  //     const smoke = this.scene.add.circle(
  //       this.x + Phaser.Math.Between(-20, 20),
  //       this.y,
  //       Phaser.Math.Between(10, 20),
  //       0x888888,
  //       0.6
  //     );
      
  //     this.scene.tweens.add({
  //       targets: smoke,
  //       y: this.y - 50,
  //       alpha: 0,
  //       scale: 2,
  //       duration: 1500,
  //       delay: i * 100,
  //       ease: 'Power2',
  //       onComplete: () => {
  //         smoke.destroy();
  //       }
  //     });
  //   }
  // }

  private showExtinguishMessage(): void {
    const message = this.scene.add.text(
      this.x,
      this.y - 30,
      '덩굴을 제거했습니다!',
      {
        fontSize: '14px',
        color: '#4fc3f7',
        backgroundColor: '#000000AA',
        padding: { x: 10, y: 5 }
      }
    );
    message.setOrigin(0.5);
    message.setDepth(10000);
    
    this.scene.tweens.add({
      targets: message,
      y: this.y - 60,
      alpha: 0,
      duration: 2000,
      ease: 'Power2',
      onComplete: () => {
        message.destroy();
      }
    });
  }

  public checkWaterInteraction(waterX: number, waterY: number, range: number = 120): boolean {
    // 물뿌리개가 근처에 있는지 체크
    if (this.isExtinguished) return false;
    
    const distance = Phaser.Math.Distance.Between(this.x, this.y, waterX, waterY);
    return distance <= range;
  }

  public update(dt: number): void {
    super.update(dt);
    
    // 플레이어가 가까이 오면 경고 메시지
    if (!this.isExtinguished && this.scene.time.now % 3000 < 100) {
      const player = (this.scene as any).player;
      if (player) {
        const distance = Phaser.Math.Distance.Between(
          this.x, this.y,
          player.sprite.x, player.sprite.y
        );
        
        if (distance < 100) {
          this.showWarningMessage();
        }
      }
    }
  }

  private showWarningMessage(): void {
    const warning = this.scene.add.text(
      this.x,
      this.y - 40,
      '🔥 불타는 덩굴!',
      {
        fontSize: '12px',
        color: '#ff3333',
        backgroundColor: '#000000AA',
        padding: { x: 5, y: 2 }
      }
    );
    warning.setOrigin(0.5);
    warning.setDepth(9999);
    
    this.scene.time.delayedCall(1500, () => {
      warning.destroy();
    });
  }

  public destroyObject(): void {
    if (this.burnAnimation) {
      this.burnAnimation.stop();
    }
    if (this.fireParticles) {
      this.fireParticles.stop();
    }
    // super.destroy()는 없지만, 부모의 destroyObject를 호출할 필요가 있다면 호출
  }
}