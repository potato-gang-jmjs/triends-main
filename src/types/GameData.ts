// 플레이어 스탯 인터페이스
export interface PlayerStats {
  health: number;
  maxHealth: number;
  gold: number;
  experience: number;
  level: number;
  // 이산형 하트 기반 체력 (1P/2P 분리)
  hearts_p1: number;
  maxHearts_p1: number;
  hearts_p2: number;
  maxHearts_p2: number;
  [key: string]: number; // 확장 가능한 스탯
}

// 인벤토리 아이템
export interface Item {
  id: string;
  name: string;
  quantity: number;
  type: string;
}

// 대화 상태
export interface DialogueState {
  currentConversation?: string;
  completedDialogues: string[];
  variables: Record<string, any>;
  lastInteractionTime?: number;
}

// 게임 전체 데이터 구조
export interface GameData {
  player: {
    stats: PlayerStats;
    position: { x: number; y: number };
    inventory: Item[];
  };
  dialogues: Record<string, DialogueState>;
  gameState: {
    currentScene: string;
    flags: Record<string, boolean>;
    customData: Record<string, any>;
  };
  version: string;
  lastSaved: number;
}

// 대화 데이터 타입
export interface DialogueChoice {
  text: string;
  next?: string;
  action?: string;
  condition?: string;
}

export interface Conversation {
  text: string;
  choices?: DialogueChoice[];
  next?: string;
  action?: string;
}

export interface DialogueData {
  npc_id: string;
  conversations: Record<string, Conversation>;
}

// 조건 평가를 위한 컨텍스트 인터페이스  
export interface ConditionContext {
  player: PlayerStats;
  flags: Record<string, boolean>;
  global: Record<string, any>; // 전역 변수 (숫자, 문자열, 불린 등)
} 