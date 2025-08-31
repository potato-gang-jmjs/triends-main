import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { GinsengPlayer } from '../entities/GinsengPlayer';
import { GlobalVariableManager } from './GlobalVariableManager';

export type WateringState = 'idle' | 'equipped' | 'watering';

export class WateringCanSystem {
  private scene: Phaser.Scene;
  private player: Player;
  private player2?: GinsengPlayer;
  private gvm = GlobalVariableManager.getInstance();

  private state: WateringState = 'idle';
  private waterEntity: Phaser.GameObjects.Sprite | null = null;
  private waterAmount = 10; // 최대 10초
  private maxWaterAmount = 10;
  private waterTimer = 0;
  private isWatering = false;

  // UI
  private waterUI!: Phaser.GameObjects.Text;
  private hintText!: Phaser.GameObjects.Text;

  // 입력
  private keyShift!: Phaser.Input.Keyboard.Key;

  // 범위 설정 (적당히 조절)
  private player2InteractionRange = 225; // 2P와의 상호작용 범위 (1.5배 확대)

  constructor(scene: Phaser.Scene, player: Player, player2?: GinsengPlayer) {
    this.scene = scene;
    this.player = player;
    this.player2 = player2;

    // 입력 바인딩
    this.keyShift = this.scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT);

    // UI 생성
    this.createUI();
  }

  private createUI(): void {
    // 물 양 표시 UI (오른쪽 상단)
    const uiX = this.scene.cameras.main.width - 120;
    const uiY = 30;
    this.waterUI = this.scene.add.text(uiX, uiY, '물: 10/10', {
      fontSize: '16px', 
      color: '#4fc3f7', 
      fontFamily: 'monospace', 
      backgroundColor: '#001122'
    }).setOrigin(1, 0).setScrollFactor(0).setDepth(2100);
    
    // 힌트 텍스트
    const cx = this.scene.cameras.main.width / 2;
    const cy = this.scene.cameras.main.height - 180;
    this.hintText = this.scene.add.text(cx, cy, 'Shift키: 물뿌리개 사용 가능', {
      fontSize: '16px', 
      color: '#4fc3f7', 
      fontFamily: 'monospace', 
      backgroundColor: '#001122'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(2100);
    
    this.hintText.setVisible(false);
    this.updateWaterUI();
  }

  private updateWaterUI(): void {
    if (this.waterUI) {
      // idle 상태에서는 물 양 UI 숨김
      if (this.state === 'idle') {
        this.waterUI.setVisible(false);
      } else {
        this.waterUI.setVisible(true);
        this.waterUI.setText(`물: ${Math.ceil(this.waterAmount)}/${this.maxWaterAmount}`);
        // 물이 부족하면 빨간색으로 표시
        if (this.waterAmount <= 2) {
          this.waterUI.setColor('#ff5252');
        } else {
          this.waterUI.setColor('#4fc3f7');
        }
      }
    }
  }

  private setHintVisible(visible: boolean): void {
    this.hintText?.setVisible(visible);
  }

  private setWaterUIVisible(visible: boolean): void {
    this.waterUI?.setVisible(visible);
  }

  private createWaterEntity(): void {
    if (this.waterEntity) return;

    const player = this.player.sprite;
    const direction = this.getPlayerDirection();
    
    // 방향에 따른 물 엔티티 위치 조정
    let offsetX = 0;
    let offsetY = 0;
    
    // 플레이어 width, height 가져오기 (기본 32픽셀)
    
    switch (direction) {
      case 'down':
        offsetY = 64; // 아래: y+64 (기존 유지)
        break;
      case 'left':
        offsetX = -20; // 기존 살짝 왼쪽
        offsetY = 40; // 지시: 플레이어 height/2 만큼 위로
        break;
      case 'right':
        offsetX = 20; // 지시: width 만큼 왼쪽으로
        offsetY = 40; // 지시: 플레이어 height/2 만큼 위로
        break;
      case 'up':
        offsetY = -8; // 위: y-8 (기존 유지)
        break;
    }

    // 텍스처 존재 확인
    if (!this.scene.textures.exists('water_entity')) {
      console.warn('water_entity 텍스처가 로드되지 않았습니다. 기본 시각 효과를 사용합니다.');
      this.createFallbackWaterEffect(player, offsetX, offsetY);
      return;
    }

    this.waterEntity = this.scene.add.sprite(
      player.x + offsetX, 
      player.y + offsetY, 
      'water_entity', 
      0
    );
    this.waterEntity.setOrigin(0.5, 1);
    // 플레이어보다 1 낮은 depth 설정
    const playerDepth = player.depth;
    this.waterEntity.setDepth(playerDepth - 1);
    
    // 애니메이션 안전하게 재생(방향 별 행 사용, 회전 사용 안 함)
    const animKey = `water-spray-${direction}`;
    if (this.scene.anims.exists(animKey)) {
      this.waterEntity.play(animKey);
    } else if (this.scene.anims.exists('water-spray')) {
      this.waterEntity.play('water-spray');
    } else {
      console.warn('water-spray 애니메이션이 존재하지 않습니다.');
      // 애니메이션이 없으면 기본 프레임으로 설정
      this.waterEntity.setFrame(0);
    }
  }

  private createFallbackWaterEffect(player: Phaser.Physics.Arcade.Sprite, offsetX: number, offsetY: number): void {
    // 간단한 파란색 원형 효과로 대체
    this.waterEntity = this.scene.add.circle(
      player.x + offsetX,
      player.y + offsetY,
      8, // 반지름
      0x4fc3f7, // 파란색
      0.7 // 투명도
    ) as any; // Sprite처럼 사용하기 위해 타입 캐스팅
    
    if (this.waterEntity) {
      // 플레이어보다 1 낮은 depth 설정
      const playerDepth = player.depth;
      this.waterEntity.setDepth(playerDepth - 1);
    }
    
    // 간단한 펄스 효과
    this.scene.tweens.add({
      targets: this.waterEntity,
      scaleX: 1.2,
      scaleY: 1.2,
      alpha: 0.3,
      duration: 500,
      yoyo: true,
      repeat: -1
    });
  }

  private destroyWaterEntity(): void {
    if (this.waterEntity) {
      this.waterEntity.destroy();
      this.waterEntity = null;
    }
  }

  private getPlayerDirection(): 'down' | 'left' | 'right' | 'up' {
    // Player 클래스의 getLastDirection 메서드 사용
    return this.player.getLastDirection();
  }

  private isNearWaterTile(): boolean {
    // 1P 기준 물 타일 근처 여부 확인
    return !!this.gvm.get('isP1NearWater');
  }

  private isPlayer2Nearby(): boolean {
    if (!this.player2) return false;
    
    const distance = Phaser.Math.Distance.Between(
      this.player.sprite.x, this.player.sprite.y,
      this.player2.sprite.x, this.player2.sprite.y
    );
    
    return distance <= this.player2InteractionRange;
  }

  private activatePlayer2VineAbility(): void {
    if (!this.player2) return;
    
    // 2P에게 vine 능력 사용 가능 상태 부여
    this.gvm.set('waterNearby', true);
    this.gvm.set('vineAbilityBoosted', true);
    
    console.log('2P가 vine 능력을 사용할 수 있는 상태가 되었습니다!');
  }

  private deactivatePlayer2VineAbility(): void {
    this.gvm.set('waterNearby', false);
    this.gvm.set('vineAbilityBoosted', false);
  }

  public update(deltaMs: number): void {
    // 능력이 해금되었는지 확인
    const isUnlocked = this.gvm.get('ability_watering_can_unlocked') === true;
    if (!isUnlocked) {
      this.setHintVisible(false);
      this.setWaterUIVisible(false);
      return;
    }
    
    const isNearWater = this.isNearWaterTile();
    
    // 힌트 표시 조건 및 텍스트 업데이트
    if (this.state === 'equipped' && isNearWater && this.waterAmount > 0) {
      this.hintText.setText('Shift키: 물뿌리기 시작');
      this.setHintVisible(true);
    } else {
      this.setHintVisible(false);
    }

    // Shift 입력 처리
    if (Phaser.Input.Keyboard.JustDown(this.keyShift)) {
      if (this.state === 'idle' && isNearWater) {
        // idle -> equipped: 물뿌리개 장착만
        if (this.waterAmount <= 0) {
          // 물이 없으면 자동으로 리필
          this.refillWater();
          
        }
        this.state = 'equipped';
        this.player.setWateringCanEquipped(true);
        this.player.setWateringActive(false);
        
      } else if (this.state === 'equipped' && this.waterAmount > 0) {
        // equipped -> watering: 물뿌리기 시작
        this.state = 'watering';
        this.isWatering = true;
        this.switchToWateringCanSprite();
        this.player.setWateringActive(true);
        this.createWaterEntity();
        
        // 2P가 근처에 있으면 vine 능력 활성화
        if (this.isPlayer2Nearby()) {
          this.activatePlayer2VineAbility();
        }
        
      }
    }

    // Shift 홀드/해제 처리 - watering 상태에서만
    if (this.state === 'watering') {
      if (!this.keyShift.isDown) {
        // Shift키를 떼면 물뿌리기 중지, equipped 상태로 복귀
        this.isWatering = false;
        this.player.setWateringActive(false);
        this.destroyWaterEntity();
        this.deactivatePlayer2VineAbility();
        this.state = 'equipped';
        
      }
    }

    // 물 엔티티 위치 업데이트 - watering 상태에서만
    if (this.state === 'watering' && this.waterEntity) {
      const direction = this.getPlayerDirection();
      let offsetX = 0;
      let offsetY = 0;
      
      // 플레이어 width, height 가져오기 (기본 32픽셀)
      const playerWidth = (this.player.sprite.body as Phaser.Physics.Arcade.Body)?.width || 32;
      const playerHeight = (this.player.sprite.body as Phaser.Physics.Arcade.Body)?.height || 32;
      
      switch (direction) {
        case 'down': offsetY = 64; break;
        case 'left': offsetX = -20; offsetY = -playerHeight / 2; break; // 지시 적용
        case 'right': offsetX = -playerWidth; offsetY = -playerHeight / 2; break; // 지시 적용
        case 'up': offsetY = -8; break;
      }
      
      // 안전한 위치 업데이트 (Sprite와 Circle 모두 지원)
      if (typeof this.waterEntity.setPosition === 'function') {
        this.waterEntity.setPosition(
          this.player.sprite.x + offsetX,
          this.player.sprite.y + offsetY
        );
      }
      
      // 방향 변경 시 애니메이션도 해당 행으로 보장
      const animKey = `water-spray-${direction}`;
      if (typeof (this.waterEntity as any).anims !== 'undefined') {
        const current = (this.waterEntity as any).anims?.getName?.();
        if (current !== animKey && this.scene.anims.exists(animKey)) {
          this.waterEntity!.play(animKey, true);
        }
      }
    }

    // 물 소모 처리 - Shift가 실제로 눌려있을 때만
    if (this.state === 'watering' && this.isWatering && this.keyShift.isDown) {
      if (this.waterAmount > 0) {
        // 물 소모 (1초에 1씩)
        this.waterAmount -= deltaMs / 1000;
        this.waterTimer += deltaMs;
        
        // 불타는 덩굴과의 상호작용 체크
        this.checkBurningVineInteraction();
      } else {
        // 물이 다 떨어지면 자동으로 중지하고 idle 상태로
        this.isWatering = false;
        this.player.setWateringActive(false);
        this.destroyWaterEntity();
        this.deactivatePlayer2VineAbility();
        this.state = 'idle';
        this.switchToNormalSprite();
        
      }
    }

    // equipped 상태에서 물에서 멀어지면 idle로 복귀
    if (this.state === 'equipped' && !isNearWater && this.waterAmount <= 0) {
      this.state = 'idle';
      this.switchToNormalSprite();
      
    }

    this.updateWaterUI();
  }

  private switchToWateringCanSprite(): void {
    // 물뿌리개를 든 상태로 설정
    this.player.setWateringCanEquipped(true);
    this.player.sprite.setTexture('player_watering');
    
  }

  private switchToNormalSprite(): void {
    // 일반 상태로 복구
    this.player.setWateringCanEquipped(false);
    this.player.sprite.setTexture('player');
    
  }

  // 물 보충 (물 타일에서 자동으로 호출될 수 있음)
  public refillWater(): void {
    this.waterAmount = this.maxWaterAmount;
    this.updateWaterUI();
    
  }

  public getState(): WateringState {
    return this.state;
  }

  public getWaterAmount(): number {
    return this.waterAmount;
  }

  private checkBurningVineInteraction(): void {
    // 물뿌리기 중일 때 주변 불타는 덩굴을 끄기
    if (!this.waterEntity) return;

    const waterX = this.waterEntity.x;
    const waterY = this.waterEntity.y;

    // ObjectManager에서 불타는 덩굴들을 찾아서 상호작용 체크
    const objectManager = (this.scene as any).objectManager;
    if (objectManager && objectManager.objects) {
      objectManager.objects.forEach((obj: any) => {
        if (obj.constructor.name === 'BurningVine') {
          if (obj.checkWaterInteraction && obj.checkWaterInteraction(waterX, waterY, 120)) {
            if (obj.canExtinguishWithWater && obj.canExtinguishWithWater()) {
              obj.extinguishWithWater();
              
            }
          }
        }
      });
    }
  }
}