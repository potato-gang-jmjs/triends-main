import Phaser from 'phaser';
import { GlobalVariableManager } from './GlobalVariableManager';

export type VineState = 'idle' | 'extending' | 'retracting';

export class VineExtensionSystem {
  private scene: Phaser.Scene;
  private owner: Phaser.Physics.Arcade.Sprite;
  private player1?: Phaser.Physics.Arcade.Sprite;
  private gvm = GlobalVariableManager.getInstance();

  private state: VineState = 'idle';
  private vineGraphic: Phaser.GameObjects.Rectangle | null = null;
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

  // UI
  private pHintText!: Phaser.GameObjects.Text;

  // 입력
  private keyE!: Phaser.Input.Keyboard.Key;
  private keyQ!: Phaser.Input.Keyboard.Key;
  private dirKeys: { up: Phaser.Input.Keyboard.Key; down: Phaser.Input.Keyboard.Key; left: Phaser.Input.Keyboard.Key; right: Phaser.Input.Keyboard.Key; };

  constructor(scene: Phaser.Scene, owner: Phaser.Physics.Arcade.Sprite, player1?: Phaser.Physics.Arcade.Sprite) {
    this.scene = scene;
    this.owner = owner;
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

  /** E 키가 눌려 있는 동안 이동을 잠금해야 하는지 여부 */
  public shouldLockOwnerMovement(): boolean {
    return this.keyE.isDown;
  }

  private createPHintUI(): void {
    const cx = this.scene.cameras.main.width / 2;
    const cy = this.scene.cameras.main.height - 220;
    this.pHintText = this.scene.add.text(cx, cy, 'E 능력 사용 가능: 물 근처입니다', {
      fontSize: '16px', color: '#aaffaa', fontFamily: 'monospace', backgroundColor: '#001a00'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(2100);
    this.pHintText.setVisible(false);
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
    const isNearWater = !!this.gvm.get('isNearWater');

    // 힌트 토글: 물 근처이고, 대기 상태일 때만 보이게
    this.setPHintVisible(isNearWater && this.state === 'idle');

    // 시작: 물 근처에서 E를 누르면 즉시 확장 시작
    if (isNearWater && this.state === 'idle' && Phaser.Input.Keyboard.JustDown(this.keyE)) {
      this.state = 'extending';
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

      // 덩굴 시각 업데이트
      this.ensureVineGraphic();
      const angle = Phaser.Math.RadToDeg(Math.atan2(this.vineDirection.y, this.vineDirection.x));
      this.vineGraphic!.setPosition(this.owner.x, this.owner.y);
      this.vineGraphic!.setAngle(angle);
      this.vineGraphic!.setDisplaySize(this.currentLengthPx, 6);

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

      if (this.vineGraphic) {
        const angle = Phaser.Math.RadToDeg(Math.atan2(this.vineDirection.y, this.vineDirection.x));
        this.vineGraphic.setPosition(this.owner.x, this.owner.y);
        this.vineGraphic.setAngle(angle);
        this.vineGraphic.setDisplaySize(Math.max(this.currentLengthPx, 1), 6);
      }

      // 1P 끌어오기(충돌 무시 직접 이동)
      if (this.isP1Hooked && this.player1) {
        const end = this.getVineEnd();
        this.player1.setPosition(end.x, end.y);
      }

      if (this.currentLengthPx <= 0) {
        this.state = 'idle';
        this.destroyVine();
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

