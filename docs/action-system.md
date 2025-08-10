# 액션 시스템 (Action System)

Potato Gang의 액션 시스템은 대화 선택지와 게임 이벤트를 통해 게임 상태를 변경하는 강력한 시스템입니다.

## 📋 목차
- [개요](#개요)
- [액션 문법](#액션-문법)
- [액션 타입](#액션-타입)
- [시스템 구조](#시스템-구조)
- [사용법](#사용법)
- [확장 방법](#확장-방법)
- [API 레퍼런스](#api-레퍼런스)

## 개요

액션 시스템의 핵심 기능:

- **문자열 기반**: 간단한 문자열로 복잡한 동작 정의
- **다중 액션**: 하나의 선택지에서 여러 액션 동시 실행
- **타입 안전성**: 각 액션 타입별 검증 시스템
- **확장성**: 새로운 액션 타입 쉽게 추가
- **디버깅**: 액션 실행 과정 로깅

## 액션 문법

### 기본 문법

```
액션타입:매개변수1:매개변수2:...
```

### 다중 액션

```
액션1;액션2;액션3
```

### 예시

```yaml
# 단일 액션
action: "add_stat:gold:50"

# 다중 액션
action: "add_stat:gold:-10;add_item:health_potion:1;set_flag:purchased_potion:true"

# 복잡한 액션
action: "add_stat:gold:-100;add_stat:experience:50;trigger_event:level_up"
```

## 액션 타입

### 1. 스탯 조작 액션

#### `add_stat:스탯명:값`
지정된 스탯에 값을 추가합니다.

```yaml
action: "add_stat:gold:50"        # 골드 +50
action: "add_stat:health:-20"     # 체력 -20
action: "add_stat:experience:10"  # 경험치 +10
# 하트(이산형) — 1P/2P 각각 조작
action: "add_stat:hearts_p1:-1"   # 1P 하트 -1
action: "add_stat:hearts_p2:1"    # 2P 하트 +1
```

#### `set_stat:스탯명:값`
지정된 스탯을 특정 값으로 설정합니다.

```yaml
action: "set_stat:health:100"     # 체력을 100으로 설정
action: "set_stat:level:5"        # 레벨을 5로 설정
action: "set_stat:maxHearts_p1:5" # 1P 최대 하트를 5로 설정 (현재 하트는 자동 클램핑)
```

### 2. 아이템 조작 액션

#### `add_item:아이템ID:수량`
플레이어 인벤토리에 아이템을 추가합니다.

```yaml
action: "add_item:health_potion:3"    # 체력 포션 3개 추가
action: "add_item:sword:1"            # 검 1개 추가
action: "add_item:key:1"              # 열쇠 1개 추가
```

#### `remove_item:아이템ID:수량`
플레이어 인벤토리에서 아이템을 제거합니다.

```yaml
action: "remove_item:key:1"           # 열쇠 1개 제거
action: "remove_item:health_potion:1" # 체력 포션 1개 제거
```

### 3. 플래그 조작 액션

#### `set_flag:플래그명:값`
게임 플래그를 설정합니다.

```yaml
action: "set_flag:shop_unlocked:true"     # 상점 해금
action: "set_flag:quest_completed:true"   # 퀘스트 완료
action: "set_flag:first_visit:false"      # 첫 방문 플래그 해제
```

### 4. 전역 변수 조작 액션

#### `set_global:변수명:값`
전역 변수를 설정합니다. 숫자, 문자열, 불린 값을 모두 지원합니다.

```yaml
action: "set_global:reputation:50"          # 평판을 50으로 설정
action: "set_global:story_progress:chapter2" # 스토리 진행도 설정
action: "set_global:difficulty:hard"        # 난이도를 hard로 설정
action: "set_global:completed:true"         # 완료 상태를 true로 설정
action: "set_global:score:0"                # 점수를 0으로 설정
```

#### `add_global:변수명:값`
숫자형 전역 변수에 값을 추가하거나 차감합니다.

```yaml
action: "add_global:reputation:10"          # 평판 +10
action: "add_global:score:-5"               # 점수 -5
action: "add_global:karma:1"                # 카르마 +1
action: "add_global:money:-100"             # 별도 화폐 -100
```

### 5. 이벤트 트리거 액션

#### `trigger_event:이벤트명`
커스텀 이벤트를 발생시킵니다.

```yaml
action: "trigger_event:shop_open"     # 상점 열기
action: "trigger_event:level_up"      # 레벨업 처리
action: "trigger_event:boss_fight"    # 보스전 시작
```

### 6. 이동 액션 (1P/2P 태그 이동)

#### `teleport:x:y[:target]`
- 지정 좌표로 순간 이동합니다.
- `target`(선택): `p1` | `p2` | `both` (기본값 `p1`)

```yaml
# 1P를 (512,256)으로 이동
action: "teleport:512:256"

# 2P를 (640,640)으로 이동
action: "teleport:640:640:p2"

# 두 플레이어를 같은 지점으로 이동
action: "teleport:320:480:both"
```

#### `teleport_tag:tag_id[:target]`
- 사전에 정의된 태그 지점으로 순간 이동합니다.
- `target`(선택): `p1` | `p2` | `both` (기본값 `p1`)

```yaml
# 성소로 두 플레이어 이동
action: "teleport_tag:temple:both"

# 2P만 항구로 이동
action: "teleport_tag:harbor:p2"
```

동작 공통 규칙:
- 이동 직후 속도를 0으로 만들고, 현재 방향의 idle 프레임으로 정지합니다.
- 위치 저장은 기존 주기 규칙을 따릅니다.

## 시스템 구조

### ActionProcessor 클래스

```typescript
export class ActionProcessor {
  private player: Player;

  constructor(player: Player) {
    this.player = player;
  }

  // 메인 처리 메서드
  public processAction(actionString: string | null | undefined): void

  // 개별 액션 실행
  private executeAction(action: string): void

  // 액션 타입별 핸들러
  private handleAddStat(parts: string[]): void
  private handleSetStat(parts: string[]): void
  private handleAddItem(parts: string[]): void
  private handleRemoveItem(parts: string[]): void
  private handleSetFlag(parts: string[]): void
  private handleSetGlobal(parts: string[]): void
  private handleAddGlobal(parts: string[]): void
  private handleTriggerEvent(parts: string[]): void
  // 이동 액션 핸들러 (teleport / teleport_tag)
  // private handleTeleport(parts: string[]): void
  // private handleTeleportTag(parts: string[]): void
}
```

### 액션 처리 흐름

```
액션 문자열 입력
    ↓
다중 액션 분리 (';'로 분할)
    ↓
각 액션별 처리
    ↓
액션 타입 파싱 (':' 기준)
    ↓
해당 핸들러 호출
    ↓
게임 상태 변경
    ↓
저장 시스템 업데이트
```

## 사용법

### 1. 대화 시스템에서 사용

```yaml
# merchant.yaml
conversations:
  shop_menu:
    text: "무엇을 사시겠어요?"
    choices:
      - text: "체력 포션 (10골드)"
        action: "add_stat:gold:-10;add_item:health_potion:1"
        condition: "gold>=10"
```

### 2. 코드에서 직접 사용

```typescript
// ActionProcessor 인스턴스 생성
const actionProcessor = new ActionProcessor(player);

// 단일 액션 실행
actionProcessor.processAction("add_stat:gold:100");

// 다중 액션 실행
actionProcessor.processAction("add_stat:health:50;set_flag:healed:true");

// 이동 액션 실행
actionProcessor.processAction("teleport:512:256:both");
actionProcessor.processAction("teleport_tag:temple:p2");
```

## 확장 방법

### 1. 새로운 액션 타입 추가

```typescript
// ActionProcessor.ts의 executeAction 메서드에 추가
private executeAction(action: string): void {
  const parts = action.split(':');
  const actionType = parts[0];

  switch (actionType) {
    // 기존 액션들...
    case 'teleport':
      this.handleTeleport(parts);
      break;
    case 'teleport_tag':
      this.handleTeleportTag(parts);
      break;
    default:
      console.warn(`알 수 없는 액션 타입: ${actionType}`);
  }
}
```

### 2. 복잡한 액션 조합

```typescript
// 커스텀 액션 매크로 시스템
private actionMacros: Record<string, string> = {
  'full_heal': 'set_stat:health:maxHealth;trigger_event:heal_effect',
  'level_up': 'add_stat:level:1;add_stat:maxHealth:10;set_stat:health:maxHealth;trigger_event:level_up_effect',
  'shop_purchase': 'add_stat:gold:-{price};add_item:{item}:1;set_flag:purchased_{item}:true'
};

private expandMacro(action: string): string {
  // 매크로 확장 로직
  return this.actionMacros[action] || action;
}
```

### 3. 액션 검증 시스템

```typescript
// 액션 실행 전 유효성 검사
private validateAction(action: string): boolean {
  const parts = action.split(':');
  const actionType = parts[0];
  switch (actionType) {
    case 'add_stat':
    case 'set_stat':
      return parts.length === 3 && !isNaN(parseInt(parts[2]));
    case 'add_item':
    case 'remove_item':
      return parts.length === 3 && !isNaN(parseInt(parts[2]));
    case 'set_flag':
      return parts.length === 3 && ['true', 'false'].includes(parts[2]);
    case 'trigger_event':
      return parts.length === 2;
    case 'teleport':
      return parts.length === 3 || parts.length === 4; // x:y[:target]
    case 'teleport_tag':
      return parts.length === 2 || parts.length === 3; // tag[:target]
    default:
      return false;
  }
}
```

## API 레퍼런스

### ActionProcessor

#### `processAction(actionString: string | null | undefined): void`

액션 문자열을 파싱하고 실행합니다.

```typescript
actionProcessor.processAction("add_stat:gold:50;set_flag:rich:true");
```

#### 지원되는 액션 타입

| 액션 타입 | 형식 | 설명 | 예시 |
|-----------|------|------|------|
| `add_stat` | `add_stat:스탯:값` | 스탯 값 추가 | `add_stat:gold:50` |
| `set_stat` | `set_stat:스탯:값` | 스탯 값 설정 | `set_stat:health:100` |
| `add_item` | `add_item:아이템ID:수량` | 아이템 추가 | `add_item:potion:3` |
| `remove_item` | `remove_item:아이템ID:수량` | 아이템 제거 | `remove_item:key:1` |
| `set_flag` | `set_flag:플래그:값` | 플래그 설정 | `set_flag:shop_open:true` |
| `trigger_event` | `trigger_event:이벤트` | 이벤트 발생 | `trigger_event:level_up` |
| `teleport` | `teleport:x:y[:target]` | 좌표 텔레포트 | `teleport:512:256:both` |
| `teleport_tag` | `teleport_tag:tag[:target]` | 태그 텔레포트 | `teleport_tag:temple:p2` |

### 아이템 시스템

```typescript
interface Item {
  id: string;        // 아이템 고유 ID
  name: string;      // 표시 이름
  quantity: number;  // 보유 수량
  type: string;      // 아이템 타입
}
```

#### 기본 아이템 타입

| 아이템 ID | 이름 | 타입 |
|-----------|------|------|
| `health_potion` | 체력 포션 | consumable |
| `mana_potion` | 마나 포션 | consumable |
| `key` | 열쇠 | key_item |
| `sword` | 검 | weapon |
| `shield` | 방패 | armor |

### 이벤트 시스템

#### 기본 이벤트

| 이벤트명 | 설명 | 효과 |
|----------|------|------|
| `shop_open` | 상점 열기 | 상점 UI 표시 |
| `level_up` | 레벨업 | 자동 스탯 증가 |

## 💡 팁과 모범 사례

### 1. 액션 네이밍 규칙
```yaml
# 좋은 예
action: "add_stat:gold:50"
action: "set_flag:quest_completed:true"

# 나쁜 예  
action: "gold+50"  # 비표준 형식
action: "flag1=1"  # 모호한 이름
```

### 2. 액션 그룹화
```yaml
# 관련된 액션들을 논리적으로 그룹화
purchase_action: "add_stat:gold:-price;add_item:item:1;set_flag:purchased:true"
level_up_action: "add_stat:level:1;add_stat:maxHealth:10;trigger_event:level_up"
```

### 3. 에러 처리
```yaml
# 조건부 액션으로 안전한 실행
choices:
  - text: "아이템 구매"
    condition: "gold>=price"
    action: "add_stat:gold:-price;add_item:item:1"
  - text: "돈이 부족합니다"
    condition: "gold<price"
    action: null
```

### 4. 디버깅
```typescript
// 액션 실행 로그 활성화
console.log(`액션 실행: ${action}`);
console.log(`플레이어 스탯 변경: ${statName} ${oldValue} → ${newValue}`);
```

## 🚀 고급 활용

### 액션 체인 시스템
```yaml
# 복잡한 퀘스트 완료 처리
quest_complete:
  action: "add_stat:experience:100;add_stat:gold:50;add_item:reward_item:1;set_flag:quest_1_complete:true;trigger_event:quest_complete_celebration"
```

### 조건부 액션 분기
```yaml
# 플레이어 상태에 따른 다른 결과
dynamic_reward:
  choices:
    - text: "보상 받기"
      condition: "level>=10"
      action: "add_item:legendary_item:1"
    - text: "보상 받기"
      condition: "level<10"
      action: "add_item:common_item:1"
``` 