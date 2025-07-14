# 대화 시스템 (Dialogue System)

Potato Gang의 NPC 대화 시스템은 YAML 기반의 확장 가능한 대화 관리 시스템입니다.

## 📋 목차
- [개요](#개요)
- [아키텍처](#아키텍처)
- [대화 데이터 구조](#대화-데이터-구조)
- [시스템 컴포넌트](#시스템-컴포넌트)
- [사용법](#사용법)
- [API 레퍼런스](#api-레퍼런스)

## 개요

대화 시스템은 다음과 같은 핵심 기능을 제공합니다:

- **YAML 기반 대화 데이터**: 손쉬운 편집과 관리
- **다중 선택지**: 플레이어의 선택에 따른 분기
- **조건부 선택지**: 플레이어 스탯에 따른 선택지 표시/숨김
- **액션 시스템**: 선택지에 따른 게임 상태 변경
- **타이핑 효과**: 몰입감 있는 텍스트 표시
- **상태 저장**: 대화 진행 상황 자동 저장

## 아키텍처

```
대화 시스템 구조:
├── DialogueLoader      # YAML 파일 로딩 및 캐싱
├── DialogueManager     # 대화 플로우 제어
├── DialogueBox         # UI 표시 및 상호작용
├── ActionProcessor     # 선택지 액션 처리
└── NPCManager         # NPC 상호작용 관리
```

## 대화 데이터 구조

### YAML 파일 형식

```yaml
# public/assets/dialogues/npc_name.yaml
npc_id: "unique_npc_id"
conversations:
  conversation_id:
    text: "대화 내용"
    choices:
      - text: "선택지 텍스트"
        next: "다음_대화_id"
        action: "add_stat:gold:10"
        condition: "gold>=5"
    next: "자동_다음_대화_id"
    action: "실행할_액션"
```

### 필드 설명

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `npc_id` | string | ✅ | NPC의 고유 식별자 |
| `conversations` | object | ✅ | 대화 목록 |
| `text` | string | ✅ | 표시할 대화 내용 |
| `choices` | array | ❌ | 선택지 목록 |
| `next` | string | ❌ | 다음 대화 ID |
| `action` | string | ❌ | 실행할 액션 |
| `condition` | string | ❌ | 선택지 표시 조건 |

### 조건 문법

#### 네임스페이스 기반 조건 (권장)

```yaml
# 플레이어 스탯 조건
condition: "player.gold >= 100"     # 골드 100 이상
condition: "player.level > 5"       # 레벨 5 초과
condition: "player.health <= 50"    # 체력 50 이하

# 게임 플래그 조건  
condition: "flags.shop_unlocked == true"   # 상점 해제됨
condition: "flags.boss_defeated != true"   # 보스 미처치

# 전역 변수 조건
condition: "global.reputation >= 50"       # 평판 50 이상
condition: "global.story_progress == 'chapter2'"  # 스토리 진행도
condition: "global.difficulty == 'hard'"   # 난이도 설정
```

#### 기존 조건 문법 (하위 호환성)

```yaml
condition: "gold>=10"      # 골드가 10 이상 (player.gold >= 10과 동일)
condition: "level>5"       # 레벨이 5 초과 (player.level > 5와 동일)
condition: "health==100"   # 체력이 100 (player.health == 100과 동일)
condition: "experience!=0" # 경험치가 0이 아님 (player.experience != 0과 동일)
```

#### 지원하는 네임스페이스

- **`player.*`**: 플레이어 스탯 (health, maxHealth, gold, experience, level 등)
- **`flags.*`**: 게임 플래그 (불린 값, 기본값 false)
- **`global.*`**: 전역 변수 (숫자, 문자열, 불린 등 모든 타입)

#### 지원하는 연산자

- `>=` : 이상
- `<=` : 이하  
- `>` : 초과
- `<` : 미만
- `==` : 같음
- `!=` : 다름

#### 지원하는 데이터 타입

- **숫자**: `100`, `-50`, `3.14`
- **불린**: `true`, `false`  
- **문자열**: `'chapter1'`, `"normal"`, `easy`

## 시스템 컴포넌트

### 1. DialogueLoader

YAML 파일을 로드하고 캐싱하는 클래스입니다.

```typescript
// 대화 데이터 로드
const dialogueData = await DialogueLoader.loadDialogue('merchant');

// 특정 대화 가져오기
const conversation = await DialogueLoader.getConversation('merchant', 'introduction');

// 캐시 관리
DialogueLoader.clearCache();
```

### 2. DialogueManager

대화 플로우를 제어하는 핵심 클래스입니다.

```typescript
const dialogueManager = new DialogueManager(scene, player);

// 이벤트 설정
dialogueManager.onDialogueStart = (npc, dialogue) => {
  console.log(`대화 시작: ${npc.npcId}`);
};

// 대화 시작
await dialogueManager.startDialogue(npc);

// 선택지 선택
dialogueManager.selectChoice(0);

// 대화 종료
dialogueManager.endDialogue();
```

### 3. DialogueBox

UI 표시와 사용자 상호작용을 담당합니다.

```typescript
const dialogueBox = new DialogueBox(scene);

// 대화 표시
dialogueBox.showDialogue(conversation, npcName, availableChoices);

// 선택지 선택 이벤트
dialogueBox.onChoiceSelected = (choiceIndex) => {
  dialogueManager.selectChoice(choiceIndex);
};

// 대화창 숨기기
dialogueBox.hide();
```

## 사용법

### 1. 새로운 NPC 대화 추가

1. **YAML 파일 생성**
   ```bash
   # public/assets/dialogues/새로운npc.yaml
   ```

2. **대화 데이터 작성**
   ```yaml
   npc_id: "blacksmith_001"
   conversations:
     introduction:
       text: "안녕하세요! 저는 대장장이입니다."
       choices:
         - text: "무기를 강화하고 싶어요"
           next: "weapon_upgrade"
           condition: "gold>=50"
         - text: "그냥 구경하러 왔어요"
           next: "casual_visit"
   ```

3. **NPC 배치**
   ```typescript
   // GameScene.ts에서
   this.npcManager.addNPC({
     npcId: 'blacksmith_001',
     dialogueId: '새로운npc',
     x: 400,
     y: 300,
     spriteKey: 'blacksmith'
   });
   ```

### 2. 대화 플로우 설계

```yaml
conversations:
  # 시작 대화
  introduction:
    text: "처음 만나는 분이시군요!"
    choices:
      - text: "네, 처음입니다"
        next: "first_meeting"
      - text: "아니요, 전에도 왔었어요"
        next: "returning_visitor"
        
  # 첫 방문자
  first_meeting:
    text: "환영합니다! 작은 선물을 드릴게요."
    action: "add_stat:gold:5;set_flag:first_visit:true"
    next: "goodbye"
    
  # 재방문자  
  returning_visitor:
    text: "어? 제가 기억을 못하나 보네요. 죄송합니다."
    next: "goodbye"
    
  # 작별 인사
  goodbye:
    text: "좋은 하루 되세요!"
    choices: null  # 대화 종료
```

### 3. 복잡한 선택지 구성

```yaml
shop_menu:
  text: "무엇을 도와드릴까요?"
  choices:
    # 조건부 선택지들
    - text: "체력 포션 구매 (10골드)"
      next: "buy_health_potion"
      condition: "gold>=10"
      action: "add_stat:gold:-10;add_item:health_potion:1"
      
    - text: "돈이 부족해요..."
      next: "no_money"
      condition: "gold<10"
      
    - text: "고급 무기 구매 (100골드)"
      next: "buy_weapon"
      condition: "gold>=100&&level>=5"
      
    - text: "나가기"
      next: "goodbye"
```

## API 레퍼런스

### DialogueManager

#### 메서드

| 메서드 | 매개변수 | 반환값 | 설명 |
|--------|----------|--------|------|
| `startDialogue()` | `npc: NPC` | `Promise<boolean>` | 대화 시작 |
| `endDialogue()` | - | `void` | 대화 종료 |
| `advance()` | - | `void` | 다음 대화로 진행 |
| `selectChoice()` | `index: number` | `void` | 선택지 선택 |
| `getState()` | - | `DialogueState` | 현재 상태 반환 |

#### 이벤트

| 이벤트 | 매개변수 | 설명 |
|--------|----------|------|
| `onDialogueStart` | `(npc, dialogue)` | 대화 시작 시 |
| `onDialogueEnd` | `()` | 대화 종료 시 |
| `onConversationChange` | `(conversation, choices)` | 대화 변경 시 |
| `onTypingComplete` | `()` | 타이핑 완료 시 |

### DialogueBox

#### 메서드

| 메서드 | 매개변수 | 반환값 | 설명 |
|--------|----------|--------|------|
| `showDialogue()` | `conversation, npcName, choices` | `void` | 대화 표시 |
| `hide()` | - | `void` | 대화창 숨기기 |
| `completeTyping()` | - | `void` | 타이핑 즉시 완료 |
| `isCurrentlyTyping()` | - | `boolean` | 타이핑 중인지 확인 |

## 🎮 조작법

- **대화 시작**: NPC 근처에서 스페이스바
- **타이핑 스킵**: 스페이스바
- **선택지 선택**: 숫자 키 1-4 또는 마우스 클릭
- **대화 종료**: ESC 키

## 🔧 디버그 기능

- **F3**: 대화 매니저 상태 출력
- **F2**: NPC 매니저 정보 출력

## 📝 팁과 모범 사례

1. **대화 ID 명명 규칙**
   - 명확하고 설명적인 이름 사용
   - 예: `introduction`, `shop_menu`, `quest_start`

2. **조건 사용**
   - 복잡한 조건은 여러 선택지로 분할
   - 조건 없는 기본 선택지 제공

3. **액션 설계**
   - 한 번에 너무 많은 액션 실행 지양
   - 액션 결과를 대화에 반영

4. **대화 분기**
   - 너무 깊은 중첩 피하기
   - 명확한 종료 지점 제공

## 🚀 확장 가능성

- **음성 시스템**: 대화에 음성 파일 추가
- **감정 표현**: NPC 감정 상태에 따른 대화 변화
- **다국어 지원**: 언어별 YAML 파일 관리
- **대화 히스토리**: 이전 대화 내용 기록 및 참조 