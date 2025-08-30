# Data 폴더 가이드

## 📁 폴더 개요
게임의 정적 데이터와 설정 정보를 정의하는 폴더입니다. NPC, 아이템, 스탯 등의 기본 데이터를 중앙에서 관리합니다.

## 📄 파일 구조

### `NPCDefinitions.ts`
**역할**: 게임 내 모든 NPC의 기본 정의를 관리
**핵심 기능**:
- NPC ID와 대화 데이터 매핑
- 스프라이트 키 정의
- NPC 메타데이터 중앙 관리

## 🏪 NPC 정의 구조

### 현재 정의된 NPC들
```typescript
export const NPC_DEFINITIONS: Record<string, NPCDefinition> = {
  merchant_001: { 
    npcId: 'merchant_001', 
    dialogueId: 'merchant', 
    spriteKey: 'merchant' 
  },
  guard_001: { 
    npcId: 'guard_001', 
    dialogueId: 'guard', 
    spriteKey: 'guard' 
  },
  villager_001: { 
    npcId: 'villager_001', 
    dialogueId: 'villager', 
    spriteKey: 'blue' 
  }
};
```

### NPCDefinition 타입
```typescript
interface NPCDefinition {
  npcId: string;      // 고유 NPC 식별자
  dialogueId: string; // 연결된 대화 파일명 (public/assets/dialogues/*.yaml)
  spriteKey: string;  // 사용할 스프라이트 텍스처 키
}
```

## 🔄 데이터 사용 흐름

### 1. NPC 생성 프로세스
```
NPCDefinitions.ts → NPCManager → GameScene → 실제 NPC 엔티티 생성
```

### 2. 대화 연결
```
dialogueId → public/assets/dialogues/{dialogueId}.yaml → DialogueManager
```

### 3. 스프라이트 연결
```
spriteKey → PreloadScene에서 로드된 텍스처 → NPC.sprite
```

## ➕ 새로운 NPC 추가 가이드

### 1. NPCDefinitions.ts 업데이트
```typescript
export const NPC_DEFINITIONS: Record<string, NPCDefinition> = {
  // 기존 NPC들...
  
  new_npc_001: {
    npcId: 'new_npc_001',
    dialogueId: 'new_npc',    // new_npc.yaml 파일 필요
    spriteKey: 'new_npc_sprite'
  }
};
```

### 2. 대화 파일 생성
`public/assets/dialogues/new_npc.yaml` 파일 생성

### 3. 스프라이트 로딩
`PreloadScene.ts`에서 해당 스프라이트 키 로드

### 4. 맵에 배치
해당 맵의 `npcs.json`에 NPC 위치 정보 추가

## 🎯 네이밍 규칙

### NPC ID 패턴
- `{역할}_{번호}` 형태 사용
- 예: `merchant_001`, `guard_002`, `villager_003`

### Dialogue ID 패턴
- NPC의 역할명 사용
- 예: `merchant`, `guard`, `villager`
- 여러 타입이 있을 경우: `merchant_general`, `merchant_weapon`

### Sprite Key 패턴
- NPC 외형 특징 반영
- 예: `merchant`, `guard`, `blue`, `red`

## 🛠️ 확장 가이드

### 고급 NPC 속성 추가
```typescript
interface ExtendedNPCDefinition extends NPCDefinition {
  faction?: string;           // 소속 세력
  shopItems?: string[];       // 판매 아이템 목록
  questIds?: string[];        // 연관 퀘스트
  movePattern?: 'static' | 'patrol' | 'random';
  stats?: {
    health: number;
    level: number;
  };
}
```

### 동적 NPC 로딩
```typescript
// 런타임에 NPC 추가
export function addNPCDefinition(id: string, definition: NPCDefinition) {
  NPC_DEFINITIONS[id] = definition;
}
```

## 🔍 데이터 검증

### 필수 검증 항목
- `npcId`가 고유한지 확인
- `dialogueId`에 해당하는 YAML 파일 존재 여부
- `spriteKey`가 PreloadScene에서 로드되는지 확인

### 디버깅 도구
```typescript
// 누락된 리소스 검사
export function validateNPCDefinitions() {
  // dialogueId와 spriteKey 유효성 검사 로직
}
```

## 🎮 게임 내 활용

### NPCManager에서 사용
```typescript
const npcDef = NPC_DEFINITIONS['merchant_001'];
const npc = new NPC(scene, npcDef, x, y);
```

### 대화 시스템 연동
```typescript
const dialogueId = NPC_DEFINITIONS[npcId].dialogueId;
await dialogueManager.startDialogue(dialogueId);
```

## 💾 데이터 관리 팁

### 조직화 원칙
- 역할별로 그룹핑
- 일관된 네이밍 규칙 준수
- 확장성을 고려한 구조 설계

### 성능 고려사항
- 정적 데이터는 게임 시작 시 한 번만 로드
- 대용량 데이터는 별도 JSON 파일로 분리 고려
- 불필요한 데이터 중복 방지