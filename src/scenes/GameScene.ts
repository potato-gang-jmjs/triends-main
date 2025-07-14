import Phaser from 'phaser';
import { SCENES, GAME_WIDTH, GAME_HEIGHT } from '../utils/constants';
import { Player } from '../entities/Player.js';
import { NPCManager, NPCConfig } from '../systems/NPCManager';
import { DialogueManager } from '../systems/DialogueManager';
import { DialogueBox } from '../ui/DialogueBox';
import { SaveManager } from '../systems/SaveManager';
import { GlobalVariableManager } from '../systems/GlobalVariableManager';

export class GameScene extends Phaser.Scene {
  private player!: Player;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private npcManager!: NPCManager;
  private dialogueManager!: DialogueManager;
  private dialogueBox!: DialogueBox;
  private spaceKey!: Phaser.Input.Keyboard.Key;

  constructor() {
    super({ key: SCENES.GAME });
  }

  create(): void {
    console.log('게임 씬 시작');

    // 배경
    const bg = this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'sky');
    bg.setDisplaySize(GAME_WIDTH, GAME_HEIGHT);
    
    // 플레이어 생성
    this.player = new Player(this, GAME_WIDTH / 2, GAME_HEIGHT / 2);
    
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
    
    // NPC들 배치
    this.setupNPCs();
    
    // 키보드 입력 설정
    this.setupInput();
    
    // 카메라 설정
    this.cameras.main.setBounds(0, 0, GAME_WIDTH, GAME_HEIGHT);
    this.cameras.main.startFollow(this.player.sprite);
    
    // 게임 시작 메시지
    this.showWelcomeMessage();
  }

  private setupDialogueEvents(): void {
    // 대화 시작 시
    this.dialogueManager.onDialogueStart = (npc, dialogue) => {
      console.log(`대화 시작: ${npc.npcId}`);
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

  private setupNPCs(): void {
    // NPC 설정 데이터
    const npcConfigs: NPCConfig[] = [
      {
        npcId: 'merchant_001',
        dialogueId: 'merchant',
        x: 300,
        y: 300,
        spriteKey: 'merchant'
      },
      {
        npcId: 'guard_001',
        dialogueId: 'guard',
        x: 700,
        y: 400,
        spriteKey: 'guard'
      },
      {
        npcId: 'villager_001',
        dialogueId: 'merchant', // 임시로 상인 대화 재사용
        x: 500,
        y: 600,
        spriteKey: 'blue'
      }
    ];

    // NPC들 생성
    npcConfigs.forEach(config => {
      this.npcManager.addNPC(config);
    });

    console.log(`${npcConfigs.length}개의 NPC가 배치되었습니다.`);
  }

  private setupInput(): void {
    // 기본 커서 키
    this.cursors = this.input.keyboard!.createCursorKeys();
    
    // 스페이스 키
    this.spaceKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    
    // 스페이스 키 이벤트
    this.spaceKey.on('down', () => {
      this.handleSpaceKeyPress();
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
      // 대화 중이 아니면 근처 NPC와 대화 시도
      const nearbyNPC = this.npcManager.getCurrentInteractableNPC();
      if (nearbyNPC) {
        this.startDialogueWithNPC(nearbyNPC);
      }
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

  update(): void {
    // 대화 중이 아닐 때만 플레이어 이동
    if (!this.dialogueManager.getState().isActive) {
      this.player.update(this.cursors);
    }
    
    // NPC 매니저 업데이트
    this.npcManager.update();
  }


} 