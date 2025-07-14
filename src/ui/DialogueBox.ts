import Phaser from 'phaser';
import { DIALOGUE_CONFIG, GAME_WIDTH, GAME_HEIGHT } from '../utils/constants';
import { Conversation, DialogueChoice } from '../types/GameData';

export class DialogueBox {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private background: Phaser.GameObjects.Rectangle;
  private nameText: Phaser.GameObjects.Text;
  private dialogueText: Phaser.GameObjects.Text;
  private choiceButtons: Phaser.GameObjects.Text[] = [];
  private continueIndicator: Phaser.GameObjects.Text;
  private isVisible: boolean = false;
  private isTyping: boolean = false;
  private typingTween?: Phaser.Tweens.Tween;
  private fullText: string = '';
  private currentCharIndex: number = 0;

  // 이벤트 콜백
  public onChoiceSelected?: (choiceIndex: number) => void;
  public onTypingComplete?: () => void;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.createUI();
    this.setupInputHandlers();
  }

  private createUI(): void {
    // 컨테이너 생성
    this.container = this.scene.add.container(0, 0);
    this.container.setDepth(1000); // 다른 UI보다 위에 표시
    this.container.setVisible(false);

    // 배경 박스
    this.background = this.scene.add.rectangle(
      GAME_WIDTH / 2,
      DIALOGUE_CONFIG.BOX_Y + DIALOGUE_CONFIG.BOX_HEIGHT / 2,
      DIALOGUE_CONFIG.BOX_WIDTH,
      DIALOGUE_CONFIG.BOX_HEIGHT,
      0x000000,
      0.8
    );
    this.background.setStrokeStyle(3, 0xffffff);

    // NPC 이름 텍스트
    this.nameText = this.scene.add.text(
      GAME_WIDTH / 2 - DIALOGUE_CONFIG.BOX_WIDTH / 2 + 20,
      DIALOGUE_CONFIG.BOX_Y + 10,
      '',
      {
        fontSize: '18px',
        color: '#ffff00',
        fontFamily: 'monospace',
        fontStyle: 'bold'
      }
    );

    // 대화 텍스트
    this.dialogueText = this.scene.add.text(
      GAME_WIDTH / 2 - DIALOGUE_CONFIG.BOX_WIDTH / 2 + 20,
      DIALOGUE_CONFIG.BOX_Y + 40,
      '',
      {
        fontSize: '16px',
        color: '#ffffff',
        fontFamily: 'monospace',
        wordWrap: { width: DIALOGUE_CONFIG.BOX_WIDTH - 40 }
      }
    );

    // 계속 진행 인디케이터 (▼)
    this.continueIndicator = this.scene.add.text(
      GAME_WIDTH / 2 + DIALOGUE_CONFIG.BOX_WIDTH / 2 - 30,
      DIALOGUE_CONFIG.BOX_Y + DIALOGUE_CONFIG.BOX_HEIGHT - 30,
      '▼',
      {
        fontSize: '16px',
        color: '#ffffff',
        fontFamily: 'monospace'
      }
    );

    // 컨테이너에 추가
    this.container.add([
      this.background,
      this.nameText,
      this.dialogueText,
      this.continueIndicator
    ]);

    // 깜빡이는 애니메이션
    this.scene.tweens.add({
      targets: this.continueIndicator,
      alpha: 0.3,
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
  }

  private setupInputHandlers(): void {
    // 숫자 키로 선택지 선택
    this.scene.input.keyboard?.on('keydown', (event: KeyboardEvent) => {
      if (!this.isVisible) return;

      const keyCode = event.code;
      
      // 숫자 키 1-4로 선택지 선택
      if (keyCode >= 'Digit1' && keyCode <= 'Digit4') {
        const choiceIndex = parseInt(keyCode.slice(-1)) - 1;
        if (choiceIndex < this.choiceButtons.length) {
          this.selectChoice(choiceIndex);
        }
      }
    });

    // 선택지 버튼 클릭 이벤트
    this.scene.input.on('gameobjectdown', (pointer: Phaser.Input.Pointer, gameObject: Phaser.GameObjects.GameObject) => {
      const choiceIndex = this.choiceButtons.indexOf(gameObject as Phaser.GameObjects.Text);
      if (choiceIndex !== -1) {
        this.selectChoice(choiceIndex);
      }
    });
  }

  // 대화 표시
  public showDialogue(conversation: Conversation, npcName: string, availableChoices: DialogueChoice[]): void {
    this.isVisible = true;
    this.container.setVisible(true);
    
    // NPC 이름 설정
    this.nameText.setText(npcName);
    
    // 이전 선택지 제거
    this.clearChoices();
    
    // 대화 텍스트 타이핑 시작
    this.startTyping(conversation.text);
    
    // 선택지가 있으면 생성 (타이핑 완료 후 표시)
    if (availableChoices.length > 0) {
      this.prepareChoices(availableChoices);
    }
  }

  // 대화창 숨기기
  public hide(): void {
    this.isVisible = false;
    this.container.setVisible(false);
    this.stopTyping();
    this.clearChoices();
  }

  // 타이핑 효과 시작
  private startTyping(text: string): void {
    this.fullText = text;
    this.currentCharIndex = 0;
    this.isTyping = true;
    this.dialogueText.setText('');
    this.continueIndicator.setVisible(false);

    // 타이핑 트윈 생성
    this.typingTween = this.scene.tweens.addCounter({
      from: 0,
      to: text.length,
      duration: text.length * DIALOGUE_CONFIG.TEXT_SPEED,
      ease: 'None',
      onUpdate: (tween) => {
        const progress = Math.floor(tween.getValue());
        this.dialogueText.setText(this.fullText.substring(0, progress));
        this.currentCharIndex = progress;
      },
      onComplete: () => {
        this.completeTyping();
      }
    });
  }

  // 타이핑 즉시 완료
  public completeTyping(): void {
    if (!this.isTyping) return;

    this.stopTyping();
    this.dialogueText.setText(this.fullText);
    this.isTyping = false;
    this.continueIndicator.setVisible(this.choiceButtons.length === 0);
    
    // 선택지 표시
    if (this.choiceButtons.length > 0) {
      this.showChoices();
    }

    // DialogueManager에게 타이핑 완료 알림
    this.onTypingComplete?.();
  }

  // 타이핑 중지
  private stopTyping(): void {
    if (this.typingTween) {
      this.typingTween.destroy();
      this.typingTween = undefined;
    }
  }

  // 선택지 준비
  private prepareChoices(choices: DialogueChoice[]): void {
    choices.forEach((choice, index) => {
      const choiceY = DIALOGUE_CONFIG.BOX_Y + DIALOGUE_CONFIG.BOX_HEIGHT + 10 + 
                     (index * (DIALOGUE_CONFIG.CHOICE_BUTTON_HEIGHT + DIALOGUE_CONFIG.CHOICE_BUTTON_MARGIN));
      
      const choiceButton = this.scene.add.text(
        GAME_WIDTH / 2 - DIALOGUE_CONFIG.BOX_WIDTH / 2 + 20,
        choiceY,
        `${index + 1}. ${choice.text}`,
        {
          fontSize: '14px',
          color: '#ffffff',
          fontFamily: 'monospace',
          backgroundColor: '#333333',
          padding: { x: 10, y: 5 }
        }
      );
      
      choiceButton.setInteractive({ useHandCursor: true });
      choiceButton.setVisible(false); // 타이핑 완료 후 표시
      
      // 호버 효과
      choiceButton.on('pointerover', () => {
        choiceButton.setStyle({ backgroundColor: '#555555' });
      });
      
      choiceButton.on('pointerout', () => {
        choiceButton.setStyle({ backgroundColor: '#333333' });
      });

      this.choiceButtons.push(choiceButton);
      this.container.add(choiceButton);
    });
  }

  // 선택지 표시
  private showChoices(): void {
    this.choiceButtons.forEach((button, index) => {
      button.setVisible(true);
      
      // 애니메이션 효과
      this.scene.tweens.add({
        targets: button,
        alpha: { from: 0, to: 1 },
        y: button.y + 10,
        duration: 200,
        delay: index * 100,
        ease: 'Back.easeOut'
      });
    });
  }

  // 선택지 제거
  private clearChoices(): void {
    this.choiceButtons.forEach(button => {
      this.container.remove(button);
      button.destroy();
    });
    this.choiceButtons = [];
  }

  // 선택지 선택
  private selectChoice(choiceIndex: number): void {
    if (choiceIndex >= 0 && choiceIndex < this.choiceButtons.length) {
      // 선택 효과
      const selectedButton = this.choiceButtons[choiceIndex];
      selectedButton.setStyle({ backgroundColor: '#007700' });
      
      // 잠시 후 콜백 호출
      this.scene.time.delayedCall(200, () => {
        this.onChoiceSelected?.(choiceIndex);
      });
    }
  }

  // 타이핑 중인지 확인
  public isCurrentlyTyping(): boolean {
    return this.isTyping;
  }

  // 선택지 대기 중인지 확인
  public isWaitingForChoice(): boolean {
    return this.choiceButtons.length > 0 && !this.isTyping;
  }

  // 표시 상태 확인
  public isShowing(): boolean {
    return this.isVisible;
  }

  // 정리
  public destroy(): void {
    this.stopTyping();
    this.clearChoices();
    this.container.destroy();
  }
} 