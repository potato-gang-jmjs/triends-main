import * as yaml from 'js-yaml';
import { DialogueData } from '../types/GameData';

export class DialogueLoader {
  private static dialogueCache: Map<string, DialogueData> = new Map();
  private static loadingPromises: Map<string, Promise<DialogueData>> = new Map();

  // 대화 데이터 로드 (캐싱 지원)
  public static async loadDialogue(npcId: string): Promise<DialogueData | null> {
    // 캐시에서 확인
    if (this.dialogueCache.has(npcId)) {
      return this.dialogueCache.get(npcId)!;
    }

    // 이미 로딩 중인지 확인
    if (this.loadingPromises.has(npcId)) {
      return this.loadingPromises.get(npcId)!;
    }

    // 새로운 로딩 시작
    const loadingPromise = this.loadDialogueFile(npcId);
    this.loadingPromises.set(npcId, loadingPromise);

    try {
      const dialogueData = await loadingPromise;
      this.dialogueCache.set(npcId, dialogueData);
      this.loadingPromises.delete(npcId);
      return dialogueData;
    } catch (error) {
      this.loadingPromises.delete(npcId);
      console.error(`대화 데이터 로드 실패: ${npcId}`, error);
      return null;
    }
  }

  // YAML 파일에서 대화 데이터 로드
  private static async loadDialogueFile(npcId: string): Promise<DialogueData> {
    const response = await fetch(`/assets/dialogues/${npcId}.yaml`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const yamlText = await response.text();
    const dialogueData = yaml.load(yamlText) as DialogueData;

    // 데이터 유효성 검사
    if (!this.validateDialogueData(dialogueData)) {
      throw new Error(`잘못된 대화 데이터 형식: ${npcId}`);
    }

    return dialogueData;
  }

  // 대화 데이터 유효성 검사
  private static validateDialogueData(data: any): data is DialogueData {
    if (!data || typeof data !== 'object') return false;
    if (!data.npc_id || typeof data.npc_id !== 'string') return false;
    if (!data.conversations || typeof data.conversations !== 'object') return false;

    // 각 대화의 기본 구조 검사
    for (const [key, conversation] of Object.entries(data.conversations)) {
      if (!conversation || typeof conversation !== 'object') return false;
      const conv = conversation as any;
      if (!conv.text || typeof conv.text !== 'string') return false;
      
      // choices가 있다면 배열이어야 함
      if (conv.choices && !Array.isArray(conv.choices)) return false;
    }

    return true;
  }

  // 특정 대화 가져오기
  public static async getConversation(npcId: string, conversationId: string) {
    const dialogueData = await this.loadDialogue(npcId);
    if (!dialogueData) return null;

    return dialogueData.conversations[conversationId] || null;
  }

  // 모든 캐시 지우기
  public static clearCache(): void {
    this.dialogueCache.clear();
    this.loadingPromises.clear();
  }

  // 캐시된 대화 목록 가져오기
  public static getCachedDialogues(): string[] {
    return Array.from(this.dialogueCache.keys());
  }
} 