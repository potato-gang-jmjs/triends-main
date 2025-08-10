// src/entities/GinsengPlayer.ts
import Phaser from 'phaser';
import { PLAYER_SPEED, PLAYER_DIAGONAL_SPEED } from '../utils/constants';
import { PlayerStats } from '../types/GameData';
import { SaveManager } from '../systems/SaveManager';

export class GinsengPlayer {
  public sprite: Phaser.Physics.Arcade.Sprite;
  public stats: PlayerStats;

  // 내부 전용 상태(방향/애니메이션)
  private lastDir: 'left' | 'right' | 'up' | 'down' = 'down';

  constructor(scene: Phaser.Scene, x: number, y: number) {
    // 저장된 데이터에서 스탯 로드 (Player와 동일한 방식)
    const savedData = SaveManager.loadGame();
    this.stats = { ...savedData.player.stats };

    // 스프라이트 생성 (ginseng 시트 사용)
    this.sprite = scene.physics.add.sprite(x, y, 'ginseng', 0);
    this.sprite.setCollideWorldBounds(true);

    // 비주얼/히트박스 (이전 확장 버전과 동일)
    this.sprite.setScale(1);
    this.sprite.setOrigin(0.5, 1);

    const body = this.sprite.body as Phaser.Physics.Arcade.Body;
    body.setSize(20, 16);
    body.setOffset(14, 32); // 필요 시 28~32 사이 미세조정

    // 애니메이션(없으면 생성) — 행: down(0–3), left(4–7), right(8–11), up(12–15)
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

    // 저장된 위치 복원 (Player와 동일 로직)
    if (savedData.player.position.x !== 512 || savedData.player.position.y !== 512) {
      this.sprite.setPosition(savedData.player.position.x, savedData.player.position.y);
    }
  }

  // Player와 동일한 시그니처
  public update(cursors: Phaser.Types.Input.Keyboard.CursorKeys): void {
    if (!cursors) return;

    const left = cursors.left?.isDown;
    const right = cursors.right?.isDown;
    const up = cursors.up?.isDown;
    const down = cursors.down?.isDown;

    let vx = 0, vy = 0;
    if (left) vx = -1; else if (right) vx = 1;
    if (up) vy = -1;   else if (down)  vy = 1;

    // 대각선 이동 보정
    if (vx !== 0 && vy !== 0) {
      vx *= PLAYER_DIAGONAL_SPEED / PLAYER_SPEED;
      vy *= PLAYER_DIAGONAL_SPEED / PLAYER_SPEED;
    }

    // 속도 적용
    this.sprite.setVelocity(vx * PLAYER_SPEED, vy * PLAYER_SPEED);

    // 애니메이션/아이들 프레임
    if (vx === 0 && vy === 0) {
      const first = { down: 0, left: 4, right: 8, up: 12 }[this.lastDir];
      this.sprite.anims.stop();
      this.sprite.setFrame(first);
    } else {
      this.lastDir =
        Math.abs(vx) > Math.abs(vy) ? (vx > 0 ? 'right' : 'left') : (vy > 0 ? 'down' : 'up');
      this.sprite.anims.play('ginseng-walk-' + this.lastDir, true);
      this.sprite.setRotation(0);
    }

    // 1초마다 위치 저장 (Player와 동일)
    const getFrame = (this.sprite.scene.game as any).getFrame?.bind(this.sprite.scene.game);
    if (getFrame && getFrame() % 60 === 0) {
      this.savePosition();
    }
  }

  // ───────── 아래 메서드들은 Player와 동일한 공개 API ─────────

  public updateStats(newStats: Partial<PlayerStats>): void {
    Object.assign(this.stats, newStats);
    SaveManager.updatePlayerStats(this.stats);
    console.log('플레이어 스탯 업데이트:', newStats);
  }

  public addStat(statName: keyof PlayerStats, amount: number): void {
    if (typeof this.stats[statName] === 'number') {
      // @ts-ignore - 인덱스 접근 허용
      this.stats[statName] += amount;
      if (statName === 'health' && this.stats.health > this.stats.maxHealth) {
        this.stats.health = this.stats.maxHealth;
      }
      SaveManager.updatePlayerStats(this.stats);
      console.log(`${statName} ${amount > 0 ? '+' : ''}${amount}:`, this.stats[statName]);
    }
  }

  public setStat(statName: keyof PlayerStats, value: number): void {
    if (typeof this.stats[statName] === 'number') {
      // @ts-ignore - 인덱스 접근 허용
      this.stats[statName] = value;
      if (statName === 'health' && this.stats.health > this.stats.maxHealth) {
        this.stats.health = this.stats.maxHealth;
      }
      SaveManager.updatePlayerStats(this.stats);
      console.log(`${statName} 설정:`, this.stats[statName]);
    }
  }

  public savePosition(): void {
    const gameData = SaveManager.loadGame();
    gameData.player.position = { x: this.sprite.x, y: this.sprite.y };
    SaveManager.saveGame(gameData);
  }

  public getStats(): PlayerStats {
    return { ...this.stats };
  }

  public debugStats(): void {
    console.log('=== Player Stats ===');
    console.log(`체력: ${this.stats.health}/${this.stats.maxHealth}`);
    console.log(`골드: ${this.stats.gold}`);
    console.log(`경험치: ${this.stats.experience}`);
    console.log(`레벨: ${this.stats.level}`);
    console.log(`위치: (${Math.round(this.sprite.x)}, ${Math.round(this.sprite.y)})`);
  }
}
