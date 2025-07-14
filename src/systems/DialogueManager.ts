import Phaser from 'phaser';
import { DialogueLoader } from './DialogueLoader';
import { ActionProcessor } from './ActionProcessor';
import { SaveManager } from './SaveManager';
import { ConditionEvaluator } from './ConditionEvaluator';
import { Player } from '../entities/Player';
import { NPC } from '../entities/NPC';
import { DialogueChoice, Conversation, DialogueData } from '../types/GameData';

export interface DialogueState {
  isActive: boolean;
  currentNPC: NPC | null;
  currentDialogue: DialogueData | null;
  currentConversation: Conversation | null;
  conversationId: string | null;
  isWaitingForChoice: boolean;
  isTyping: boolean;
}

export class DialogueManager {
  private actionProcessor: ActionProcessor;
  private conditionEvaluator: ConditionEvaluator;
  private state: DialogueState;

  // 이벤트
  public onDialogueStart?: (npc: NPC, dialogue: DialogueData) => void;
  public onDialogueEnd?: () => void;
  public onConversationChange?: (conversation: Conversation, choices: DialogueChoice[]) => void;
  public onTypingComplete?: () => void;

  constructor(_scene: Phaser.Scene, player: Player) {
    this.actionProcessor = new ActionProcessor(player);
    this.conditionEvaluator = new ConditionEvaluator(player);
    
    this.state = {
      isActive: false,
      currentNPC: null,
      currentDialogue: null,
      currentConversation: null,
      conversationId: null,
      isWaitingForChoice: false,
      isTyping: false
    };
  }

  // 대화 시작
  public async startDialogue(npc: NPC): Promise<boolean> {
    if (this.state.isActive) {
      console.warn('이미 대화가 진행 중입니다');
      return false;
    }

    // 대화 데이터 로드
    const dialogueData = await DialogueLoader.loadDialogue(npc.dialogueId);
    if (!dialogueData) {
      console.error(`대화 데이터 로드 실패: ${npc.dialogueId}`);
      return false;
    }

    // 시작할 대화 결정
    const startConversationId = this.getStartConversation(npc.npcId, dialogueData);
    const conversation = dialogueData.conversations[startConversationId];
    
    if (!conversation) {
      console.error(`시작 대화를 찾을 수 없음: ${startConversationId}`);
      return false;
    }

    // 상태 설정
    this.state.isActive = true;
    this.state.currentNPC = npc;
    this.state.currentDialogue = dialogueData;
    this.state.currentConversation = conversation;
    this.state.conversationId = startConversationId;
    this.state.isWaitingForChoice = false;
    this.state.isTyping = true;

    // 대화 시작 이벤트 발생
    this.onDialogueStart?.(npc, dialogueData);

    // 첫 대화 표시
    this.showConversation(conversation);

    console.log(`대화 시작: ${npc.npcId} - ${startConversationId}`);
    return true;
  }

  // 대화 종료
  public endDialogue(): void {
    if (!this.state.isActive) return;

    // 대화 상태 저장
    if (this.state.currentNPC && this.state.conversationId) {
      this.saveDialogueProgress(this.state.currentNPC.npcId, this.state.conversationId);
    }

    // 상태 초기화
    this.state.isActive = false;
    this.state.currentNPC = null;
    this.state.currentDialogue = null;
    this.state.currentConversation = null;
    this.state.conversationId = null;
    this.state.isWaitingForChoice = false;
    this.state.isTyping = false;

    // 대화 종료 이벤트 발생
    this.onDialogueEnd?.();

    console.log('대화 종료');
  }

  // 다음 대화로 진행 (스페이스 키 입력 시)
  public advance(): void {
    if (!this.state.isActive) return;

    if (this.state.isTyping) {
      // 타이핑 중이면 즉시 완료 (UI에게 요청)
      // DialogueBox가 자체적으로 completeTyping을 호출하도록 함
      return;
    } else if (this.state.isWaitingForChoice) {
      // 선택지 대기 중이면 무시
      console.log('선택지 대기 중... 숫자 키나 클릭으로 선택하세요');
      return;
    } else {
      // 다음 대화로 진행
      this.proceedToNext();
    }
  }

  // 선택지 선택
  public selectChoice(choiceIndex: number): void {
    if (!this.state.isActive || !this.state.isWaitingForChoice) return;
    
    const conversation = this.state.currentConversation;
    if (!conversation?.choices || choiceIndex >= conversation.choices.length) {
      console.error('잘못된 선택지 인덱스:', choiceIndex);
      return;
    }

    const choice = conversation.choices[choiceIndex];
    if (!choice) {
      console.error('선택지를 찾을 수 없음:', choiceIndex);
      return;
    }
    
    // 조건 검사
    if (choice.condition && !this.checkCondition(choice.condition)) {
      console.log('선택지 조건 불만족:', choice.condition);
      return;
    }

    // 액션 실행
    if (choice.action) {
      this.actionProcessor.processAction(choice.action);
    }

    // 다음 대화로 이동
    if (choice.next) {
      this.moveToConversation(choice.next);
    } else {
      this.endDialogue();
    }
  }

  // 현재 상태 가져오기
  public getState(): DialogueState {
    return { ...this.state };
  }

  // 대화 조건 확인
  private checkCondition(condition: string): boolean {
    return this.conditionEvaluator.evaluate(condition);
  }

  // 시작 대화 결정
  private getStartConversation(npcId: string, _dialogueData: DialogueData): string {
    const dialogueState = SaveManager.loadGame().dialogues[npcId];
    
    // 이전에 진행된 대화가 있으면 그에 따라 결정
    if (dialogueState?.currentConversation) {
      return dialogueState.currentConversation;
    }

    // 기본적으로 'introduction' 대화부터 시작
    return 'introduction';
  }

  // 대화 표시
  private showConversation(conversation: Conversation): void {
    this.state.currentConversation = conversation;
    this.state.isTyping = true;
    this.state.isWaitingForChoice = false;

    // 액션이 있으면 실행
    if (conversation.action) {
      this.actionProcessor.processAction(conversation.action);
    }

    // 선택지 준비
    const availableChoices = this.getAvailableChoices(conversation.choices || []);

    // UI에 대화 내용 전달
    this.onConversationChange?.(conversation, availableChoices);
  }

  // 사용 가능한 선택지 필터링
  private getAvailableChoices(choices: DialogueChoice[]): DialogueChoice[] {
    return choices.filter(choice => {
      return !choice.condition || this.checkCondition(choice.condition);
    });
  }

  // 타이핑 완료 (public으로 변경)
  public completeTyping(): void {
    if (!this.state.isTyping) return;
    
    this.state.isTyping = false;
    
    // 선택지가 있으면 선택 대기 상태로
    if (this.state.currentConversation?.choices?.length) {
      const availableChoices = this.getAvailableChoices(this.state.currentConversation.choices);
      if (availableChoices.length > 0) {
        this.state.isWaitingForChoice = true;
        console.log('선택지 대기 상태로 변경');
      } else {
        // 사용 가능한 선택지가 없으면 자동으로 다음으로
        this.proceedToNext();
      }
    }

    this.onTypingComplete?.();
  }

  // 다음 단계로 진행
  private proceedToNext(): void {
    const conversation = this.state.currentConversation;
    if (!conversation) return;

    if (conversation.next) {
      this.moveToConversation(conversation.next);
    } else {
      this.endDialogue();
    }
  }

  // 특정 대화로 이동
  private moveToConversation(conversationId: string): void {
    if (!this.state.currentDialogue) return;

    const conversation = this.state.currentDialogue.conversations[conversationId];
    if (!conversation) {
      console.error('대화를 찾을 수 없음:', conversationId);
      this.endDialogue();
      return;
    }

    this.state.conversationId = conversationId;
    this.showConversation(conversation);
  }

  // 대화 진행 상태 저장
  private saveDialogueProgress(npcId: string, conversationId: string): void {
    const currentState = SaveManager.loadGame().dialogues[npcId] || {
      completedDialogues: [],
      variables: {}
    };

    // 완료된 대화에 추가
    if (!currentState.completedDialogues.includes(conversationId)) {
      currentState.completedDialogues.push(conversationId);
    }

    // 현재 대화 상태 업데이트
    currentState.currentConversation = conversationId;
    currentState.lastInteractionTime = Date.now();

    SaveManager.updateDialogueState(npcId, currentState);
  }
} 