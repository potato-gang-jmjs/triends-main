import Phaser from 'phaser';
import { PLAYER_SPEED, PLAYER_DIAGONAL_SPEED } from '../utils/constants';
import { PlayerStats } from '../types/GameData';
import { SaveManager } from '../systems/SaveManager';

// ───────── Astronaut sheet settings ─────────
type Dir = 'down' | 'left' | 'right' | 'up';
const ASTRONAUT_TEX = 'player'; // 프리로드에서 쓴 키

// row0: down(0–3) / row1: left(4–7) / row2: right(8–11) / row3: up(12–15)
const ASTRONAUT_IDLE: Record<Dir, number> = {
  down: 0, left: 4, right: 8, up: 12
};

function registerAstronautAnimations(scene: Phaser.Scene) {
  const a = scene.anims;
  const ensure = (key: string, start: number, end: number) => {
    if (!a.exists(key)) {
      a.create({
        key,
        frames: a.generateFrameNumbers(ASTRONAUT_TEX, { start, end }),
        frameRate: 8,
        repeat: -1
      });
    }
  };
  // 새 키
  ensure('player-walk-down', 0, 3);
  ensure('player-walk-left', 4, 7);
  ensure('player-walk-right', 8, 11);
  ensure('player-walk-up', 12, 15);
  // 하위 호환: 혹시 기존 코드가 walk-* 키를 참조하면 그대로 동작
  ensure('walk-down', 0, 3);
  ensure('walk-left', 4, 7);
  ensure('walk-right', 8, 11);
  ensure('walk-up', 12, 15);
}

export class Player {
  public sprite: Phaser.Physics.Arcade.Sprite;
  public stats: PlayerStats;
  private scene: Phaser.Scene;

  // 내부 상태(기존 API에는 영향 없음)
  private usingAstronaut = false;
  protected lastDir: 'down' | 'left' | 'right' | 'up' = 'down';

  constructor(scene: Phaser.Scene, x: number, y: number, spriteKey: string = 'red') {
    this.scene = scene;

    // 저장된 데이터에서 스탯 로드
    const savedData = SaveManager.loadGame();
    this.stats = { ...savedData.player.stats };

    // 우주복 시트가 로드되어 있으면 자동 사용, 아니면 기존 키 사용(완전 하위 호환)
    const hasAstronaut = scene.textures.exists(ASTRONAUT_TEX);
    this.usingAstronaut = hasAstronaut;

    this.sprite = scene.physics.add.sprite(x, y, hasAstronaut ? ASTRONAUT_TEX : spriteKey, 0);
    this.sprite.setCollideWorldBounds(true);
    this.sprite.setDepth(1000); // players always on top (temporarily overriding front layers)

    if (hasAstronaut) {
      // 64x64 시트에 맞는 히트박스(논리 32x48)와 오리진
      const body = this.sprite.body as Phaser.Physics.Arcade.Body;
      body.setSize(32, 48);
      body.setOffset(16, 16);
      this.sprite.setOrigin(0.5, 1);

      // 애니메이션 등록 및 기본 idle 프레임
      registerAstronautAnimations(scene);
      this.sprite.setFrame(ASTRONAUT_IDLE.down);
    } else {
      // 기존 빨간 사각형과 동일한 스케일 유지
      this.sprite.setScale(2);
    }

    // 저장된 위치로 설정 (처음 시작이 아닌 경우)
    if (savedData.player.position.x !== 512 || savedData.player.position.y !== 512) {
      this.sprite.setPosition(savedData.player.position.x, savedData.player.position.y);
    }
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

    // 대각선 이동 시 속도 조정(기존 상수 그대로 활용)
    if (velocityX !== 0 && velocityY !== 0) {
      velocityX *= PLAYER_DIAGONAL_SPEED / PLAYER_SPEED;
      velocityY *= PLAYER_DIAGONAL_SPEED / PLAYER_SPEED;
    }

    // 속도 적용
    this.sprite.setVelocity(
      velocityX * PLAYER_SPEED,
      velocityY * PLAYER_SPEED
    );

    // ── 시각 처리: 우주복이면 방향 애니메이션, 아니면 기존 회전 유지 ──
    if (this.usingAstronaut) {
      if (velocityX === 0 && velocityY === 0) {
        // idle
        this.sprite.anims.stop();
        this.sprite.setFrame(ASTRONAUT_IDLE[this.lastDir]);
      } else {
        // 주 이동방향 계산(가로/세로 중 큰 쪽을 우선)
        if (Math.abs(velocityX) > Math.abs(velocityY)) {
          this.lastDir = velocityX < 0 ? 'left' : 'right';
        } else {
          this.lastDir = velocityY < 0 ? 'up' : 'down';
        }
        const key = this.scene.anims.exists('walk-' + this.lastDir)
          ? 'walk-' + this.lastDir
          : 'player-walk-' + this.lastDir;
        this.sprite.anims.play(key, true);
        this.sprite.setRotation(0); // 시트 회전 금지
      }
    } else {
      // 빨간 사각형(기존 동작 유지): 이동 중일 때만 회전
      if (velocityX !== 0 || velocityY !== 0) {
        const angle = Math.atan2(velocityY, velocityX);
        this.sprite.setRotation(angle + Math.PI / 2);
      }
    }

    // 위치 자동 저장 (1초마다)
    if (this.scene.game.getFrame && this.scene.game.getFrame() % 60 === 0) {
      this.savePosition();
    }
  }

  // 스탯 업데이트
  public updateStats(newStats: Partial<PlayerStats>): void {
    Object.assign(this.stats, newStats);
    SaveManager.updatePlayerStats(newStats);
    console.log('플레이어 스탯 업데이트:', newStats);
  }

  // 특정 스탯 추가
  public addStat(statName: keyof PlayerStats, amount: number): void {
    if (typeof this.stats[statName] === 'number') {
      // @ts-ignore - 인덱스 접근 허용
      this.stats[statName] += amount;

      // 연속형 체력 클램핑
      if (statName === 'health' && this.stats.health > this.stats.maxHealth) {
        this.stats.health = this.stats.maxHealth;
      }
      // 이산형 하트 클램핑
      if (statName === 'hearts_p1') {
        this.stats.hearts_p1 = Math.max(0, Math.min(this.stats.hearts_p1, this.stats.maxHearts_p1 ?? this.stats.hearts_p1));
      }
      if (statName === 'hearts_p2') {
        this.stats.hearts_p2 = Math.max(0, Math.min(this.stats.hearts_p2, this.stats.maxHearts_p2 ?? this.stats.hearts_p2));
      }

      SaveManager.updatePlayerStats({ [statName]: this.stats[statName] } as Partial<PlayerStats>);
      console.log(`${statName} ${amount > 0 ? '+' : ''}${amount}:`, this.stats[statName]);
    }
  }

  // 특정 스탯 설정
  public setStat(statName: keyof PlayerStats, value: number): void {
    if (typeof this.stats[statName] === 'number') {
      // @ts-ignore - 인덱스 접근 허용
      this.stats[statName] = value;

      if (statName === 'health' && this.stats.health > this.stats.maxHealth) {
        this.stats.health = this.stats.maxHealth;
      }
      // 하트 관련 클램핑
      if (statName === 'hearts_p1') {
        this.stats.hearts_p1 = Math.max(0, Math.min(this.stats.hearts_p1, this.stats.maxHearts_p1 ?? this.stats.hearts_p1));
      }
      if (statName === 'hearts_p2') {
        this.stats.hearts_p2 = Math.max(0, Math.min(this.stats.hearts_p2, this.stats.maxHearts_p2 ?? this.stats.hearts_p2));
      }
      if (statName === 'maxHearts_p1' && this.stats.maxHearts_p1 < this.stats.hearts_p1) {
        this.stats.hearts_p1 = this.stats.maxHearts_p1;
      }
      if (statName === 'maxHearts_p2' && this.stats.maxHearts_p2 < this.stats.hearts_p2) {
        this.stats.hearts_p2 = this.stats.maxHearts_p2;
      }

      SaveManager.updatePlayerStats({ [statName]: this.stats[statName] } as Partial<PlayerStats>);
      console.log(`${statName} 설정:`, this.stats[statName]);
    }
  }

  // ───────── 하트 전용 헬퍼 (1P) ─────────
  public addHeartsP1(amount: number): void {
    this.addStat('hearts_p1' as keyof PlayerStats, amount);
  }

  public setHeartsP1(value: number): void {
    this.setStat('hearts_p1' as keyof PlayerStats, value);
  }

  public setMaxHeartsP1(value: number): void {
    this.setStat('maxHearts_p1' as keyof PlayerStats, value);
  }

  // 위치 저장
  public savePosition(): void {
    const gameData = SaveManager.loadGame();
    gameData.player.position = {
      x: this.sprite.x,
      y: this.sprite.y
    };
    SaveManager.saveGame(gameData);
  }

  // 스탯 정보 가져오기
  public getStats(): PlayerStats {
    return { ...this.stats };
  }

  // 디버그: 현재 스탯 출력
  public debugStats(): void {
    console.log('=== Player Stats ===');
    console.log(`체력: ${this.stats.health}/${this.stats.maxHealth}`);
    console.log(`골드: ${this.stats.gold}`);
    console.log(`경험치: ${this.stats.experience}`);
    console.log(`레벨: ${this.stats.level}`);
    console.log(`위치: (${Math.round(this.sprite.x)}, ${Math.round(this.sprite.y)})`);
  }
}
