import Phaser from 'phaser';
import { GlobalVariableManager } from './GlobalVariableManager';
import { GinsengPlayer } from '../entities/GinsengPlayer';

export type VineState = 'idle' | 'extending' | 'retracting';

export class VineExtensionSystem {
  private scene: Phaser.Scene;
  private owner: Phaser.Physics.Arcade.Sprite;
  private ginsengPlayer?: GinsengPlayer;
  private player1?: Phaser.Physics.Arcade.Sprite;
  private gvm = GlobalVariableManager.getInstance();

  private state: VineState = 'idle';
  private vineGraphic: Phaser.GameObjects.Rectangle | null = null; // legacy line (will be hidden when sprites active)
  private aimIndicator: Phaser.GameObjects.Line | null = null;
  private vineDirection: Phaser.Math.Vector2 = new Phaser.Math.Vector2(1, 0);
  private maxLengthPx = 0;
  private currentLengthPx = 0;
  private extendDurationMs = 2000; // 2초에 걸쳐 최대 길이 도달
  private retractDurationMs = 1000; // 1초에 걸쳐 원위치로 수축
  private extendSpeedPxPerSec = 0;
  private retractSpeedPxPerSec = 0;
  private sizePx = 0; // 인삼이 크기(가로 픽셀 기준)
  private vineHalfThicknessPx = 3;
  private p1RadiusPx = 12;
  private isP1Hooked = false;

  // 스프라이트 기반 렌더링
  private tileSize = 64;
  private tipSprite: Phaser.GameObjects.Sprite | null = null; // 열4
  private vineSegments: Phaser.GameObjects.Sprite[] = [];     // 열2/열3
  private fillerSprite: Phaser.GameObjects.Sprite | null = null; // 부드러운 채움(열3), 팁에서 한 칸 뒤를 따라다님
  private dirRowIndex: number = 0; // (down,right,left,up) → (0,1,2,3)

  // UI
  private pHintText!: Phaser.GameObjects.Text;

  // 입력
  private keyE!: Phaser.Input.Keyboard.Key;
  private keyQ!: Phaser.Input.Keyboard.Key;
  private dirKeys: { up: Phaser.Input.Keyboard.Key; down: Phaser.Input.Keyboard.Key; left: Phaser.Input.Keyboard.Key; right: Phaser.Input.Keyboard.Key; };

  constructor(scene: Phaser.Scene, owner: Phaser.Physics.Arcade.Sprite, player1?: Phaser.Physics.Arcade.Sprite, ginsengPlayer?: GinsengPlayer) {
    this.scene = scene;
    this.owner = owner;
    this.ginsengPlayer = ginsengPlayer;
    this.player1 = player1;
    const body = owner.body as Phaser.Physics.Arcade.Body;
    this.sizePx = Math.max(body.width, body.height);
    this.maxLengthPx = this.sizePx * 8; // 최대 길이 = 인삼이의 8배
    this.extendSpeedPxPerSec = this.maxLengthPx / (this.extendDurationMs / 1000);
    this.retractSpeedPxPerSec = this.maxLengthPx / (this.retractDurationMs / 1000);

    // 입력 바인딩
    this.keyE = this.scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.E);
    this.keyQ = this.scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.Q);
    // 방향 지정 입력: WASD (8방향 조합 허용)
    this.dirKeys = {
      up: this.scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      down: this.scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      left: this.scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      right: this.scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D)
    };

    // UI 생성
    this.createPHintUI();
  }

  private vectorToDir4(v: Phaser.Math.Vector2): 'down'|'right'|'left'|'up' {
    // 4방향 스냅
    if (Math.abs(v.x) >= Math.abs(v.y)) {
      return v.x >= 0 ? 'right' : 'left';
    } else {
      return v.y >= 0 ? 'down' : 'up';
    }
  }

  private dirToRowIndex(d: 'down'|'right'|'left'|'up'): number {
    // (down,right,left,up) 순으로 0,1,2,3
    if (d === 'down') return 0;
    if (d === 'right') return 1;
    if (d === 'left') return 2;
    return 3; // up
  }

  private ensureTipSprite(): void {
    if (this.tipSprite && this.tipSprite.active) return;
    this.tipSprite = this.scene.add.sprite(this.owner.x, this.owner.y, 'ginseng_vine', 0);
    this.tipSprite.setDepth(4500);
    this.tipSprite.setOrigin(0.5, 0.5);
    this.tipSprite.setVisible(true);
    this.tipSprite.setAlpha(1);
    this.tipSprite.setScrollFactor(1);
  }

  private ensureFillerSprite(): void {
    if (this.fillerSprite && this.fillerSprite.active) return;
    this.fillerSprite = this.scene.add.sprite(this.owner.x, this.owner.y, 'ginseng_vine', 0);
    this.fillerSprite.setDepth(4300);
    this.fillerSprite.setOrigin(0.5, 0.5);
    this.fillerSprite.setVisible(true).setActive(true);
  }

  private acquireSegmentSpriteAt(index: number): Phaser.GameObjects.Sprite {
    let s = this.vineSegments[index];
    if (!s) {
      s = this.scene.add.sprite(this.owner.x, this.owner.y, 'ginseng_vine', 0);
      s.setDepth(4200);
      s.setOrigin(0.5, 0.5);
      s.setAlpha(1);
      s.setScrollFactor(1);
      this.vineSegments[index] = s;
    }
    s.setActive(true).setVisible(true);
    return s;
  }

  private hideUnusedSegments(usedCount: number): void {
    for (let i = usedCount; i < this.vineSegments.length; i++) {
      const s = this.vineSegments[i];
      if (s) {
        s.setActive(false).setVisible(false);
      }
    }
  }

  private setVineFrame(sprite: Phaser.GameObjects.Sprite, rowIndex: number, colIndex: 1|2|3|4): void {
    // 각 행 시작 인덱스: down=0, right=4, left=8, up=12
    const rowStart = rowIndex * 4;
    const frame = rowStart + (colIndex - 1);
    sprite.setFrame(frame);
  }

  private updateVineSprites(): void {
    // 방향 행 계산
    const d = this.vectorToDir4(this.vineDirection);
    this.dirRowIndex = this.dirToRowIndex(d);

    // 루트 위치(플레이어)
    const ax = this.owner.x;
    const ay = this.owner.y;

    // 팁: 연속 이동(자연스러운 성장감)
    this.ensureTipSprite();
    const dirUnit = this.vineDirection.clone().normalize();
    const snappedTiles = Math.max(0, Math.floor(this.currentLengthPx / this.tileSize));
    const tipX = ax + dirUnit.x * this.currentLengthPx;
    const tipY = ay + dirUnit.y * this.currentLengthPx;
    this.tipSprite!.setPosition(tipX, tipY);
    this.setVineFrame(this.tipSprite!, this.dirRowIndex, 4); // 열4 = 팁

    // 세그먼트 개수 계산 (타일 베이스)
    // i=0: 루트에 2열(루트 인접)
    // i>=1..snappedTiles: 3열(중간) 세그먼트
    const segCount3 = snappedTiles;

    let used = 0;
    for (let i = 0; i <= segCount3; i++) {
      const seg = this.acquireSegmentSpriteAt(i);
      used++;
      const px = ax + dirUnit.x * (i * this.tileSize);
      const py = ay + dirUnit.y * (i * this.tileSize);
      seg.setPosition(px, py);

      // i=0은 2열(루트 인접), 그 외는 모두 3열(중간 반복)
      this.setVineFrame(seg, this.dirRowIndex, i === 0 ? 2 : 3);
    }
    this.hideUnusedSegments(used);

    // 부드러운 채움: 팁에서 한 칸(tileSize) 뒤 위치에 3열을 연속 이동/페이드인
    const partialPx = this.currentLengthPx - snappedTiles * this.tileSize;
    const fillerOffset = this.currentLengthPx - this.tileSize;
    if (fillerOffset > 0) {
      this.ensureFillerSprite();
      const fx = ax + dirUnit.x * fillerOffset;
      const fy = ay + dirUnit.y * fillerOffset;
      this.fillerSprite!.setPosition(fx, fy);
      this.setVineFrame(this.fillerSprite!, this.dirRowIndex, 3);
      const alpha = Phaser.Math.Clamp(partialPx / this.tileSize, 0.2, 1);
      this.fillerSprite!.setAlpha(alpha);
      this.fillerSprite!.setVisible(true).setActive(true);
    } else if (this.fillerSprite) {
      this.fillerSprite.setVisible(false).setActive(false);
    }

    // 플레이어 스프라이트는 변신 직후 열1 프레임으로 유지됨(GinsengPlayer.setForm에서 설정)

    // 레거시 라인은 가리기
    if (this.vineGraphic) this.vineGraphic.setVisible(false);
  }

  private clearVineSprites(): void {
    this.tipSprite?.destroy();
    this.tipSprite = null;
    this.fillerSprite?.destroy();
    this.fillerSprite = null;
    for (const s of this.vineSegments) s.destroy();
    this.vineSegments = [];
  }

  private triggerThunderEffect(): void {
    if (!this.ginsengPlayer) return;
    
    const x = this.ginsengPlayer.sprite.x;
    const y = this.ginsengPlayer.sprite.y;
    
    const thunderSprite = this.scene.add.sprite(x, y, 'thunder', 0);
    thunderSprite.setOrigin(0.5, 1);
    thunderSprite.setDepth(1500);
    thunderSprite.play('thunder-strike');
    thunderSprite.on(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
      thunderSprite.destroy();
    });
  }

  /** 능력 활성 중(owner 이동 잠금 필요 여부) */
  public shouldLockOwnerMovement(): boolean {
    return this.state !== 'idle';
  }

  private createPHintUI(): void {
    const cx = this.scene.cameras.main.width / 2;
    const cy = this.scene.cameras.main.height - 220;
    this.pHintText = this.scene.add.text(cx, cy, 'E 능력 사용 가능: 물 근처입니다', {
      fontSize: '16px', color: '#aaffaa', fontFamily: 'monospace', backgroundColor: '#001a00'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(2100);
    this.pHintText.setVisible(false);
  }

  private updatePHintText(): void {
    const isNearWater = !!this.gvm.get('isNearWater');
    const isWaterNearby = !!this.gvm.get('waterNearby');
    
    if (isWaterNearby && !isNearWater) {
      this.pHintText.setText('E 능력 사용 가능: 물뿌리개 효과!');
      this.pHintText.setColor('#4fc3f7');
    } else if (isNearWater) {
      this.pHintText.setText('E 능력 사용 가능: 물 근처입니다');
      this.pHintText.setColor('#aaffaa');
    }
  }

  public setPHintVisible(visible: boolean): void {
    this.pHintText?.setVisible(visible);
  }

  // 게이지 UI는 제거됨

  private computeDirectionFromKeys(): Phaser.Math.Vector2 {
    // 8방향: 화살표 조합으로 계산 (Q가 눌린 동안 방향 선택)
    const dx = (this.dirKeys.right.isDown ? 1 : 0) + (this.dirKeys.left.isDown ? -1 : 0);
    const dy = (this.dirKeys.down.isDown ? 1 : 0) + (this.dirKeys.up.isDown ? -1 : 0);
    if (dx === 0 && dy === 0) return this.vineDirection.clone();
    const v = new Phaser.Math.Vector2(dx, dy).normalize();
    return v.lengthSq() === 0 ? this.vineDirection.clone() : v;
  }

  private ensureVineGraphic(): void {
    if (this.vineGraphic) return;
    this.vineGraphic = this.scene.add.rectangle(this.owner.x, this.owner.y, 4, 4, 0x2ecc71, 1)
      .setOrigin(0, 0.5)
      .setDepth(1200);
  }

  private destroyVine(): void {
    this.vineGraphic?.destroy();
    this.vineGraphic = null;
    this.aimIndicator?.destroy();
    this.aimIndicator = null;
  }

  public update(deltaMs: number): void {
    // 능력이 해금되었는지 확인
    const isUnlocked = this.gvm.get('ability_vine_extension_unlocked') === true;
    if (!isUnlocked) {
      this.setPHintVisible(false);
      return;
    }
    
    const isNearWater = !!this.gvm.get('isNearWater');
    const isWaterNearby = !!this.gvm.get('waterNearby'); // 1P의 물뿌리기로 인한 효과
    const canUseVine = isNearWater || isWaterNearby;

    // 힌트 토글: 물 근처이거나 물뿌리기 효과가 있고, 대기 상태일 때만 보이게
    if (canUseVine && this.state === 'idle') {
      this.updatePHintText();
      this.setPHintVisible(true);
    } else {
      this.setPHintVisible(false);
    }

    // 시작: 물 근처이거나 물뿌리기 효과가 있을 때 E를 누르면 즉시 확장 시작
    if (canUseVine && this.state === 'idle' && Phaser.Input.Keyboard.JustDown(this.keyE)) {
      this.state = 'extending';
      // 번개 효과 트리거
      this.triggerThunderEffect();
      // 인삼이를 vine 형태로 변신
      if (this.ginsengPlayer) {
        this.ginsengPlayer.setForm('vine');
        // 능력 중에는 본체(1열 루트)를 보이지 않게 처리 + 이동 잠금 강화
        this.ginsengPlayer.sprite.setVisible(false);
        this.ginsengPlayer.lockMovement();
      }
      
      // 초기 방향: Q+방향키가 눌려있다면 해당 방향, 아니면 우측
      this.vineDirection = this.computeDirectionFromKeys();
      if (this.vineDirection.lengthSq() === 0) this.vineDirection.set(1, 0);
      this.currentLengthPx = 0;
      this.gvm.set('isVineSkillActivated', true);
      this.gvm.set('vine_collision', true);
      this.gvm.set('collision', true);
      this.ensureVineGraphic();
    }

    if (this.state === 'extending') {
      // 조준 보정: Q가 눌려있으면 방향 갱신 허용
      if (this.keyQ.isDown) {
        const v = this.computeDirectionFromKeys();
        if (v.lengthSq() > 0) this.vineDirection.copy(v);
      }

      const add = (this.extendSpeedPxPerSec * (deltaMs / 1000));
      this.currentLengthPx = Math.min(this.currentLengthPx + add, this.maxLengthPx);

      // 덩굴 시각 업데이트 (스프라이트 기반)
      this.updateVineSprites();

      // 1P 훅 감지(한 번만)
      if (!this.isP1Hooked && this.player1 && this.testHitPlayer1()) {
        this.isP1Hooked = true;
        this.gvm.set('p1VineLocked', true);
      }

      // E를 떼면 수축 상태로 전환
      if (!this.keyE.isDown) {
        this.state = 'retracting';
      }
    }

    if (this.state === 'retracting') {
      const sub = (this.retractSpeedPxPerSec * (deltaMs / 1000));
      this.currentLengthPx = Math.max(this.currentLengthPx - sub, 0);

      // 덩굴 시각 업데이트 (스프라이트 기반)
      this.updateVineSprites();

      // 1P 끌어오기(충돌 무시 직접 이동)
      if (this.isP1Hooked && this.player1) {
        const end = this.getVineEnd();
        this.player1.setPosition(end.x, end.y);
      }

      if (this.currentLengthPx <= 0) {
        this.state = 'idle';
        
        // 번개 효과 트리거
        this.triggerThunderEffect();
        // 인삼이를 원래 ginseng 형태로 복원 + 가시성/이동 해제
        if (this.ginsengPlayer) {
          this.ginsengPlayer.setForm('ginseng');
          this.ginsengPlayer.sprite.setVisible(true);
          this.ginsengPlayer.unlockMovement();
        }
        
        this.destroyVine();
        this.clearVineSprites();
        this.gvm.set('vine_collision', false);
        this.gvm.set('collision', false);
        this.gvm.set('isVineSkillActivated', false);
        this.isP1Hooked = false;
        this.gvm.set('p1VineLocked', false);
      }
    }
  }

  public isP1MovementLocked(): boolean {
    return this.isP1Hooked || !!this.gvm.get('p1VineLocked');
  }

  private getVineStart(): Phaser.Math.Vector2 {
    return new Phaser.Math.Vector2(this.owner.x, this.owner.y);
  }

  private getVineEnd(): Phaser.Math.Vector2 {
    const v = this.vineDirection.clone().normalize().scale(this.currentLengthPx);
    return this.getVineStart().add(v);
  }

  private testHitPlayer1(): boolean {
    if (!this.player1) return false;
    const p = new Phaser.Math.Vector2(this.player1.x, this.player1.y);
    const a = this.getVineStart();
    const b = this.getVineEnd();
    const dist = this.pointToSegmentDistance(p, a, b);
    return dist <= (this.vineHalfThicknessPx + this.p1RadiusPx);
  }

  private pointToSegmentDistance(p: Phaser.Math.Vector2, a: Phaser.Math.Vector2, b: Phaser.Math.Vector2): number {
    const ab = b.clone().subtract(a);
    const ap = p.clone().subtract(a);
    const abLenSq = Math.max(1e-6, ab.lengthSq());
    const t = Phaser.Math.Clamp(ap.dot(ab) / abLenSq, 0, 1);
    const closest = a.clone().add(ab.scale(t));
    return Phaser.Math.Distance.Between(p.x, p.y, closest.x, closest.y);
  }
}

