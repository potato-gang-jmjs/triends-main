import Phaser from 'phaser';
import { PLAYER_SPEED, PLAYER_DIAGONAL_SPEED } from '../utils/constants';
import { Player } from './Player.js';

export class GinsengPlayer extends Player {

  private ginsengDir: 'left' | 'right' | 'up' | 'down' = 'down';

  constructor(scene: Phaser.Scene, x: number, y: number) {
    // Player가 spriteKey를 받도록 설계되어 있으니 'ginseng'을 넘겨 재사용
    super(scene, x, y, 'ginseng');

    // Player 기본이 32px 컬러블록 기준이라서, 인삼이 시트에 맞게 덮어쓰기
    this.sprite.setScale(1);
    this.sprite.setOrigin(0.5, 1);

    const body = this.sprite.body as Phaser.Physics.Arcade.Body;
    body.setSize(20, 16);
    body.setOffset(14, 32); // 필요 시 28~32 사이 미세조정

    // 애니메이션(없으면 생성)
    const a = scene.anims;
    if (!a.exists('ginseng-walk-down')) {
      a.create({
        key: 'ginseng-walk-down',
        frames: a.generateFrameNumbers('ginseng', { start: 0, end: 3 }),
        frameRate: 8,
        repeat: -1
      });
    }
    if (!a.exists('ginseng-walk-left')) {
      a.create({
        key: 'ginseng-walk-left',
        frames: a.generateFrameNumbers('ginseng', { start: 4, end: 7 }),
        frameRate: 8,
        repeat: -1
      });
    }
    if (!a.exists('ginseng-walk-right')) {
      a.create({
        key: 'ginseng-walk-right',
        frames: a.generateFrameNumbers('ginseng', { start: 8, end: 11 }),
        frameRate: 8,
        repeat: -1
      });
    }
    if (!a.exists('ginseng-walk-up')) {
      a.create({
        key: 'ginseng-walk-up',
        frames: a.generateFrameNumbers('ginseng', { start: 12, end: 15 }),
        frameRate: 8,
        repeat: -1
      });
    }
  }

  // Player.update를 완전히 대체(회전 대신 4방향 애니메를 사용)
  public override update(cursors: Phaser.Types.Input.Keyboard.CursorKeys): void {
    if (!cursors) return;

    const left = cursors.left?.isDown;
    const right = cursors.right?.isDown;
    const up = cursors.up?.isDown;
    const down = cursors.down?.isDown;

    let vx = 0, vy = 0;
    if (left) vx = -1; else if (right) vx = 1;
    if (up) vy = -1;   else if (down)  vy = 1;

    if (vx !== 0 && vy !== 0) {
      vx *= PLAYER_DIAGONAL_SPEED / PLAYER_SPEED;
      vy *= PLAYER_DIAGONAL_SPEED / PLAYER_SPEED;
    }

    this.sprite.setVelocity(vx * PLAYER_SPEED, vy * PLAYER_SPEED);

    if (vx === 0 && vy === 0) {
      // idle: 마지막 바라본 방향의 첫 프레임 고정
      const first = { down: 0, left: 4, right: 8, up: 12 }[this.ginsengDir];
      this.sprite.anims.stop();
      this.sprite.setFrame(first);
    } else {
      this.ginsengDir =
        Math.abs(vx) > Math.abs(vy) ? (vx > 0 ? 'right' : 'left') : (vy > 0 ? 'down' : 'up');
      this.sprite.anims.play('ginseng-walk-' + this.ginsengDir, true);
    }

    // 원본 Player와 동일하게 1초마다 위치 저장
    if (this.sprite.scene.game.getFrame() % 60 === 0) {
      this.savePosition();
    }
  }
}
