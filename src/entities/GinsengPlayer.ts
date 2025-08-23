// src/entities/GinsengPlayer.ts
import Phaser from 'phaser';
import { PLAYER_SPEED, PLAYER_DIAGONAL_SPEED } from '../utils/constants';
import { PlayerStats } from '../types/GameData';
import { SaveManager } from '../systems/SaveManager';

// ginseng 시트: row0 down(0–3), row1 left(4–7), row2 right(8–11), row3 up(12–15)
type Dir = 'down' | 'left' | 'right' | 'up';
const GINSENG_TEX = 'ginseng';
const GINSENG_IDLE: Record<Dir, number> = { down: 0, left: 4, right: 8, up: 12 };

// sunflower 시트: row0 down(0–3), row1 left(4–7), row2 right(8–11), row3 up(12–15)
const SUNFLOWER_TEX = 'ginseng_sunflower';
const SUNFLOWER_IDLE: Record<Dir, number> = { down: 0, left: 4, right: 8, up: 12 };

// vine 시트: row0 down(0–3), row1 left(4–7), row2 right(8–11), row3 up(12–15)
const VINE_TEX = 'ginseng_vine';
const VINE_IDLE: Record<Dir, number> = { down: 0, left: 4, right: 8, up: 12 };

function registerGinsengAnimations(scene: Phaser.Scene) {
  const a = scene.anims;
  const ensure = (key: string, start: number, end: number) => {
    if (!a.exists(key)) {
      a.create({
        key,
        frames: a.generateFrameNumbers(GINSENG_TEX, { start, end }),
        frameRate: 8,
        repeat: -1
      });
    }
  };
  ensure('ginseng-walk-down', 0, 3);
  ensure('ginseng-walk-left', 4, 7);
  ensure('ginseng-walk-right', 8, 11);
  ensure('ginseng-walk-up', 12, 15);
}

export class GinsengPlayer {
  public sprite: Phaser.Physics.Arcade.Sprite;
  public stats: PlayerStats;

  // 내부 전용 상태
  private lastDir: Dir = 'down';
  private wasMoving = false;
  private dirDownAt: Record<'left' | 'right' | 'up' | 'down', number> = {
    left: 0, right: 0, up: 0, down: 0
  };

  private form: 'ginseng' | 'sunflower' | 'vine';

  // 이동 잠금 플래그: 변신 시작~해바라기 상태~복귀 번개 종료까지 이동 차단
  private movementLocked: boolean = false;
  // 해바라기 공격 상태/쿨다운
  private isAttackingSunflower: boolean = false;
  private attackOnCooldown: boolean = false;


  public lockMovement(): void {
    this.movementLocked = true;
    const body = this.sprite.body as Phaser.Physics.Arcade.Body;
    if (body) {
      body.setVelocity(0, 0);
      body.stop();
    }
  }

  public unlockMovement(): void {
    this.movementLocked = false;
    // 해제 시에는 다음 프레임의 입력으로 자연스럽게 전환
  }

  public isMovementLocked(): boolean {
    return this.movementLocked;
  }

  private triggerSunflowerAttack(dir: Dir): void {
    if (this.isAttackingSunflower || this.attackOnCooldown) return;

    this.lastDir = dir;
    const keyOnce = `ginseng-sunflower-${dir}-once`;

    // 상태 진입
    this.isAttackingSunflower = true;
    this.attackOnCooldown = true;

    // 속도 0 유지
    const body = this.sprite.body as Phaser.Physics.Arcade.Body;
    if (body) {
      body.setVelocity(0, 0);
      body.stop();
    }

    // 1회 재생 애니메이션 시작
    this.sprite.anims.play(keyOnce, true);

    // 마지막 프레임에서 탄 발사 이벤트 발생
    const onUpdate = (_: Phaser.Animations.Animation, frame: Phaser.Animations.AnimationFrame) => {
      // 현재 재생 중인 애니메이션이 이번 공격(one-shot)인지 확인
      if (this.sprite.anims.getName() !== keyOnce) return;

      // 마지막 프레임에서 1회만 발사
      if (frame.isLast) {
        this.sprite.off(Phaser.Animations.Events.ANIMATION_UPDATE, onUpdate);

        // 발사 위치와 방향 전달 (이벤트를 통해 씬에서 실제 스폰 처리)
        this.sprite.emit('sunflower-shoot', {
          x: this.sprite.x,
          y: this.sprite.y,
          dir: this.lastDir as 'up' | 'left' | 'right' | 'down'
        });
      }
    };
    this.sprite.on(Phaser.Animations.Events.ANIMATION_UPDATE, onUpdate);


    // 애니메이션 완료 시: 공격 종료 + 쿨다운 해제 + idle 프레임 고정
    const onComplete = (anim: Phaser.Animations.Animation) => {
      if (anim.key !== keyOnce) return;
      this.sprite.off(Phaser.Animations.Events.ANIMATION_COMPLETE, onComplete);

      this.isAttackingSunflower = false;
      this.attackOnCooldown = false;

      // idle 프레임으로 마무리
      const idle = SUNFLOWER_IDLE;
      this.sprite.anims.stop();
      this.sprite.setFrame(idle[this.lastDir]);
    };

    this.sprite.on(Phaser.Animations.Events.ANIMATION_COMPLETE, onComplete);
  }

  // (선택) Player와 호환되는 최소 걷기 유지시간 변수를 쓰고 있다면 그대로 활용됨
  // private minWalkDuration = 100;
  // private walkStartAt = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, spriteKey: string = GINSENG_TEX) {
    // 저장된 데이터에서 스탯 로드 (Player와 동일한 방식)
    const savedData = SaveManager.loadGame();
    this.stats = { ...savedData.player.stats };

    this.sprite = scene.physics.add.sprite(x, y, spriteKey, 0);
    this.sprite.setCollideWorldBounds(true);
    this.sprite.setDepth(1000);
    this.sprite.setOrigin(0.5, 1);

    // 히트박스: 64x64 시트 기준 논리 32x48 박스
    const body = this.sprite.body as Phaser.Physics.Arcade.Body;
    body.setSize(32, 48);
    body.setOffset(16, 16);

    // 애니메이션 등록 및 기본 idle 세팅
    registerGinsengAnimations(scene);

    this.form = spriteKey === SUNFLOWER_TEX ? 'sunflower' : 
                spriteKey === VINE_TEX ? 'vine' : 'ginseng';
    
    const idleFrames = this.form === 'ginseng' ? GINSENG_IDLE :
                      this.form === 'sunflower' ? SUNFLOWER_IDLE : VINE_IDLE;
    this.sprite.setFrame(idleFrames.down);
    
    // 저장된 위치 복원
    if (savedData.player.position.x !== 512 || savedData.player.position.y !== 512) {
      this.sprite.setPosition(savedData.player.position.x, savedData.player.position.y);
    }
  }

  // Player와 동일한 시그니처
  public update(cursors: Phaser.Types.Input.Keyboard.CursorKeys): void {
    if (!cursors) return;

    // 이동 잠금 상태: 속도 0, (해바라기 폼일 때만) WASD 단발(JustDown)로 공격 트리거
    if (this.movementLocked) {
      const body = this.sprite.body as Phaser.Physics.Arcade.Body;
      if (body) {
        body.setVelocity(0, 0);
        body.stop();
      }

      // 기본 idle 유지 준비
      const idle = (this.form === 'ginseng' ? GINSENG_IDLE : SUNFLOWER_IDLE);

      if (this.form === 'sunflower') {
        // "딸깍" 1회 입력 감지
        const L = cursors.left, R = cursors.right, U = cursors.up, D = cursors.down;
        const justLeft  = L && Phaser.Input.Keyboard.JustDown(L);
        const justRight = R && Phaser.Input.Keyboard.JustDown(R);
        const justUp    = U && Phaser.Input.Keyboard.JustDown(U);
        const justDown  = D && Phaser.Input.Keyboard.JustDown(D);

        // 이미 공격 중이면 입력 무시(인터럽트 금지)
        if (!this.isAttackingSunflower && !this.attackOnCooldown) {
          if (justLeft)       this.triggerSunflowerAttack('left');
          else if (justRight) this.triggerSunflowerAttack('right');
          else if (justUp)    this.triggerSunflowerAttack('up');
          else if (justDown)  this.triggerSunflowerAttack('down');
        }

        // 공격 중이 아닐 때는 idle 프레임으로 유지
        if (!this.isAttackingSunflower) {
          this.sprite.anims.stop();
          this.sprite.setFrame(idle[this.lastDir]);
        }
      } else {
        // 인삼 폼: 잠금 중에는 항상 idle
        this.sprite.anims.stop();
        this.sprite.setFrame(idle[this.lastDir]);
      }

      this.sprite.setRotation(0);
      this.wasMoving = false;
      return;
    }


    // --- 최근 입력(Last-pressed) 트래킹: 화살표 + (있다면) WASD도 함께 처리
    const kLeft  = [cursors.left,  (cursors as any)?.A].filter(Boolean) as Phaser.Input.Keyboard.Key[];
    const kRight = [cursors.right, (cursors as any)?.D].filter(Boolean) as Phaser.Input.Keyboard.Key[];
    const kUp    = [cursors.up,    (cursors as any)?.W].filter(Boolean) as Phaser.Input.Keyboard.Key[];
    const kDown  = [cursors.down,  (cursors as any)?.S].filter(Boolean) as Phaser.Input.Keyboard.Key[];

    const anyJustDown = (arr: Phaser.Input.Keyboard.Key[]) => arr.some(k => Phaser.Input.Keyboard.JustDown(k));
    const anyDown     = (arr: Phaser.Input.Keyboard.Key[]) => arr.some(k => k.isDown);

    const now = this.sprite.scene.time.now;
    if (anyJustDown(kLeft))  this.dirDownAt.left  = now;
    if (anyJustDown(kRight)) this.dirDownAt.right = now;
    if (anyJustDown(kUp))    this.dirDownAt.up    = now;
    if (anyJustDown(kDown))  this.dirDownAt.down  = now;

    const pressedLeft  = anyDown(kLeft);
    const pressedRight = anyDown(kRight);
    const pressedUp    = anyDown(kUp);
    const pressedDown  = anyDown(kDown);

    const chooseAxis = (negDown: boolean, posDown: boolean, negAt: number, posAt: number) => {
      if (negDown && posDown) return negAt > posAt ? -1 : 1; // 최근에 눌린 쪽 우선
      if (negDown) return -1;
      if (posDown) return 1;
      return 0;
    };

    // 이동 벡터(최근 입력 우선)
    let vx = chooseAxis(pressedLeft, pressedRight, this.dirDownAt.left, this.dirDownAt.right);
    let vy = chooseAxis(pressedUp,   pressedDown, this.dirDownAt.up,   this.dirDownAt.down);

    // 대각선 보정
    if (vx !== 0 && vy !== 0) {
      vx *= PLAYER_DIAGONAL_SPEED / PLAYER_SPEED;
      vy *= PLAYER_DIAGONAL_SPEED / PLAYER_SPEED;
    }

    // 속도 적용
    this.sprite.setVelocity(vx * PLAYER_SPEED, vy * PLAYER_SPEED);

    const isMoving = (vx !== 0 || vy !== 0);

    // 애니메이션/아이들 프레임
    if (!isMoving) {
      // (선택) 최소 걷기 유지시간 정책을 쓰고 있다면 그 이후에만 idle 전환
      if (!(this as any).minWalkDuration || this.sprite.scene.time.now - (this as any).walkStartAt >= (this as any).minWalkDuration) {

        const idleFrames = this.form === 'ginseng' ? GINSENG_IDLE :
                          this.form === 'sunflower' ? SUNFLOWER_IDLE : VINE_IDLE;
        const first = idleFrames[this.lastDir];
        
        this.sprite.anims.stop();
        this.sprite.setFrame(first);
      }
    } else {
      // 최근에 눌린 키가 바라보는 방향이 되도록
      type D = 'left' | 'right' | 'up' | 'down';
      const candidates: D[] = [];
      if (pressedLeft)  candidates.push('left');
      if (pressedRight) candidates.push('right');
      if (pressedUp)    candidates.push('up');
      if (pressedDown)  candidates.push('down');

      if (candidates.length > 0) {
        let best: D = candidates[0] as D;
        for (const d of candidates as D[]) {
          if (this.dirDownAt[d] >= this.dirDownAt[best]) best = d;
        }
        // 수평/수직에 맞춰 lastDir 지정
        if (best === 'left' || best === 'right') {
          this.lastDir = best;
        } else {
          this.lastDir = best;
        }
      }

      const prefix = this.form === 'ginseng' ? 'ginseng-walk-' :
                    this.form === 'sunflower' ? 'ginseng-sunflower-' : 'ginseng-vine-';
      const key = prefix + this.lastDir;

      // ★ play를 먼저 호출한 후, 전환 프레임에서 2번째 프레임으로 스냅
      this.sprite.anims.play(key, true);
      if (!this.wasMoving) {
        const anim = this.sprite.scene.anims.get(key);
        if (anim && anim.frames[1]) {
          // 같은 틱에서 0프레임으로 리셋되는 것을 덮어씀
          this.sprite.anims.setCurrentFrame(anim.frames[1]);
        }
      }

      if ((this as any).walkStartAt !== undefined) {
        (this as any).walkStartAt = this.sprite.scene.time.now;
      }
      this.sprite.setRotation(0);
    }

    // 프레임 말미에 전환 상태 갱신
    this.wasMoving = isMoving;

    // 1초마다 위치 저장 (Player와 동일)
    const getFrame = (this.sprite.scene.game as any).getFrame?.bind(this.sprite.scene.game);
    if (getFrame && getFrame() % 60 === 0) {
      this.savePosition();
    }
  }

  public haltMovementAndIdle(): void {
    const body = this.sprite.body as Phaser.Physics.Arcade.Body;
    body.stop();
    this.sprite.setVelocity(0, 0);
    
    const idleFrames = this.form === 'ginseng' ? GINSENG_IDLE :
                      this.form === 'sunflower' ? SUNFLOWER_IDLE : VINE_IDLE;
    const first = idleFrames[this.lastDir];
    this.sprite.anims.stop();
    this.sprite.setFrame(first);
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

    // 최상위 얕은 병합 → 전체 player 객체로 저장
    SaveManager.saveGame({ player: updatedPlayer });
  }

  // ───────── 아래 메서드들은 Player와 동일한 공개 API ─────────

  public updateStats(newStats: Partial<PlayerStats>): void {
    Object.assign(this.stats, newStats);
    SaveManager.updatePlayerStats(newStats);
  }

  public addStat(statName: keyof PlayerStats, amount: number): void {
    if (typeof this.stats[statName] === 'number') {
      // 단순 더하기
      (this.stats as any)[statName] = (this.stats as any)[statName] + amount;

      // 항목별 클램핑(프로젝트 규칙과 동일)
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
      console.log(`${statName} ${amount > 0 ? '+' : ''}${amount}:`, this.stats[statName]);
    }
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

  public setForm(newForm: 'ginseng' | 'sunflower' | 'vine'): void {
    if (this.form === newForm) return;
    this.form = newForm;

    const tex = newForm === 'ginseng' ? GINSENG_TEX :
               newForm === 'sunflower' ? SUNFLOWER_TEX : VINE_TEX;
    this.sprite.setTexture(tex);

    // 형태에 맞는 idle 프레임으로 전환
    const idle = newForm === 'ginseng' ? GINSENG_IDLE :
                newForm === 'sunflower' ? SUNFLOWER_IDLE : VINE_IDLE;
    
    this.sprite.anims.stop();
    this.sprite.setFrame(idle[this.lastDir]);

    // 히트박스는 통일 (필요 시 형태별로 조정 가능)
    const body = this.sprite.body as Phaser.Physics.Arcade.Body;
    body.setSize(32, 48);
    body.setOffset(16, 16);
  }

  public toggleForm(): void {
    this.setForm(this.form === 'ginseng' ? 'sunflower' : 'ginseng');
  }

  public isSunflowerForm(): boolean {
    return this.form === 'sunflower';
  }

  public isVineForm(): boolean {
    return this.form === 'vine';
  }
}
