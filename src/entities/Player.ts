import Phaser from 'phaser';
import { PLAYER_SPEED, PLAYER_DIAGONAL_SPEED } from '../utils/constants';

export class Player {
  public sprite: Phaser.Physics.Arcade.Sprite;
  private scene: Phaser.Scene;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.scene = scene;
    
    // 임시 플레이어 스프라이트 (빨간 사각형)
    this.sprite = scene.physics.add.sprite(x, y, 'red');
    this.sprite.setScale(2);
    this.sprite.setCollideWorldBounds(true);
  }

  update(cursors: Phaser.Types.Input.Keyboard.CursorKeys): void {
    const left = cursors.left?.isDown;
    const right = cursors.right?.isDown;
    const up = cursors.up?.isDown;
    const down = cursors.down?.isDown;
    
    // 8방향 이동
    let velocityX = 0;
    let velocityY = 0;
    
    if (left) velocityX = -1;
    else if (right) velocityX = 1;
    
    if (up) velocityY = -1;
    else if (down) velocityY = 1;
    
    // 대각선 이동 시 속도 조정
    if (velocityX !== 0 && velocityY !== 0) {
      velocityX *= PLAYER_DIAGONAL_SPEED / PLAYER_SPEED;
      velocityY *= PLAYER_DIAGONAL_SPEED / PLAYER_SPEED;
    }
    
    // 속도 적용
    this.sprite.setVelocity(
      velocityX * PLAYER_SPEED,
      velocityY * PLAYER_SPEED
    );
    
    // 이동 방향에 따른 회전 (선택사항)
    if (velocityX !== 0 || velocityY !== 0) {
      const angle = Math.atan2(velocityY, velocityX);
      this.sprite.setRotation(angle + Math.PI / 2);
    }
  }
} 