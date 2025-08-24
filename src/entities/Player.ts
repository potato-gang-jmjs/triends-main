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
  // 이름 두 세트 보장(프로젝트 내 호환성 위해)
  ensure('player-walk-down', 0, 3);
  ensure('player-walk-left', 4, 7);
  ensure('player-walk-right', 8, 11);
  ensure('player-walk-up', 12, 15);
  // 하위 호환
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
  private dirDownAt: Record<'left' | 'right' | 'up' | 'down', number> = { left: 0, right: 0, up: 0, down: 0 };

  // ★ 전환 감지 플래그: 정지→이동 순간을 한 프레임 동안만 true→false 넘어가게 추적
  private wasMoving = false;

  // 물뿌리개 상태
  private isWateringCanEquipped = false;
  private isWateringActive = false; // 실제 물 분사 중 여부
  
  // 거울 상태
  private isMirrorEquipped = false;

  // 0키 거울-드는 포즈가 현재 표시 중인지
  private isMirroringPose = false;


  // (선택) 짧은 탭에도 모션 보이게 쓰고 있다면 그대로 동작하도록 호환
  // private minWalkDuration = 100;
  // private walkStartAt = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, spriteKey: string = 'red') {
    this.scene = scene;

    // 저장된 데이터에서 스탯 로드
    const savedData = SaveManager.loadGame();
    this.stats = { ...savedData.player.stats };

    // 에셋 존재 검사
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

    // --- 최근 입력(Last-pressed) 트래킹: 화살표 + (있다면) WASD도 함께 처리
    const kLeft  = [cursors.left,  (cursors as any)?.A].filter(Boolean) as Phaser.Input.Keyboard.Key[];
    const kRight = [cursors.right, (cursors as any)?.D].filter(Boolean) as Phaser.Input.Keyboard.Key[];
    const kUp    = [cursors.up,    (cursors as any)?.W].filter(Boolean) as Phaser.Input.Keyboard.Key[];
    const kDown  = [cursors.down,  (cursors as any)?.S].filter(Boolean) as Phaser.Input.Keyboard.Key[];

    const anyJustDown = (arr: Phaser.Input.Keyboard.Key[]) => arr.some(k => Phaser.Input.Keyboard.JustDown(k));
    const anyDown     = (arr: Phaser.Input.Keyboard.Key[]) => arr.some(k => k.isDown);

    const now = this.scene.time.now;
    if (anyJustDown(kLeft))  this.dirDownAt.left  = now;
    if (anyJustDown(kRight)) this.dirDownAt.right = now;
    if (anyJustDown(kUp))    this.dirDownAt.up    = now;
    if (anyJustDown(kDown))  this.dirDownAt.down  = now;

    // 현재 눌림 상태(여기선 ‘왼/오/위/아래 중 하나 이상’이면 true)
    const pressedLeft  = anyDown(kLeft);
    const pressedRight = anyDown(kRight);
    const pressedUp    = anyDown(kUp);
    const pressedDown  = anyDown(kDown);

    // 축 결정을 ‘최근 입력’으로
    const chooseAxis = (negDown: boolean, posDown: boolean, negAt: number, posAt: number) => {
      if (negDown && posDown) return negAt > posAt ? -1 : 1;
      if (negDown) return -1;
      if (posDown) return 1;
      return 0;
    };

    // 8방향 이동 (최근 입력 우선)
    let velocityX = chooseAxis(pressedLeft, pressedRight, this.dirDownAt.left, this.dirDownAt.right);
    let velocityY = chooseAxis(pressedUp,   pressedDown, this.dirDownAt.up,   this.dirDownAt.down);

    // 대각선 이동 보정
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
      // ★ 이동 여부 캐싱(블록 내부 스코프)
      const isMoving = (velocityX !== 0 || velocityY !== 0);

      if (!isMoving) {
        // (선택) 최소 걷기 유지시간 정책을 쓰고 있다면 그 이후에만 idle 전환
        if (!(this as any).minWalkDuration || this.scene.time.now - (this as any).walkStartAt >= (this as any).minWalkDuration) {
          this.sprite.anims.stop();
          this.sprite.setFrame(ASTRONAUT_IDLE[this.lastDir]);
        }
      } else {
        // 최근에 눌린 키가 바라보는 방향이 되도록
        if (velocityX !== 0 || velocityY !== 0) {
          // 현재 ‘눌려 있는’ 방향들 중, dirDownAt 값이 가장 최근인 것 선택
          type Dir = 'left' | 'right' | 'up' | 'down';
          const candidates: Dir[] = [];
          if (pressedLeft)  candidates.push('left');
          if (pressedRight) candidates.push('right');
          if (pressedUp)    candidates.push('up');
          if (pressedDown)  candidates.push('down');

          if (candidates.length > 0) {
            let best: Dir = candidates[0] as Dir;              // ← 최초값을 반드시 Dir로 고정
            for (const d of candidates as Dir[]) {              // ← 반복에서도 Dir로 고정
              if (this.dirDownAt[d] >= this.dirDownAt[best]) {
                best = d;
              }
            }
            this.lastDir = best;                                // ← 이제 best는 Dir 확정
          } else {
            // 아무 키도 안 눌린 프레임이라면 바라보는 방향을 유지(= lastDir 변경 X)
            // (원한다면 velocity 기준 fallback을 넣어도 됨)
            // 예: if (velocityX!==0||velocityY!==0) { ...fallback... }
          }
        }

        // 최우선: 0키로 트리거된 '거울 드는 포즈'가 켜져 있으면 어떤 상황이든 이 프레임만 보여준다.
        if (this.isMirroringPose) {
          const dirKey = this.lastDir; // 'down' | 'left' | 'right' | 'up'
          // 포즈는 애니메이션이 아닌 'player_mirroring' 단일 프레임로 강제
          const DIR_INDEX: Record<'down'|'left'|'right'|'up', number> = { down: 0, left: 1, right: 2, up: 3 };
          if (this.scene.textures.exists('player_mirroring')) {
            this.sprite.anims.stop();
            this.sprite.setTexture('player_mirroring', DIR_INDEX[dirKey]);
          }
          return; // 다른 애니메이션 로직은 완전히 패스
        }

        // 그 다음 우선순위: 물뿌리기 > 거울 > 기본 걷기
        let key: string;
        if (this.isWateringCanEquipped) {
          key = (this.isWateringActive
            ? 'player-watering-active-'
            : 'player-watering-') + this.lastDir;
        } else if (this.isMirrorEquipped) {
          key = 'player-mirror-walk-' + this.lastDir;
        } else {
          key = this.scene.anims.exists('walk-' + this.lastDir)
            ? 'walk-' + this.lastDir
            : 'player-walk-' + this.lastDir;
        }


        this.sprite.anims.play(key, true);
        // 정지→이동 전환 프레임에서는 즉시 2번째 프레임로 스냅 (play 이후에!)
        if (!this.wasMoving) {
          const anim = this.scene.anims.get(key);
          if (anim && anim.frames[1]) {
            this.sprite.anims.setCurrentFrame(anim.frames[1]);
          }
        }
        if ((this as any).walkStartAt !== undefined) {
          (this as any).walkStartAt = this.scene.time.now; // (호환) 최소 유지시간 쓰는 경우 타이머 갱신
        }
        this.sprite.setRotation(0); // 시트 회전 금지
      }

      // ★ 프레임 말미에 상태 갱신(스코프 문제 방지: 같은 블록 안에서)
      this.wasMoving = isMoving;

    } else {
      // 빨간 사각형(기존 동작 유지): 이동 중일 때만 회전
      if (velocityX !== 0 || velocityY !== 0) {
        const angle = Math.atan2(velocityY, velocityX);
        this.sprite.setRotation(angle + Math.PI / 2);
      }
    }

    // 위치 자동 저장 (1초마다)
    if ((this.scene.game as any).getFrame && (this.scene.game as any).getFrame() % 60 === 0) {
      this.savePosition();
    }
  }

  public haltMovementAndIdle(): void {
    const body = this.sprite.body as Phaser.Physics.Arcade.Body;
    body.stop();
    this.sprite.setVelocity(0, 0);
    // idle 프레임 설정(우주인 시트 기준 lastDir 유지)
    if (this.usingAstronaut) {
      this.sprite.anims.stop();
      this.sprite.setFrame(ASTRONAUT_IDLE[this.lastDir]);
    }
    this.wasMoving = false;
  }

  public savePosition(): void {
    // 현재 저장 데이터 로드
    const current = SaveManager.loadGame();

    // player 객체를 보존하면서 position만 갱신
    const updatedPlayer = {
      ...current.player,
      position: { x: this.sprite.x, y: this.sprite.y }
    };

    // 최상위 필드 얕은 병합이므로 전체 player 객체를 넘겨야 함
    SaveManager.saveGame({ player: updatedPlayer });
  }

  public updateStats(newStats: Partial<PlayerStats>): void {
    Object.assign(this.stats, newStats);

    SaveManager.updatePlayerStats(newStats);
  }

  public addStat(statName: keyof PlayerStats, amount: number): void {
    if (typeof this.stats[statName] === 'number') {
      // 단순히 수치 더하기 및 범위 클램핑(프로젝트 기존 규칙 유지)
      // 필요한 곳에 맞춰 항목별 클램핑
      (this.stats as any)[statName] = (this.stats as any)[statName] + amount;

      if (statName === 'health') {
        this.stats.health = Math.max(0, Math.min(this.stats.health, this.stats.maxHealth));
      }
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

  public setStat(statName: keyof PlayerStats, value: number): void {
    if (typeof this.stats[statName] === 'number') {
      (this.stats as any)[statName] = value;

      // 항목별 클램핑/연쇄 보정
      if (statName === 'health') {
        this.stats.health = Math.max(0, Math.min(this.stats.health, this.stats.maxHealth));
      }
      if (statName === 'maxHealth') {
        // 최대 체력 변경 시 현재 체력 클램핑
        this.stats.health = Math.max(0, Math.min(this.stats.health, this.stats.maxHealth));
      }
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

  // 물뿌리개 관련 메서드들
  public getLastDirection(): 'down' | 'left' | 'right' | 'up' {
    return this.lastDir;
  }

  public setWateringCanEquipped(equipped: boolean): void {
    this.isWateringCanEquipped = equipped;
  }

  public isWateringCanEquippedState(): boolean {
    return this.isWateringCanEquipped;
  }

  public setWateringActive(active: boolean): void {
    this.isWateringActive = active;
  }

  // 거울 관련 메서드
  public setMirrorEquipped(equipped: boolean): void {
    this.isMirrorEquipped = equipped;
  }

  public isMirrorEquippedState(): boolean {
    return this.isMirrorEquipped;
  }

  /** 키패드0: 거울 드는 포즈 시작 (애니메이션 전면 대체) */
  public startMirroringPose(durationMs = 200): void {
    // 이미 포즈 중이면 타이머만 갱신(중첩 방지)
    this.isMirroringPose = true;

    // 현재 바라보는 방향 프레임을 즉시 적용
    const DIR_INDEX: Record<'down'|'left'|'right'|'up', number> = { down: 0, left: 1, right: 2, up: 3 };
    if (this.scene.textures.exists('player_mirroring')) {
      this.sprite.anims.stop();
      this.sprite.setTexture('player_mirroring', DIR_INDEX[this.lastDir]);
    }

    // duration 후 자동 복귀
    this.scene.time.delayedCall(durationMs, () => {
      this.isMirroringPose = false;
      // 복귀 즉시 해당 방향 idle로 스냅(현재 장착 상태에 맞는 시트로)
      this.haltMovementAndIdle();
    });
  }

  /** 현재 포즈 강제 종료(필요 시 수동 복귀용) */
  public stopMirroringPose(): void {
    if (!this.isMirroringPose) return;
    this.isMirroringPose = false;
    this.haltMovementAndIdle();
  }

}
