import Phaser from 'phaser';
import { SCENES, GAME_WIDTH, GAME_HEIGHT } from '../utils/constants';
import { Player } from '../entities/Player.js';
import { GinsengPlayer } from '../entities/GinsengPlayer.js';
import { NPCManager, NPCConfig } from '../systems/NPCManager';
import { NPC_DEFINITIONS } from '../data/NPCDefinitions';
import { NPCSpawnDef } from '../types/MapTypes';
import { DialogueManager } from '../systems/DialogueManager';
import { DialogueBox } from '../ui/DialogueBox';
import { SaveManager } from '../systems/SaveManager';
import { GlobalVariableManager } from '../systems/GlobalVariableManager';
import { MapManager } from '../systems/MapManager';

export class GameScene extends Phaser.Scene {
  private player!: Player;
  private player2!: GinsengPlayer;
  private keysWASD!: Phaser.Types.Input.Keyboard.CursorKeys;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private npcManager!: NPCManager;
  private dialogueManager!: DialogueManager;
  private dialogueBox!: DialogueBox;
  private spaceKey!: Phaser.Input.Keyboard.Key;
  private zKey!: Phaser.Input.Keyboard.Key;
  private xKey!: Phaser.Input.Keyboard.Key;
  private rKey!: Phaser.Input.Keyboard.Key;
  private mapManager!: MapManager;
  private isTransitioning = false;
  private portalHintContainer!: Phaser.GameObjects.Container;
  
  // 하트 UI
  private heartsTextP1!: Phaser.GameObjects.Text;
  private heartsTextP2!: Phaser.GameObjects.Text;
  private lastHeartsP1 = '';
  private lastHeartsP2 = '';
  private uiFrameTicker = 0;

  constructor() {
    super({ key: SCENES.GAME });
  }

  preload(): void {
    this.load.spritesheet('ginseng', 'assets/characters/ginseng_walking.png', {
      frameWidth: 48,
      frameHeight: 48
    });
    this.load.spritesheet('thunder', 'assets/gimmicks/thunder.png', {
      frameWidth: 128,
      frameHeight: 192
    });
    this.load.spritesheet('ginseng_sunflower', 'assets/gimmicks/sunflower.png', {
      frameWidth: 64,
      frameHeight: 64
    });
    this.load.spritesheet('player', 'assets/characters/astronaut_walking.png', {
      frameWidth: 64,
      frameHeight: 64
    });
  }

  create(): void {
    console.log('게임 씬 시작');

    // 배경 (현재 화면 크기에 맞춤)
    const bg = this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'sky');
    bg.setDisplaySize(GAME_WIDTH, GAME_HEIGHT);

    // 맵 로드/충돌 구성
    this.mapManager = new MapManager(this);
    this.mapManager.setCollisionMode('arcade');
    this.mapManager.load('map:main').then(() => this.loadNPCsForMap('main'));

    // 우주인 애니메이션 등록
    this.anims.create({
      key: 'walk-down',
      frames: this.anims.generateFrameNumbers('player', { start: 0, end: 3 }),
      frameRate: 8,
      repeat: -1
    });

    this.anims.create({
      key: 'walk-left',
      frames: this.anims.generateFrameNumbers('player', { start: 4, end: 7 }),
      frameRate: 8,
      repeat: -1
    });

    this.anims.create({
      key: 'walk-right',
      frames: this.anims.generateFrameNumbers('player', { start: 8, end: 11 }),
      frameRate: 8,
      repeat: -1
    });

    this.anims.create({
      key: 'walk-up',
      frames: this.anims.generateFrameNumbers('player', { start: 12, end: 15 }),
      frameRate: 8,
      repeat: -1
    });

    // 인삼이 애니메이션 등록
    this.anims.create({
      key: 'ginseng-walk-down',
      frames: this.anims.generateFrameNumbers('ginseng', { start: 0, end: 3 }),
      frameRate: 8,
      repeat: -1
    });
    this.anims.create({
      key: 'ginseng-walk-left',
      frames: this.anims.generateFrameNumbers('ginseng', { start: 4, end: 7 }),
      frameRate: 8,
      repeat: -1
    });
    this.anims.create({
      key: 'ginseng-walk-right',
      frames: this.anims.generateFrameNumbers('ginseng', { start: 8, end: 11 }),
      frameRate: 8,
      repeat: -1
    });
    this.anims.create({
      key: 'ginseng-walk-up',
      frames: this.anims.generateFrameNumbers('ginseng', { start: 12, end: 15 }),
      frameRate: 8,
      repeat: -1
    });

    // 변신 번개 애니메이션 등록 (thunder 시트 사용)
    if (!this.anims.exists('thunder-strike')) {
      this.anims.create({
        key: 'thunder-strike',
        frames: this.anims.generateFrameNumbers('thunder', { start: 0, end: 5 }),
        frameRate: 16,
        repeat: 0
      });
    }

    // 인삼이 해바라기 애니메이션 등록
    this.anims.create({
      key: 'ginseng-sunflower-down',
      frames: this.anims.generateFrameNumbers('ginseng_sunflower', { start: 0, end: 3 }),
      frameRate: 8,
      repeat: -1
    });
    this.anims.create({
      key: 'ginseng-sunflower-left',
      frames: this.anims.generateFrameNumbers('ginseng_sunflower', { start: 4, end: 7 }),
      frameRate: 8,
      repeat: -1
    });
    this.anims.create({
      key: 'ginseng-sunflower-right',
      frames: this.anims.generateFrameNumbers('ginseng_sunflower', { start: 8, end: 11 }),
      frameRate: 8,
      repeat: -1
    });
    this.anims.create({
      key: 'ginseng-sunflower-up',
      frames: this.anims.generateFrameNumbers('ginseng_sunflower', { start: 12, end: 15 }),
      frameRate: 8,
      repeat: -1
    });
    
    // 플레이어 생성
    // Player1 생성
    this.player = new Player(this, GAME_WIDTH / 2, GAME_HEIGHT / 2 + 256);

    // Player2 생성
    this.player2 = new GinsengPlayer(this, GAME_WIDTH / 2 + 128, GAME_HEIGHT / 2);

    // 키 입력 설정은 setupInput()에서 일괄 처리

    // NPC 매니저 생성
    this.npcManager = new NPCManager(this, this.player);
    
    // 대화 매니저 생성
    this.dialogueManager = new DialogueManager(this, this.player);
    
    // 대화 UI 생성
    this.dialogueBox = new DialogueBox(this);
    
    // 전역 변수 매니저 초기화
    GlobalVariableManager.getInstance().initializeDefaults();
    
    // 대화 시스템 이벤트 연결
    this.setupDialogueEvents();
    
    // NPC들 배치는 맵 로드 완료 후 처리 (.then에서 호출)
    
    // 키보드 입력 설정
    this.setupInput();
    // 포탈 힌트 UI 생성
    this.createPortalHintUI();
    
    // 카메라 설정 및 플레이어 충돌 연결
    this.cameras.main.startFollow(this.player.sprite);
    this.mapManager.attachPlayer(this.player.sprite);
    this.mapManager.attachPlayer(this.player2.sprite);
    
    // 입력이 비활성화 상태가 아니도록 보정
    if (this.input?.keyboard) this.input.keyboard.enabled = true;

    // 게임 시작 메시지
    this.showWelcomeMessage();

    // 하트 UI 생성 (좌상단)
    this.createHeartsUI();
  }

  private setupDialogueEvents(): void {
    // 대화 시작 시
    this.dialogueManager.onDialogueStart = (npc, _dialogue) => {
      console.log(`대화 시작: ${npc.npcId}`);
      this.haltPlayersAndResetKeys(); // 대화 시작 순간 즉시 멈춤 + 키 리셋
    };

    // 대화 종료 시
    this.dialogueManager.onDialogueEnd = () => {
      this.dialogueBox.hide();
      console.log('대화 종료');
    };

    // 대화 내용 변경 시
    this.dialogueManager.onConversationChange = (conversation, choices) => {
      const npcName = this.getCurrentNPCName();
      this.dialogueBox.showDialogue(conversation, npcName, choices);
    };

    // 타이핑 완료 시
    this.dialogueManager.onTypingComplete = () => {
      console.log('타이핑 완료');
    };

    // 선택지 선택 시
    this.dialogueBox.onChoiceSelected = (choiceIndex) => {
      this.dialogueManager.selectChoice(choiceIndex);
    };

    // 타이핑 완료 시 - DialogueManager에게 알려줌
    this.dialogueBox.onTypingComplete = () => {
      // DialogueManager의 타이핑 완료 처리
      if (this.dialogueManager.getState().isTyping) {
        this.dialogueManager.completeTyping();
      }
    };
  }

  private async loadNPCsForMap(mapId: string): Promise<void> {
    // 기존 NPC 정리 후 재생성(그룹 포함)
    if (this.npcManager) {
      this.npcManager.destroy();
    }
    this.npcManager = new NPCManager(this, this.player);

    try {
      const res = await fetch(`assets/maps/${mapId}/npcs.json`);
      if (!res.ok) {
        console.warn(`NPC 데이터 없음: assets/maps/${mapId}/npcs.json`);
        return;
      }
      const list = (await res.json()) as NPCSpawnDef[];
      const tileSize = this.mapManager.getTileSize();

      const placed: NPCConfig[] = list
        .map((spawn) => {
          const def = NPC_DEFINITIONS[spawn.npcId];
          if (!def) {
            console.warn(`정의되지 않은 NPC: ${spawn.npcId}`);
            return null;
          }
          const dialogueId = spawn.overrides?.dialogueId ?? def.dialogueId;
          const spriteKey = spawn.overrides?.spriteKey ?? def.spriteKey;
          return {
            npcId: def.npcId,
            dialogueId,
            spriteKey,
            x: spawn.pos.x * tileSize + tileSize / 2,
            y: spawn.pos.y * tileSize + tileSize / 2
          } as NPCConfig;
        })
        .filter(Boolean) as NPCConfig[];

      placed.forEach(cfg => this.npcManager.addNPC(cfg));
      console.log(`${placed.length}개의 NPC가 배치되었습니다. (map:${mapId})`);
    } catch (e) {
      console.warn('NPC 데이터 로드 실패:', e);
    }
  }

  private setupInput(): void {
    // 기본 커서 키
    this.cursors = this.input.keyboard!.createCursorKeys();

    // WASD를 CursorKeys와 동일한 shape으로 매핑
    this.keysWASD = this.input.keyboard!.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D
    }) as unknown as Phaser.Types.Input.Keyboard.CursorKeys;

    
    // 스페이스 키
    this.spaceKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    // Z 키 (위치 확인)
    this.zKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.Z);
    // X (충돌체 디버그 토글)
    this.xKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.X);
    // R (인삼 ↔ 해바라기 변신)
    this.rKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.R);
    
    // 스페이스 키 이벤트
    this.spaceKey.on('down', () => {
      this.handleSpaceKeyPress();
    });
    // Z 키 이벤트: 플레이어/인삼 좌표 출력
    this.zKey.on('down', () => {
      const p1 = this.player?.sprite;
      const p2 = this.player2?.sprite;
      const msg = `P1: (${Math.round(p1.x)}, ${Math.round(p1.y)})  P2: (${Math.round(p2.x)}, ${Math.round(p2.y)})`;
      console.log(msg);
      this.add.text(this.cameras.main.worldView.centerX, this.cameras.main.worldView.centerY - 60, msg, {
        fontSize: '14px', color: '#ffffff', backgroundColor: '#000000'
      }).setScrollFactor(0).setDepth(2000).setOrigin(0.5).setAlpha(0.9);
    });

    // X: 충돌체 디버그 표시 토글
    this.xKey.on('down', () => {
      this.mapManager?.toggleCollisionDebug();
    });

    // R: 번개 + 변신 토글
    this.rKey.on('down', () => {
      this.onTransformToggle();
    });
    
    // ESC 키로 메인 메뉴로 돌아가기
    this.input.keyboard!.on('keydown-ESC', () => {
      if (this.dialogueManager.getState().isActive) {
        // 대화 중이면 대화 종료
        this.dialogueManager.endDialogue();
      } else {
        // 게임 상태 저장 후 메인 메뉴로
        this.player.savePosition();
        this.scene.start(SCENES.MAIN_MENU);
      }
    });

    // 디버그 키들
    this.input.keyboard!.on('keydown-F1', () => {
      this.player.debugStats();
    });

    this.input.keyboard!.on('keydown-F2', () => {
      this.npcManager.debugInfo();
    });

    this.input.keyboard!.on('keydown-F3', () => {
      console.log('대화 매니저 상태:', this.dialogueManager.getState());
    });

    this.input.keyboard!.on('keydown-F4', () => {
      // 저장 데이터 초기화 (테스트용)
      SaveManager.clearSave();
      console.log('저장 데이터 초기화됨');
    });

    // 테스트용 스탯 조작
    this.input.keyboard!.on('keydown-F5', () => {
      this.player.addStat('gold', 10);
    });

    this.input.keyboard!.on('keydown-F6', () => {
      this.player.addStat('experience', 5);
    });

    // 하트 디버그: P1 하트 -1
    this.input.keyboard!.on('keydown-F10', () => {
      this.player.addStat('hearts_p1' as any, -1);
      console.log('P1 하트 -1');
    });
    // 하트 디버그: P1 하트 +1
    this.input.keyboard!.on('keydown-F11', () => {
      this.player.addStat('hearts_p1' as any, 1);
      console.log('P1 하트 +1');
    });
    // 하트 디버그: P2 하트 -1/+1 토글
    this.input.keyboard!.on('keydown-F12', () => {
      // 임시: -1
      this.player2.addStat('hearts_p2' as any, -1);
      console.log('P2 하트 -1');
    });

    // 전역 변수 디버그
    this.input.keyboard!.on('keydown-F7', () => {
      GlobalVariableManager.getInstance().debugPrint();
    });

    this.input.keyboard!.on('keydown-F8', () => {
      GlobalVariableManager.getInstance().add('reputation', 5);
      console.log('평판 +5');
    });

    this.input.keyboard!.on('keydown-F9', () => {
      GlobalVariableManager.getInstance().set('story_progress', 'chapter2');
      console.log('스토리 진행도 설정: chapter2');
    });
  }

  private onTransformToggle(): void {
    if (this.isTransitioning || this.dialogueManager.getState().isActive) return;
    const p2 = this.player2?.sprite;
    if (!p2) return;
    this.triggerThunderAt(p2.x, p2.y);
    this.player2.toggleForm();
  }

  private triggerThunderAt(x: number, y: number): void {
    const s = this.add.sprite(x, y, 'thunder', 0);
    s.setOrigin(0.5, 1);
    s.setDepth(1500);
    s.play('thunder-strike');
    s.on(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
      s.destroy();
    });
  }

  private handleSpaceKeyPress(): void {
    const dialogueState = this.dialogueManager.getState();

    if (dialogueState.isActive) {
      if (dialogueState.isTyping) {
        // 타이핑 중이면 즉시 완료
        
        this.dialogueBox.completeTyping();
      } else if (dialogueState.isWaitingForChoice) {
        // 선택지 대기 중이면 무시 (숫자 키나 클릭으로만 선택)
        console.log('선택지를 숫자 키(1-4) 또는 클릭으로 선택하세요');
        return;
      } else {
        // 다음 대화로 진행
        this.dialogueManager.advance();
      }
    } else {
      // 대화 중이 아니면: 1) 포탈 체크 → 2) NPC 상호작용 시도
      if (!this.isTransitioning && this.tryPortalInteraction()) {
        return;
      }
      const nearbyNPC = this.npcManager.getCurrentInteractableNPC();
      if (nearbyNPC) {
        this.startDialogueWithNPC(nearbyNPC);
      }
    }
  }

  private tryPortalInteraction(): boolean {
    const portalManager = this.mapManager.getPortalManager();
    const tileSize = this.mapManager.getTileSize();
    const p1 = new Phaser.Math.Vector2(this.player.sprite.x, this.player.sprite.y);
    const p2 = new Phaser.Math.Vector2(this.player2.sprite.x, this.player2.sprite.y);
    const portal = portalManager.findPortalIfBothInside(p1, p2, tileSize);
    if (!portal) return false;
    this.performPortalTransition(portal);
    return true;
  }

  private performPortalTransition(portal: any): void {
    if (this.isTransitioning) return;
    this.isTransitioning = true;
    const fadeMs = portal.options?.fadeMs ?? 300;

    // 입력 잠금 및 플레이어 정지
    this.haltPlayersAndResetKeys();
    this.input.keyboard?.enabled && (this.input.keyboard.enabled = false);

    // 사전 프리페치: 실패 시 전환 취소 (페이드 전)
    const nextMapId = portal.target.mapId;
    const nextKey = 'map:' + nextMapId;
    fetch(`assets/maps/${nextMapId}/map.json`, { cache: 'no-cache' })
      .then((pre) => {
        if (!pre.ok) throw new Error('map.json not found');

        // 페이드 아웃 후 전환 수행
        this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, async () => {
          this.mapManager.unload();
          const ok = await this.mapManager.load(nextKey);
          if (!ok) {
            console.error('맵 로드 실패, 전환 취소');
            this.cameras.main.fadeIn(fadeMs, 0, 0, 0);
            this.input.keyboard && (this.input.keyboard.enabled = true);
            this.isTransitioning = false;
            return;
          }

          const tileSize = this.mapManager.getTileSize();
          const spawnX = portal.target.spawn.x * tileSize + tileSize / 2;
          const spawnY = portal.target.spawn.y * tileSize + tileSize / 2;
          this.player.sprite.setPosition(spawnX, spawnY);
          this.player2.sprite.setPosition(spawnX + tileSize * 2, spawnY);

          await this.loadNPCsForMap(nextMapId);

          // 새 맵 충돌체에 플레이어 재연결
          this.mapManager.attachPlayer(this.player.sprite);
          this.mapManager.attachPlayer(this.player2.sprite);

          this.cameras.main.startFollow(this.player.sprite);

          this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_IN_COMPLETE, () => {
            this.input.keyboard && (this.input.keyboard.enabled = true);
            this.isTransitioning = false;
          });
          this.cameras.main.fadeIn(fadeMs, 0, 0, 0);
        });
        this.cameras.main.fadeOut(fadeMs, 0, 0, 0);
      })
      .catch((err) => {
        console.error('다음 맵 프리페치 실패, 전환 취소:', err);
        this.input.keyboard && (this.input.keyboard.enabled = true);
        this.isTransitioning = false;
      });
  }

  private createPortalHintUI(): void {
    const width = 340;
    const height = 36;
    const container = this.add.container(this.cameras.main.width / 2, this.cameras.main.height - 180);
    const bg = this.add.rectangle(0, 0, width, height, 0x002233, 0.8).setStrokeStyle(2, 0x00ffff, 0.9);
    const text = this.add.text(0, 0, '두 플레이어가 포탈에 있습니다. 스페이스로 이동', {
      fontSize: '16px',
      color: '#ccffff',
      fontFamily: 'monospace'
    }).setOrigin(0.5);
    container.add([bg, text]);
    container.setScrollFactor(0);
    container.setDepth(2000);
    container.setVisible(false);
    this.portalHintContainer = container;
  }

  private updatePortalHint(): void {
    if (this.isTransitioning || this.dialogueManager.getState().isActive) {
      this.portalHintContainer?.setVisible(false);
      return;
    }
    const portalManager = this.mapManager.getPortalManager();
    const tileSize = this.mapManager.getTileSize();
    const p1 = new Phaser.Math.Vector2(this.player.sprite.x, this.player.sprite.y);
    const p2 = new Phaser.Math.Vector2(this.player2.sprite.x, this.player2.sprite.y);
    const portal = portalManager.findPortalIfBothInside(p1, p2, tileSize);
    this.portalHintContainer?.setVisible(!!portal);
  }

  private createHeartsUI(): void {
    const style = { fontSize: '18px', color: '#ff5a5a', fontFamily: 'monospace' } as Phaser.Types.GameObjects.Text.TextStyle;
    this.heartsTextP1 = this.add.text(12, 10, '', style).setScrollFactor(0).setDepth(3000).setOrigin(0, 0);
    this.heartsTextP2 = this.add.text(12, 34, '', { ...style, color: '#ffa0a0' }).setScrollFactor(0).setDepth(3000).setOrigin(0, 0);
    this.refreshHeartsUI(true);
  }

  private formatHearts(current: number, max: number): string {
    const filled = Math.max(0, Math.min(current, max));
    const empty = Math.max(0, max - filled);
    return `P1: ${'\u2665'.repeat(filled)}${'\u2661'.repeat(empty)}`; // 기본 P1 라벨; P2는 호출부에서 치환
  }

  private refreshHeartsUI(force = false): void {
    const data = SaveManager.loadGame();
    const s = data.player.stats as any;
    const p1StrRaw = this.formatHearts(Number(s.hearts_p1 || 0), Number(s.maxHearts_p1 || 0));
    const p2StrRaw = this.formatHearts(Number(s.hearts_p2 || 0), Number(s.maxHearts_p2 || 0));
    const p1Str = p1StrRaw.replace(/^P1:/, 'P1:');
    const p2Str = p2StrRaw.replace(/^P1:/, 'P2:');
    if (force || p1Str !== this.lastHeartsP1) {
      this.heartsTextP1.setText(p1Str);
      this.lastHeartsP1 = p1Str;
    }
    if (force || p2Str !== this.lastHeartsP2) {
      this.heartsTextP2.setText(p2Str);
      this.lastHeartsP2 = p2Str;
    }
  }

  private async startDialogueWithNPC(npc: any): Promise<void> {
    const success = await this.dialogueManager.startDialogue(npc);
    if (!success) {
      console.error('대화 시작 실패');
    }
  }

  private getCurrentNPCName(): string {
    const currentNPC = this.dialogueManager.getState().currentNPC;
    if (!currentNPC) return 'Unknown';

    // NPC ID에 따른 이름 매핑
    const npcNames: Record<string, string> = {
      'merchant_001': '상인',
      'guard_001': '경비병',
      'villager_001': '마을 주민'
    };

    return npcNames[currentNPC.npcId] || currentNPC.npcId;
  }

  private showWelcomeMessage(): void {
    // 환영 메시지 표시
    const welcomeText = this.add.text(
      GAME_WIDTH / 2,
      100,
      'Potato Gang에 오신 것을 환영합니다!\n\n이동: 방향키\n상호작용: 스페이스 바\n디버그: F1-F9 키\n종료: ESC',
      {
        fontSize: '16px',
        color: '#ffffff',
        fontFamily: 'monospace',
        align: 'center',
        backgroundColor: '#000000',
        padding: { x: 20, y: 10 }
      }
    );
    welcomeText.setOrigin(0.5);
    welcomeText.setDepth(500);
    welcomeText.setAlpha(0.9);

    // 5초 후 메시지 페이드아웃
    this.time.delayedCall(5000, () => {
      this.tweens.add({
        targets: welcomeText,
        alpha: 0,
        duration: 1000,
        onComplete: () => {
          welcomeText.destroy();
        }
      });
    });
  }

  // 모든 움직임을 즉시 멈추고, 입력키 상태를 초기화
  private haltPlayersAndResetKeys(): void {
    // 1) 물리 속도 정지
    if (this.player?.sprite?.body) {
      (this.player.sprite.body as Phaser.Physics.Arcade.Body).stop();
      this.player.sprite.setVelocity(0, 0);
    }
    if (this.player2?.sprite?.body) {
      (this.player2.sprite.body as Phaser.Physics.Arcade.Body).stop();
      this.player2.sprite.setVelocity(0, 0);
    }

    // 2) 키 상태 리셋 (눌린 상태 해제)
    this.resetCursorKeys(this.cursors);
    this.resetCursorKeys(this.keysWASD);
  }

  // CursorKeys 형태(up/down/left/right/space/shift)의 키를 안전하게 reset()
  private resetCursorKeys(keys: Phaser.Types.Input.Keyboard.CursorKeys | undefined): void {
    if (!keys) return;
    keys.up?.reset();
    keys.down?.reset();
    keys.left?.reset();
    keys.right?.reset();
    // CursorKeys 타입에 포함된 나머지도 있으면 함께 리셋
    (keys as any).space?.reset?.();
    (keys as any).shift?.reset?.();
  }


  update(): void {
    // 대화 중이 아닐 때만 플레이어 이동
    if (!this.dialogueManager.getState().isActive) {
      // player1 은 화살표, player2 는 WASD
      this.player.update(this.cursors);
      this.player2.update(this.keysWASD);
    }

    // NPC 매니저 업데이트
    this.npcManager.update();

    // 포탈 힌트 업데이트
    this.updatePortalHint();

    // 하트 UI 주기적 갱신 (약 4회/초)
    this.uiFrameTicker = (this.uiFrameTicker + 1) % 15;
    if (this.uiFrameTicker === 0) {
      this.refreshHeartsUI();
    }
  }



} 