import Phaser from 'phaser';
import { DIALOGUE_CONFIG } from '../utils/constants';

export class NPC {
  public sprite: Phaser.Physics.Arcade.Sprite;
  public dialogueId: string;
  public npcId: string;
  public interactionZone: Phaser.Physics.Arcade.Sprite;
  public isPlayerNearby: boolean = false;
  public indicator?: Phaser.GameObjects.Text;
  
  private scene: Phaser.Scene;

  constructor(
    scene: Phaser.Scene, 
    x: number, 
    y: number, 
    npcId: string,
    dialogueId: string,
    spriteKey: string = 'npc'
  ) {
    this.scene = scene;
    this.npcId = npcId;
    this.dialogueId = dialogueId;

    // NPC 스프라이트 생성 (임시로 파란 사각형)
    this.sprite = scene.physics.add.sprite(x, y, spriteKey);
    this.sprite.setScale(1.5);
    this.sprite.setImmovable(true);
    this.sprite.body!.setSize(32, 32); // 충돌 박스 크기
    this.sprite.setDepth(1000);

    // 상호작용 범위 생성 (투명한 원형 영역)
    this.interactionZone = scene.physics.add.sprite(x, y, '');
    this.interactionZone.setVisible(false);
    this.interactionZone.body!.setCircle(DIALOGUE_CONFIG.INTERACTION_RADIUS);
    this.interactionZone.setImmovable(true);

    // 상호작용 인디케이터 (말풍선 아이콘)
    this.createIndicator();

    // NPC에 데이터 저장
    this.sprite.setData('npc', this);
    this.interactionZone.setData('npc', this);
  }

  private createIndicator(): void {
    // 간단한 텍스트 인디케이터 (나중에 아이콘으로 변경 가능)
    this.indicator = this.scene.add.text(
      this.sprite.x, 
      this.sprite.y - 40, 
      '💬',
      {
        fontSize: '24px',
        align: 'center'
      }
    );
    this.indicator.setOrigin(0.5);
    this.indicator.setVisible(false);
    this.indicator.setDepth(1100);
  }

  // 플레이어가 근처에 있을 때 호출
  public onPlayerEnter(): void {
    this.isPlayerNearby = true;
    if (this.indicator) {
      this.indicator.setVisible(true);
      // 부드러운 애니메이션 효과
      this.scene.tweens.add({
        targets: this.indicator,
        y: this.indicator.y - 5,
        duration: 500,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
    }
  }

  // 플레이어가 멀어졌을 때 호출
  public onPlayerLeave(): void {
    this.isPlayerNearby = false;
    if (this.indicator) {
      this.indicator.setVisible(false);
      this.scene.tweens.killTweensOf(this.indicator);
      // 원래 위치로 복원
      this.indicator.y = this.sprite.y - 40;
    }
  }

  // NPC 업데이트 (필요시)
  public update(): void {
    // 애니메이션이나 추가 로직이 필요하면 여기에 구현
  }

  // NPC 제거
  public destroy(): void {
    if (this.indicator) {
      this.scene.tweens.killTweensOf(this.indicator);
      this.indicator.destroy();
    }
    this.sprite.destroy();
    this.interactionZone.destroy();
  }

  // 대화 시작 조건 확인
  public canStartDialogue(): boolean {
    return this.isPlayerNearby;
  }

  // NPC 위치 설정
  public setPosition(x: number, y: number): void {
    this.sprite.setPosition(x, y);
    this.interactionZone.setPosition(x, y);
    if (this.indicator) {
      this.indicator.setPosition(x, y - 40);
    }
  }
} 