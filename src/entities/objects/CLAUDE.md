# Objects 폴더 가이드

## 📁 폴더 개요
게임 월드에 배치되는 모든 상호작용 가능한 오브젝트들을 정의하는 폴더입니다. 상자, 문, 스위치, 함정 등 다양한 게임 요소들의 기반 클래스와 구현체를 제공합니다.

## 📄 파일 구조

### `WorldObject.ts` (기본 클래스)
**역할**: 모든 월드 오브젝트의 추상 기본 클래스
**핵심 기능**:
- 공통 스프라이트 생성 로직
- 위치 이동 및 애니메이션
- 액션 시스템 연동 (`onEnter`, `onLeave`, `onInteract` 등)
- 파괴 시스템 (HP 기반)

### `InteractiveObject.ts`
**역할**: 플레이어가 상호작용할 수 있는 오브젝트
**핵심 기능**:
- 상호작용 영역 감지 (Overlap 기반)
- 상호작용 표시기 (↑ 아이콘)
- 진입/퇴장 이벤트 처리
- 스페이스바 상호작용

### `MovableObject.ts`
**역할**: 플레이어가 밀거나 당길 수 있는 오브젝트
**핵심 기능**:
- 물리 기반 이동 (Immovable: false)
- 월드 경계 충돌 방지
- 90% 크기 충돌체 (부드러운 이동감)

### `BlockerObject.ts`
**역할**: 이동을 차단하는 정적 오브젝트
**핵심 기능**:
- 완전 정적 충돌체 (Immovable: true)
- 벽, 기둥, 바위 등 구현
- 장식적 요소 포함

### `HazardObject.ts`
**역할**: 플레이어에게 피해를 주는 위험 요소
**핵심 기능**:
- 피해 적용 로직
- 함정, 스파이크, 화염 등
- 시각적 경고 효과

## 🏗️ 아키텍처 구조

### 상속 관계
```
WorldObject (추상 클래스)
├── InteractiveObject (상호작용)
├── MovableObject (이동 가능)
├── BlockerObject (차단)
└── HazardObject (위험 요소)
```

### 공통 인터페이스
```typescript
abstract class WorldObject {
  // 필수 구현 메서드
  public abstract enablePhysics(textureKeyForTiles: string): void;
  public abstract update(dt: number): void;
  
  // 공통 기능
  public setPosition(x: number, y: number): void;
  public moveBy(dx: number, dy: number): void;
  public slideTo(x: number, y: number, durationMs?: number): void;
  public applyDamage(amount?: number): void;
  public destroyObject(): void;
}
```

## 🔧 오브젝트 타입별 특징

### InteractiveObject
```typescript
// 사용 예: 상자, 문, NPC가 아닌 상호작용 요소
{
  "kind": "interactive",
  "id": "chest_001",
  "pos": { "x": 320, "y": 240 },
  "sprite": { "type": "tiles", "frameId": "42" },
  "onEnter": "show_hint:Press Space to open",
  "onInteract": "add_item:gold:50;set_flag:chest_opened:true"
}
```

#### 상호작용 메커니즘
- **Overlap Detection**: 원형 충돌 영역으로 플레이어 감지
- **Visual Indicator**: "↑" 텍스트로 상호작용 가능 표시
- **Floating Animation**: 표시기가 위아래로 부드럽게 움직임

### MovableObject
```typescript
// 사용 예: 상자, 돌덩이, 블록 퍼즐 요소
{
  "kind": "movable",
  "id": "pushable_box_001",
  "pos": { "x": 256, "y": 256 },
  "sprite": { "type": "tiles", "frameId": "15" },
  "onMoved": "check_pressure_plate"
}
```

#### 물리 특성
- **Immovable: false**: 플레이어가 밀 수 있음
- **CollideWorldBounds**: 화면 밖으로 나가지 않음
- **90% Collision Box**: 타일 간격을 고려한 부드러운 이동

### BlockerObject & HazardObject
```typescript
// Blocker: 벽, 기둥
{
  "kind": "blocker",
  "id": "stone_pillar",
  "destructible": true,
  "maxHp": 3
}

// Hazard: 함정, 스파이크
{
  "kind": "hazard", 
  "id": "spike_trap",
  "damage": 1,
  "onEnter": "apply_damage:1;play_sound:spike"
}
```

## 🎯 액션 시스템 연동

### 지원하는 이벤트 훅
- **onEnter**: 플레이어가 오브젝트 영역에 진입
- **onLeave**: 플레이어가 오브젝트 영역에서 나감
- **onInteract**: 플레이어가 상호작용 키 (스페이스) 누름
- **onMoved**: 오브젝트가 이동할 때
- **onDestroyed**: 오브젝트가 파괴될 때

### 액션 문법 예제
```typescript
"onInteract": "add_item:key:1;set_flag:door_unlocked:true;play_sound:unlock"
"onEnter": "show_message:Welcome to the shop!"
"onDestroyed": "spawn_item:health_potion:1;add_stat:experience:5"
```

## 🛠️ 생성 및 관리

### ObjectManager를 통한 생성
```typescript
// objects.json에서 정의
{
  "objects": [
    {
      "kind": "interactive",
      "id": "treasure_chest",
      "pos": { "x": 400, "y": 300 },
      // ... 기타 속성
    }
  ]
}
```

### 동적 생성
```typescript
const objectDef: InteractiveDef = {
  kind: 'interactive',
  id: 'dynamic_object',
  pos: { x: 100, y: 100 },
  sprite: { type: 'tiles', frameId: '10' }
};

const obj = new InteractiveObject(scene, objectDef, 64, actionProcessor);
obj.enablePhysics('tileset_texture');
```

## 🎨 스프라이트 시스템

### 스프라이트 참조 방식
```typescript
// 타일셋 사용
sprite: { 
  type: "tiles", 
  frameId: "42"  // 타일셋의 42번 프레임
}

// 개별 텍스처 사용  
sprite: { 
  type: "texture", 
  key: "chest_texture", 
  frame: 0 
}
```

### 렌더링 계층
- **Depth 설정**: 기본값 500, 정의 시 커스텀 가능
- **자동 정렬**: Y 좌표 기반 깊이 정렬 지원
- **스케일링**: 오브젝트별 독립적 스케일 적용

## 🔍 디버깅 도구

### 충돌체 시각화
```typescript
// gameConfig.ts에서 debug 모드 활성화
arcade: { debug: true }
```

### 콘솔 로그
- 액션 실행 실패 시 자동 경고 로그
- 오브젝트 생성/파괴 로그
- 상호작용 이벤트 추적

## 🚀 확장 가이드

### 새로운 오브젝트 타입 추가
```typescript
// 1. 타입 정의 (ObjectTypes.ts)
interface CustomDef extends ObjectDef {
  kind: 'custom';
  customProperty: string;
}

// 2. 클래스 구현
class CustomObject extends WorldObject {
  constructor(scene: Phaser.Scene, def: CustomDef, tileSize: number, runner?: ActionProcessor) {
    super(scene, def, tileSize, runner);
  }
  
  public enablePhysics(textureKey: string): void {
    // 물리 바디 생성 로직
  }
  
  public update(dt: number): void {
    // 업데이트 로직
  }
}

// 3. ObjectManager에서 팩토리 등록
```

### 복합 상호작용
```typescript
// 여러 조건을 만족해야 하는 오브젝트
class ConditionalObject extends InteractiveObject {
  public onPlayerEnter(): void {
    if (this.checkConditions()) {
      super.onPlayerEnter();
    }
  }
  
  private checkConditions(): boolean {
    // 플래그, 아이템, 스탯 등 복합 조건 검사
    return true;
  }
}
```

## ⚠️ 주의사항

### 성능 고려사항
- **물리 바디 최적화**: 필요한 경우에만 복잡한 충돌 형태 사용
- **업데이트 최적화**: 화면 밖 오브젝트는 업데이트 스킵
- **메모리 관리**: 파괴된 오브젝트의 리소스 정리

### 설계 원칙
- **단일 책임**: 각 오브젝트 타입은 명확한 역할 보유
- **확장성**: 새로운 기능 추가 시 기존 코드 수정 최소화
- **일관성**: 모든 오브젝트가 동일한 인터페이스 준수