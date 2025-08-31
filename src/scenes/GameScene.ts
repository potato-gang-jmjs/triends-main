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
import { VineExtensionSystem } from '../systems/VineExtensionSystem';
import { WateringCanSystem } from '../systems/WateringCanSystem';
import { ObjectManager } from '../systems/ObjectManager';
import { ActionProcessor } from '../systems/ActionProcessor';
import { MirrorSystem } from '../systems/MirrorSystem';
import { AbilityUnlockSystem } from '../systems/AbilityUnlockSystem';


export class GameScene extends Phaser.Scene {
  private player!: Player;
  private player2!: GinsengPlayer;
  private sunflowerLasers!: Phaser.Physics.Arcade.Group;
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
  private objectManager!: ObjectManager;
  private isTransitioning = false;
  private isOpeningCutscene: boolean = false;
  private openingStep: number = 0;
  private portalHintContainer!: Phaser.GameObjects.Container;
  private vineSystem!: VineExtensionSystem;
  private wateringSystem!: WateringCanSystem;
  private mirrorSystem!: MirrorSystem;
  private abilityUnlockSystem!: AbilityUnlockSystem;
  private actionProcessor!: ActionProcessor;
  private playerInvulUntil = 0; 
  private playerFlickerTween?: Phaser.Tweens.Tween;
  private portalRequiresBothPlayers = false; 

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
    this.load.spritesheet('thunder', 'assets/gimmicks/thunder6.png', {
      frameWidth: 256,
      frameHeight: 384
    });
    this.load.spritesheet('ginseng_sunflower', 'assets/gimmicks/sunflower.png', {
      frameWidth: 64,
      frameHeight: 64
    });
    this.load.spritesheet('ginseng_vine', 'assets/characters/ginseng_vine.png', {
      frameWidth: 64,
      frameHeight: 64
    });
    this.load.spritesheet('player', 'assets/characters/astronaut_walking.png', {
      frameWidth: 64,
      frameHeight: 64
    });
    // 장착 상태(물통 들고 걷기)
    this.load.spritesheet('player_walking_water', 'assets/characters/astronaut_walking_water.png', {
      frameWidth: 64,
      frameHeight: 64
    });
    // 실제 물 분사 중
    this.load.spritesheet('player_watering', 'assets/characters/astronaut_watering.png', {
      frameWidth: 64,
      frameHeight: 64
    });
    this.load.spritesheet('water_entity', 'assets/characters/astronaut_water.png', {
      frameWidth: 64,
      frameHeight: 64
    });
    this.load.spritesheet('player_walking_mirror', 'assets/characters/astronaut_walking_mirror.png', {
      frameWidth: 64,
      frameHeight: 64
    });
    this.load.spritesheet('player_mirroring', 'assets/characters/astronaut_mirroring.png', {
      frameWidth: 64,
      frameHeight: 64
    });

    this.load.spritesheet('sunflower_laser', 'assets/gimmicks/sunflower_laser.png', {
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
    this.mapManager.load('map:main').then(async () => {
      await this.loadNPCsForMap('main');
      // Objects
      const tilesKey = this.mapManager.getTilesTextureKey();
      const tileSize = this.mapManager.getTileSize();
      this.objectManager = new ObjectManager(this, new ActionProcessor(this.player));
      await this.objectManager.load('main', tilesKey, tileSize);
      this.objectManager.attachPlayers([this.player.sprite, this.player2.sprite]);
    });

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

    // 해바라기 공격 애니메이션 등록
    this.anims.create({
      key: 'ginseng-sunflower-down-once',
      frames: this.anims.generateFrameNumbers('ginseng_sunflower', { start: 0, end: 3 }),
      frameRate: 10,
      repeat: 0
    });
    this.anims.create({
      key: 'ginseng-sunflower-left-once',
      frames: this.anims.generateFrameNumbers('ginseng_sunflower', { start: 4, end: 7 }),
      frameRate: 10,
      repeat: 0
    });
    this.anims.create({
      key: 'ginseng-sunflower-right-once',
      frames: this.anims.generateFrameNumbers('ginseng_sunflower', { start: 8, end: 11 }),
      frameRate: 10,
      repeat: 0
    });
    this.anims.create({
      key: 'ginseng-sunflower-up-once',
      frames: this.anims.generateFrameNumbers('ginseng_sunflower', { start: 12, end: 15 }),
      frameRate: 10,
      repeat: 0
    });

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

    // 인삼이 덩굴 애니메이션 등록
    this.anims.create({
      key: 'ginseng-vine-down',
      frames: this.anims.generateFrameNumbers('ginseng_vine', { start: 0, end: 3 }),
      frameRate: 8,
      repeat: -1
    });
    this.anims.create({
      key: 'ginseng-vine-left',
      frames: this.anims.generateFrameNumbers('ginseng_vine', { start: 4, end: 7 }),
      frameRate: 8,
      repeat: -1
    });
    this.anims.create({
      key: 'ginseng-vine-right',
      frames: this.anims.generateFrameNumbers('ginseng_vine', { start: 8, end: 11 }),
      frameRate: 8,
      repeat: -1
    });
    this.anims.create({
      key: 'ginseng-vine-up',
      frames: this.anims.generateFrameNumbers('ginseng_vine', { start: 12, end: 15 }),
      frameRate: 8,
      repeat: -1
    });

    // 물뿌리개 애니메이션 등록
    this.anims.create({
      key: 'player-watering-down',
      frames: this.anims.generateFrameNumbers('player_walking_water', { start: 0, end: 3 }),
      frameRate: 8,
      repeat: -1
    });
    this.anims.create({
      key: 'player-watering-left',
      frames: this.anims.generateFrameNumbers('player_walking_water', { start: 4, end: 7 }),
      frameRate: 8,
      repeat: -1
    });
    this.anims.create({
      key: 'player-watering-right',
      frames: this.anims.generateFrameNumbers('player_walking_water', { start: 8, end: 11 }),
      frameRate: 8,
      repeat: -1
    });
    this.anims.create({
      key: 'player-watering-up',
      frames: this.anims.generateFrameNumbers('player_walking_water', { start: 12, end: 15 }),
      frameRate: 8,
      repeat: -1
    });

    // 물뿌리는 중(Active) 애니메이션 등록
    this.anims.create({
      key: 'player-watering-active-down',
      frames: this.anims.generateFrameNumbers('player_watering', { start: 0, end: 3 }),
      frameRate: 8,
      repeat: -1
    });
    this.anims.create({
      key: 'player-watering-active-left',
      frames: this.anims.generateFrameNumbers('player_watering', { start: 4, end: 7 }),
      frameRate: 8,
      repeat: -1
    });
    this.anims.create({
      key: 'player-watering-active-right',
      frames: this.anims.generateFrameNumbers('player_watering', { start: 8, end: 11 }),
      frameRate: 8,
      repeat: -1
    });
    this.anims.create({
      key: 'player-watering-active-up',
      frames: this.anims.generateFrameNumbers('player_watering', { start: 12, end: 15 }),
      frameRate: 8,
      repeat: -1
    });

    // 물 스프레이 애니메이션 등록 (각 방향은 시트의 다른 행 사용)
    if (this.textures.exists('water_entity')) {
      this.anims.create({ key: 'water-spray', frames: this.anims.generateFrameNumbers('water_entity', { start: 0, end: 3 }), frameRate: 12, repeat: -1 });
      this.anims.create({ key: 'water-spray-down',  frames: this.anims.generateFrameNumbers('water_entity', { start: 0,  end: 3  }), frameRate: 12, repeat: -1 });
      this.anims.create({ key: 'water-spray-left',  frames: this.anims.generateFrameNumbers('water_entity', { start: 4,  end: 7  }), frameRate: 12, repeat: -1 });
      this.anims.create({ key: 'water-spray-right', frames: this.anims.generateFrameNumbers('water_entity', { start: 8,  end: 11 }), frameRate: 12, repeat: -1 });
      this.anims.create({ key: 'water-spray-up',    frames: this.anims.generateFrameNumbers('water_entity', { start: 12, end: 15 }), frameRate: 12, repeat: -1 });
    } else {
      console.warn('water_entity 텍스처가 로드되지 않아 물 스프레이 애니메이션을 등록할 수 없습니다.');
    }

    // 거울 들기 상태 걷기 (64x64, 4프레임)
    this.anims.create({
      key: 'player-mirror-walk-down',
      frames: this.anims.generateFrameNumbers('player_walking_mirror', { start: 0, end: 3 }),
      frameRate: 8,
      repeat: -1
    });
    this.anims.create({
      key: 'player-mirror-walk-left',
      frames: this.anims.generateFrameNumbers('player_walking_mirror', { start: 4, end: 7 }),
      frameRate: 8,
      repeat: -1
    });
    this.anims.create({
      key: 'player-mirror-walk-right',
      frames: this.anims.generateFrameNumbers('player_walking_mirror', { start: 8, end: 11 }),
      frameRate: 8,
      repeat: -1
    });
    this.anims.create({
      key: 'player-mirror-walk-up',
      frames: this.anims.generateFrameNumbers('player_walking_mirror', { start: 12, end: 15 }),
      frameRate: 8,
      repeat: -1
    });

    const tileSize = this.mapManager.getTileSize();
    // 플레이어 생성
    // Player1 생성
    this.player = new Player(this, tileSize * 50, tileSize * 24);

    // Player2 생성
    this.player2 = new GinsengPlayer(this, GAME_WIDTH / 2 + 128, GAME_HEIGHT / 2);
    // 오프닝용: 처음에는 화면 밖 + 투명 (등장 演出)
    this.player2.sprite
      .setAlpha(0)
      .setPosition(this.player.sprite.x + 400, this.player.sprite.y);

    // 레이저 그룹 생성
    this.sunflowerLasers = this.physics.add.group({
      classType: Phaser.Physics.Arcade.Sprite,
      maxSize: 100,
      runChildUpdate: false
    });

    // 해바라기 공격-발사 이벤트 연결 (GinsengPlayer.ts에서 emit)
    this.player2.sprite.on('sunflower-shoot', (e: { x: number; y: number; dir: 'left'|'right'|'up'|'down' }) => {
      this.spawnSunflowerLaser(e.x, e.y, e.dir);
    });

    // P1 mirroring 중 레이저 분기
    this.physics.add.overlap(this.player.sprite, this.sunflowerLasers,
      this.handleLaserVsMirror as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback, undefined, this);

    // 키 입력 설정은 setupInput()에서 일괄 처리

    // NPC 매니저 생성
    this.npcManager = new NPCManager(this, this.player);
    
    // 대화 매니저 생성
    this.dialogueManager = new DialogueManager(this, this.player);
    
    // 대화 UI 생성
    this.dialogueBox = new DialogueBox(this);
    
    // 전역 변수 매니저 초기화
    GlobalVariableManager.getInstance().initializeDefaults();
    
    // 인삼이 특수능력 시스템 (P1 스프라이트 참조 전달)
    this.vineSystem = new VineExtensionSystem(this, this.player2.sprite, this.player.sprite, this.player2);
    
    // 물뿌리개 시스템 (P1 전용)
    this.wateringSystem = new WateringCanSystem(this, this.player, this.player2);
    
    // 거울 시스템 생성 (P1 전용)
    this.mirrorSystem = new MirrorSystem(this, this.player);

    // 능력 해금 시스템 생성
    this.abilityUnlockSystem = new AbilityUnlockSystem(this);
    
    // ActionProcessor 생성 및 능력 시스템 연결
    this.actionProcessor = new ActionProcessor(this.player, this.abilityUnlockSystem);
    
    // DialogueManager에 ActionProcessor 연결
    this.dialogueManager.setActionProcessor(this.actionProcessor);

    // 대화 시스템 이벤트 연결
    this.setupDialogueEvents();
    
    // 능력 해금 이벤트 연결
    this.setupAbilityEvents();
    
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

    // 오프닝 컷신 시작
    this.startOpeningCutscene();
  }

    // === Opening Cutscene ===
  private startOpeningCutscene(): void {
    this.isOpeningCutscene = true;
    this.haltPlayersAndResetKeys();

    const fadeMs = 600;
    // 처음 화면 페이드 인 후 독백 시작
    this.cameras.main.fadeIn(fadeMs, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_IN_COMPLETE, () => {
      this.openingStep = 0;

      // 0단계: 우주인 독백
      this.showOpeningLine('우주인', '여긴 어디지,,,? 난 뭐하다 여기 있더라,,,');

      // 스페이스로 진행
      this.input.keyboard!.on('keydown-SPACE', this.advanceOpeningCutscene, this);
    });
  }

  private advanceOpeningCutscene = (): void => {
    if (!this.isOpeningCutscene) return;

    this.openingStep++;

    switch (this.openingStep) {
      case 1: {
        // 인삼이 등장 演出 후 첫 멘트
        const targetX = this.player.sprite.x + 96;
        const targetY = this.player.sprite.y;

        this.tweens.add({
          targets: this.player2.sprite,
          alpha: 1,
          x: targetX,
          y: targetY,
          duration: 500,
          onComplete: () => {
            this.showOpeningLine('인삼', '저기...');
          }
        });
        break;
      }
      case 2:
        this.showOpeningLine('우주인', '우왁!! 식물이 말을 하잖아??');
        break;
      case 3:
        this.showOpeningLine('인삼', '지금 그게 중요해?!?! 너 갑자기 하늘에서 떨어졌다고.');
        break;
      case 4:
        this.showOpeningLine('우주인', '읭?');
        break;
      case 5:
        this.showOpeningLine('인삼', '읭 이러네 너 아무것도 기억 못해??');
        break;
      case 6:
        this.showOpeningLine('우주인', '으,, 그러게 뭐지,,?');
        break;
      case 7:
        this.showOpeningLine('인삼', '일단 세계수한테 가보자! 그분이 뭐든 이뤄주실 거야.');
        break;
      case 8:
        this.showOpeningLine('우주인', '(일단 따라가볼까,,,?)');
        break;
      default:
        this.endOpeningCutscene();
        break;
    }
  };

  private showOpeningLine(name: string, text: string): void {
    // DialogueBox를 직접 사용해서 문장만 표시 (선택지 없음)
    this.dialogueBox.showDialogue({ text } as any, name, []);
  }

  private endOpeningCutscene(): void {
    this.dialogueBox.hide();
    this.isOpeningCutscene = false;
    // 스페이스 진행 핸들러 해제
    this.input.keyboard!.off('keydown-SPACE', this.advanceOpeningCutscene as any, this);
  }
  // === /Opening Cutscene ===

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

    // === 대화 기반 맵 전환(map_travel) 이벤트 ===
    this.events.on('map_travel', (payload: { mapId: string; spawn: { x: number; y: number }; fadeMs?: number }) => {
      const { mapId, spawn, fadeMs } = payload || ({} as any);
      if (!mapId || !spawn) return;
      this.performDirectMapTransition(mapId, spawn, fadeMs);
    });

    // === 텔레포트 이벤트 ===
    this.events.on('teleport', (payload: { mapId: string; x: number; y: number }) => {
      const { mapId, x, y } = payload;
      if (!mapId || x === undefined || y === undefined) return;
      // 타일 좌표로 변환 (픽셀 좌표를 64로 나누기)
      const tileX = Math.floor(x / 64);
      const tileY = Math.floor(y / 64);
      this.performDirectMapTransition(mapId, { x: tileX, y: tileY }, 500);
    });
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
          const spriteKey  = spawn.overrides?.spriteKey  ?? def.spriteKey;
          const frame      = spawn.overrides?.frame      ?? def.frame;
          return {
            npcId: def.npcId,
            dialogueId,
            spriteKey,
            frame,
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
      this.portalRequiresBothPlayers = !this.portalRequiresBothPlayers;
      console.log(`포털 모드 변경: ${this.portalRequiresBothPlayers ? '두 플레이어 모두 필요' : '한 플레이어만 필요'}`);
    });
  }

  private onTransformToggle(): void {
    if (this.isTransitioning || this.dialogueManager.getState().isActive) return;
    const p2 = this.player2?.sprite;
    if (!p2) return;

    // R 누른 순간부터 이동 잠금
    this.player2.lockMovement();

    // 이번 토글 이후 형태가 무엇인지 미리 계산
    const willBecomeSunflower = !this.player2.isSunflowerForm();

    // 번개 이펙트: 복귀(해바라기→인삼) 시에만 끝날 때 잠금 해제
    this.triggerThunderAt(p2.x, p2.y, () => {
      if (!willBecomeSunflower) {
        // 인삼으로 돌아오는 경우: 번개 애니메이션이 끝난 시점에만 해제
        this.player2.unlockMovement();
      }
    });

    // 형태 전환은 살짝 지연(기존 로직 유지)
    this.time.delayedCall(350, () => {
      this.player2?.toggleForm();
      // 해바라기로 변신한 경우는 계속 잠금 유지 (다음 복귀 때까지)
    });
  }

  private triggerThunderAt(x: number, y: number, onComplete?: () => void): void {

    const s = this.add.sprite(x, y, 'thunder', 0);
    s.setOrigin(0.5, 1);
    s.setDepth(1500);
    s.play('thunder-strike');

    s.on(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
      s.destroy();
      if (onComplete) onComplete();
    });
  }

  private spawnSunflowerLaser(
    x: number,
    y: number,
    dir: 'left'|'right'|'up'|'down',
    gen: number = 0            // ← 분기 세대(원탄=0, 분기탄=1)
  ): Phaser.Physics.Arcade.Sprite | null {
    const speed = 700;

    // 방향별 스폰 오프셋(픽셀) — 필요시 조정
    const OFFSET: Record<'left'|'right'|'up'|'down', {dx:number; dy:number}> = {
      left:  { dx:  0,  dy: -32 },
      right: { dx:  0,  dy: -32 },
      up:    { dx:  0,  dy: -32 },
      down:  { dx:  0,  dy: -32 }
    };
    const sx = x + OFFSET[dir].dx;
    const sy = y + OFFSET[dir].dy;

    // 풀에서 탄알 하나 가져오기
    const laser = this.sunflowerLasers.get(sx, sy, 'sunflower_laser') as Phaser.Physics.Arcade.Sprite;
    if (!laser) return null;

    laser.setActive(true).setVisible(true);
    this.physics.world.enable(laser);

    // 단일 프레임(세로 스트립): down=0, left=1, right=2, up=3
    const FRAME_BY_DIR: Record<'left'|'right'|'up'|'down', number> = {
      down: 0, left: 1, right: 2, up: 3
    };
    laser.setFrame(FRAME_BY_DIR[dir]);

    // 물리/히트박스 — 64x64 시트지만 맞게 줄여서 판정
    const body = laser.body as Phaser.Physics.Arcade.Body;
    body.setAllowGravity(false);

    const HIT_W = 16;
    const HIT_H = 16;
    body.setSize(HIT_W, HIT_H);
    body.setOffset((64 - HIT_W) / 2, (64 - HIT_H) / 2);

    // 방향/속도
    if (dir === 'left')      body.setVelocity(-speed, 0);
    else if (dir === 'right')body.setVelocity(speed, 0);
    else if (dir === 'up')   body.setVelocity(0, -speed);
    else                     body.setVelocity(0,  speed);

    // 메타데이터(분기/방향)
    laser.setData('dir', dir);
    laser.setData('gen', gen); // 0=원탄, 1=분기탄

    // 시각
    laser.setAngle(0);
    laser.setDepth(1200);
    laser.setOrigin(0.5, 0.5);

    // 수명
    this.time.delayedCall(800, () => {
      if (laser.active) laser.destroy();
    });

    return laser;
  }

  /** 분기탄 전용 생성: 오프셋 무시, 현재 좌표 그대로 사용 */
  private spawnSplitLaser(
    x: number,
    y: number,
    dir: 'left'|'right'|'up'|'down'
  ): Phaser.Physics.Arcade.Sprite | null {
    const speed = 700;

    const laser = this.sunflowerLasers.get(x, y, 'sunflower_laser') as Phaser.Physics.Arcade.Sprite;
    if (!laser) return null;

    laser.setActive(true).setVisible(true);
    this.physics.world.enable(laser);

    const FRAME_BY_DIR: Record<'left'|'right'|'up'|'down', number> = {
      down: 0, left: 1, right: 2, up: 3
    };
    laser.setFrame(FRAME_BY_DIR[dir]);

    const body = laser.body as Phaser.Physics.Arcade.Body;
    body.setAllowGravity(false);
    body.setSize(16, 16);
    body.setOffset((64 - 16) / 2, (64 - 16) / 2);

    if (dir === 'left') body.setVelocity(-speed, 0);
    else if (dir === 'right') body.setVelocity(speed, 0);
    else if (dir === 'up') body.setVelocity(0, -speed);
    else body.setVelocity(0, speed);

    laser.setData('dir', dir);
    laser.setData('gen', 1); // 항상 분기탄

    laser.setDepth(1200);
    laser.setOrigin(0.5, 0.5);

    this.time.delayedCall(800, () => {
      if (laser.active) laser.destroy();
    });

    return laser;
  }


  /** 입력 방향의 정반대 반환 */
  private oppositeDir(dir: 'left'|'right'|'up'|'down'): 'left'|'right'|'up'|'down' {
    if (dir === 'left') return 'right';
    if (dir === 'right') return 'left';
    if (dir === 'up') return 'down';
    return 'up';
  }

  /** 주어진 방향과 수직(±90°)인 두 방향 반환 */
  private perpendicularDirs(dir: 'left'|'right'|'up'|'down'): ['left'|'right'|'up'|'down','left'|'right'|'up'|'down'] {
    return (dir === 'left' || dir === 'right') ? ['up','down'] : ['left','right'];
  }

  /** 점멸(피격 무적) 시작: durationMs 동안 알파를 빠르게 깜빡이기 */
  private startPlayerFlicker(durationMs: number): void {
    // 기존 트윈 정리
    this.playerFlickerTween?.stop();
    this.player.sprite.setAlpha(1);

    // 짧게 깜빡이는 트윈 등록
    this.playerFlickerTween = this.tweens.add({
      targets: this.player.sprite,
      alpha: { from: 1, to: 0.2 },
      duration: 80,
      yoyo: true,
      repeat: Math.ceil(durationMs / 80) * 2, // 충분히 커버되도록
    });

    // duration 후 강제 종료(알파 원복)
    this.time.delayedCall(durationMs, () => this.stopPlayerFlicker());
  }

  /** 점멸 종료(알파/트윈 원복) */
  private stopPlayerFlicker(): void {
    if (this.playerFlickerTween) {
      this.playerFlickerTween.stop();
      this.playerFlickerTween = undefined;
    }
    this.player.sprite.setAlpha(1);
  }


  /** ArcadePhysicsCallback — 레이저 ↔ 플레이어 겹침 시 분기 처리 */
  private handleLaserVsMirror: Phaser.Types.Physics.Arcade.ArcadePhysicsCallback = (obj1, obj2) => {
    // 안전하게 Sprite로 변환
    const asSprite = (o: any): Phaser.GameObjects.Sprite | null => {
      if (!o) return null;
      if (o instanceof Phaser.GameObjects.Sprite) return o;
      if (o.gameObject instanceof Phaser.GameObjects.Sprite) return o.gameObject;
      return null;
    };

    const s1 = asSprite(obj1);
    const s2 = asSprite(obj2);
    if (!s1 || !s2) return;

    // 어느 쪽이 레이저인지 식별
    const isLaser = (s: Phaser.GameObjects.Sprite) => s.texture?.key === 'sunflower_laser';
    const laser = isLaser(s1) ? s1 : (isLaser(s2) ? s2 : null);
    if (!laser || !laser.active) return;

    // 🔒 “mirroring 포즈 중”일 때만 활성 — Player.ts의 포즈는 텍스처/애니 키로 확실히 구분됨
    const curTexKey = this.player.sprite.texture?.key ?? '';
    const curAnimKey = this.player.sprite.anims?.currentAnim?.key ?? '';
    const isMirroringNow =
      curTexKey === 'player_mirroring' || curAnimKey.startsWith('player-mirroring-');
    if (!isMirroringNow) {
      // 🔹 미러링 중이 아니면: 플레이어 피격 + 탄 제거 + (무적 중이면 데미지 생략)
      // 탄은 항상 소거
      if (laser.active) laser.destroy();

      // 무적 중이면 데미지/점멸 스킵
      if (this.time.now < this.playerInvulUntil) return;

      // 데미지 적용 (체력 -1) — 필요 시 수치 변경 가능
      this.player.addStat('hearts_p1', -1);

      // 무적 시간 1000ms (원하면 조정 가능)
      const INVUL_MS = 1000;
      this.playerInvulUntil = this.time.now + INVUL_MS;

      // 점멸 시작
      this.startPlayerFlicker(INVUL_MS);

      return; // 이 케이스에서는 분기(90° 갈래) 없음
    }

    // 무한 분기 방지: 분기탄(gen>=1)은 더 이상 분기하지 않음
    const gen = (laser.getData('gen') as number) ?? 0;
    if (gen >= 1) return;

    // 레이저 진행 방향(데이터 우선, 없으면 속도 기반)
    let ldir = (laser.getData('dir') as 'left'|'right'|'up'|'down' | undefined);
    if (!ldir) {
      const body = (laser as any).body as Phaser.Physics.Arcade.Body | undefined;
      const vx = body?.velocity?.x ?? 0;
      const vy = body?.velocity?.y ?? 0;
      ldir = Math.abs(vx) >= Math.abs(vy) ? (vx >= 0 ? 'right' : 'left') : (vy >= 0 ? 'down' : 'up');
    }

    // “방향에 맞게”: 플레이어가 레이저 정면을 바라보고 있어야 함 (facing === opposite(laserDir))
    const facing = this.player.getLastDirection();
    if (facing !== this.oppositeDir(ldir!)) return;

    // 원탄 제거 → ±90° 두 갈래 분기탄 생성(gen=1)
    const lx = laser.x, ly = laser.y;
    laser.destroy();

    const [d1, d2] = this.perpendicularDirs(ldir!);
    this.spawnSplitLaser(lx, ly, d1);
    this.spawnSplitLaser(lx, ly, d2);
  };



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
    
    // 포털 모드에 따라 다른 함수 사용
    const portal = this.portalRequiresBothPlayers 
      ? portalManager.findPortalIfBothInside(p1, p2, tileSize)
      : portalManager.findPortalIfAnyInside(p1, p2, tileSize);
    
    // 해금 플래그 매핑 (확장 가능)
    const portalUnlockFlags: Record<string, string> = {
      to_forest_01: 'portals_unlocked_lower',
      to_water_village_01: 'portals_unlocked_upper',
    };

    // 발견된 포털이 있으면 해금 여부 확인
    if (portal) {
      const requiredFlag = portalUnlockFlags[portal.id];
      if (requiredFlag && !SaveManager.getFlag(requiredFlag)) {
        // 잠겨 있으면 무시
        return false;
      }
      this.performPortalTransition(portal);
      return true;
    } else {
      return false;
    }
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
          // save object states for current map
          this.objectManager?.saveState();
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

          // reload objects for next map
          const tilesKey2 = this.mapManager.getTilesTextureKey();
          const tileSize2 = this.mapManager.getTileSize();
          this.objectManager?.unload();
          this.objectManager = new ObjectManager(this, new ActionProcessor(this.player));
          await this.objectManager.load(nextMapId, tilesKey2, tileSize2);
          this.objectManager.attachPlayers([this.player.sprite, this.player2.sprite]);

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

  private performDirectMapTransition(nextMapId: string, spawnTile: { x: number; y: number }, fadeMs: number = 300): void {
    if (this.isTransitioning) return;
    this.isTransitioning = true;

    // 입력 잠금 및 플레이어 정지
    this.haltPlayersAndResetKeys();
    this.input.keyboard?.enabled && (this.input.keyboard.enabled = false);

    // 사전 프리페치
    const nextKey = 'map:' + nextMapId;
    fetch(`assets/maps/${nextMapId}/map.json`, { cache: 'no-cache' })
      .then((pre) => {
        if (!pre.ok) throw new Error('map.json not found');

        this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, async () => {
          // 현재 맵 상태 저장/언로드
          this.objectManager?.saveState();
          this.mapManager.unload();
          const ok = await this.mapManager.load(nextKey);
          if (!ok) {
            console.error('맵 로드 실패, 전환 취소');
            this.cameras.main.fadeIn(fadeMs, 0, 0, 0);
            this.input.keyboard && (this.input.keyboard.enabled = true);
            this.isTransitioning = false;
            return;
          }

          // 스폰 배치 (타일좌표 → 픽셀중심)
          const tileSize = this.mapManager.getTileSize();
          const spawnX = spawnTile.x * tileSize + tileSize / 2;
          const spawnY = spawnTile.y * tileSize + tileSize / 2;
          this.player.sprite.setPosition(spawnX, spawnY);
          this.player2.sprite.setPosition(spawnX + tileSize * 2, spawnY);

          // 새 맵의 NPC/오브젝트 재로딩
          await this.loadNPCsForMap(nextMapId);
          this.mapManager.attachPlayer(this.player.sprite);
          this.mapManager.attachPlayer(this.player2.sprite);

          const tilesKey2 = this.mapManager.getTilesTextureKey();
          const tileSize2 = this.mapManager.getTileSize();
          this.objectManager?.unload();
          this.objectManager = new ObjectManager(this, new ActionProcessor(this.player));
          await this.objectManager.load(nextMapId, tilesKey2, tileSize2);
          this.objectManager.attachPlayers([this.player.sprite, this.player2.sprite]);

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
    
    // 포털 모드에 따라 다른 함수 사용
    const portal = this.portalRequiresBothPlayers 
      ? portalManager.findPortalIfBothInside(p1, p2, tileSize)
      : portalManager.findPortalIfAnyInside(p1, p2, tileSize);
    
    // 해금 플래그 매핑 (확장 가능)
    const portalUnlockFlags: Record<string, string> = {
      to_forest_01: 'portals_unlocked_lower',
      to_water_village_01: 'portals_unlocked_upper',
    };

    // 잠금이면 힌트 비표시
    if (portal) {
      const requiredFlag = portalUnlockFlags[portal.id];
      const unlocked = requiredFlag ? SaveManager.getFlag(requiredFlag) : true;
      this.portalHintContainer?.setVisible(!!unlocked);
    } else {
      this.portalHintContainer?.setVisible(false);
    }
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
    // 대화/컷신 중이 아닐 때만 플레이어 이동
    if (!this.isOpeningCutscene && !this.dialogueManager.getState().isActive) {
      // player1 은 화살표, player2 는 WASD
      if ((this.vineSystem as any)?.isP1MovementLocked?.()) {
        this.player.haltMovementAndIdle();
      } else {
        this.player.update(this.cursors);
      }
      // P 홀드 시 P2 이동 잠금
      if (this.vineSystem?.shouldLockOwnerMovement()) {
        this.player2.haltMovementAndIdle();
      } else {
        this.player2.update(this.keysWASD);
      }
    }

    // NPC 매니저 업데이트
    this.npcManager.update();

    // 포탈 힌트 업데이트
    this.updatePortalHint();

    // 물 근처 여부 업데이트 (P1, P2 기준)
    const gvm = GlobalVariableManager.getInstance();
    const nearP2 = this.mapManager.isPointAdjacentToWater(this.player2.sprite.x, this.player2.sprite.y);
    const nearP1 = this.mapManager.isPointAdjacentToWater(this.player.sprite.x, this.player.sprite.y);
    
    // 디버그: 플레이어 위치와 물 감지 상태 로깅
    if (nearP1 !== gvm.get('isP1NearWater')) {
    }
    if (nearP2 !== gvm.get('isNearWater')) {
    }
    
    if (gvm.get('isNearWater') !== nearP2) {
      gvm.set('isNearWater', nearP2);
    }
    
    // 1P 물 타일 근처 여부 별도 관리
    if (gvm.get('isP1NearWater') !== nearP1) {
      gvm.set('isP1NearWater', nearP1);
    }

    // 덩굴 시스템 업데이트
    const delta = this.game.loop.delta;
    this.vineSystem.update(delta);

    // 물뿌리개 시스템 업데이트
    this.wateringSystem.update(delta);

    // 거울 시스템 업데이트
    this.mirrorSystem.update(delta);

    // 오브젝트 업데이트
    this.objectManager?.update(this.time.now, this.game.loop.delta);

    // 하트 UI 주기적 갱신 (약 4회/초)
    this.uiFrameTicker = (this.uiFrameTicker + 1) % 15;
    if (this.uiFrameTicker === 0) {
      this.refreshHeartsUI();
    }
  }
  
  private setupAbilityEvents(): void {
    // 능력 해금 이벤트 처리
    this.events.on('unlock_ability', (abilityType: string) => {
      console.log(`능력 해금: ${abilityType}`);
      
      if (abilityType === 'watering_can') {
        // 물뿌리개 능력 해금
        const gvm = GlobalVariableManager.getInstance();
        gvm.set('ability_watering_can_unlocked', true);
        
      } else if (abilityType === 'vine_extension') {
        // 덩굴 확장 능력 해금
        const gvm = GlobalVariableManager.getInstance();
        gvm.set('ability_vine_extension_unlocked', true);
        
        console.log('2P 덩굴 확장 능력이 해금되었습니다!');
      }
    });
  }



} 