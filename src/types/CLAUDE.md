# Types 폴더 가이드

## 📁 폴더 개요
TypeScript 타입 정의를 중앙에서 관리하는 폴더입니다. 게임의 모든 데이터 구조와 인터페이스를 정의하여 타입 안전성을 보장하고 코드의 가독성을 향상시킵니다.

## 📄 파일 구조

### `GameData.ts`
**역할**: 게임의 핵심 데이터 구조 정의
**주요 타입**:
- `PlayerStats`: 플레이어 능력치 및 상태
- `Item`: 인벤토리 아이템 구조  
- `DialogueState`: 대화 진행 상태
- `GameData`: 전체 게임 저장 데이터

### `MapTypes.ts`  
**역할**: 맵 시스템 관련 모든 타입 정의
**주요 타입**:
- `MapData`: 맵 전체 구조
- `MapLayer`: 레이어별 타일 정보
- `PortalArea`: 맵 전환 영역
- `NPCSpawnDef`: NPC 배치 정보

### `ObjectTypes.ts`
**역할**: 월드 오브젝트 시스템 타입 정의
**주요 타입**:
- `ObjectDef`: 오브젝트 기본 정의
- `SpriteRef`: 스프라이트 참조 방식
- 특화 타입들: `InteractiveDef`, `MovableDef` 등

### `global.d.ts`
**역할**: 전역 타입 선언 및 모듈 확장
**내용**:
- 외부 라이브러리 타입 확장
- 전역 네임스페이스 정의
- 커스텀 유틸리티 타입

## 🎮 GameData.ts 상세

### PlayerStats 인터페이스
```typescript
export interface PlayerStats {
  // 기본 능력치
  health: number;
  maxHealth: number;
  gold: number;
  experience: number;
  level: number;
  
  // 1P/2P 분리 하트 시스템
  hearts_p1: number;      // 1P 현재 하트
  maxHearts_p1: number;   // 1P 최대 하트
  hearts_p2: number;      // 2P 현재 하트  
  maxHearts_p2: number;   // 2P 최대 하트
  
  [key: string]: number;  // 동적 확장 가능
}
```

### 대화 시스템 타입
```typescript
export interface DialogueChoice {
  text: string;           // 선택지 텍스트
  condition?: string;     // 표시 조건 (옵션)
  action?: string;        // 선택 시 실행 액션
}

export interface DialogueNode {
  text: string;           // 대화 내용
  choices?: DialogueChoice[]; // 선택지 배열
  next?: string;          // 다음 노드 ID
}
```

### 저장 데이터 구조
```typescript
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
```

## 🗺️ MapTypes.ts 상세

### 맵 데이터 구조
```typescript
export interface MapData {
  tileSize: number;     // 타일 크기 (픽셀, 보통 64)
  mapWidth: number;     // 가로 타일 수
  mapHeight: number;    // 세로 타일 수  
  layers: MapLayer[];   // 레이어 배열
}

export interface MapLayer {
  name: string;         // 레이어 이름
  tiles: MapTile[];     // 타일 배열
  collider: boolean;    // 충돌 처리 여부
  is_water?: boolean;   // 물 타일 여부 (특수 능력용)
}
```

### 포털 시스템
```typescript
export interface PortalArea {
  x: number;           // 타일 그리드 X (좌상단)
  y: number;           // 타일 그리드 Y (좌상단)  
  width: number;       // 타일 단위 너비
  height: number;      // 타일 단위 높이
}

export interface Portal {
  id: string;
  area: PortalArea;
  target: {
    mapId: string;     // 목표 맵 ID
    x: number;         // 목표 위치 X (픽셀)
    y: number;         // 목표 위치 Y (픽셀)
  };
  condition?: string;  // 이동 조건 (옵션)
}
```

### NPC 배치 시스템
```typescript
export interface NPCSpawnDef {
  npcId: string;       // 고유 NPC ID
  x: number;           // 픽셀 좌표 X
  y: number;           // 픽셀 좌표 Y  
  direction?: 'down' | 'up' | 'left' | 'right'; // 초기 방향
}

export interface NPCDefinition {
  npcId: string;       // NPC ID (NPCSpawnDef와 매칭)
  dialogueId: string;  // 대화 데이터 파일명
  spriteKey: string;   // 스프라이트 텍스처 키
}
```

## 🧱 ObjectTypes.ts 상세

### 오브젝트 기본 구조
```typescript
export type ObjectKind = 'hazard' | 'blocker' | 'movable' | 'interactive' | 'emitter';

export interface ObjectDefBase {
  id: string;              // 고유 식별자
  kind: ObjectKind;        // 오브젝트 타입
  pos: ObjectPosition;     // 월드 좌표
  sprite: SpriteRef;       // 스프라이트 참조
  collider: ColliderKind;  // 충돌체 타입
  
  // 옵션 속성들
  depth?: number;          // 렌더링 깊이
  tags?: string[];         // 태그 배열
  visible?: boolean;       // 가시성
  scale?: number;          // 스케일
  rotation?: number;       // 회전
  hp?: number;             // 현재 체력
  maxHp?: number;          // 최대 체력
  destructible?: boolean;  // 파괴 가능 여부
}
```

### 스프라이트 참조 시스템
```typescript  
export type SpriteRef =
  | { type: 'tiles'; frameId: string }      // 타일셋 프레임 참조
  | { type: 'sprite'; key: string; frame?: number }; // 개별 스프라이트 참조
```

### 특화된 오브젝트 타입들
```typescript
// 상호작용 가능 오브젝트
export interface InteractiveDef extends ObjectDefBase {
  kind: 'interactive';
  onEnter?: string;        // 진입 시 액션
  onLeave?: string;        // 퇴장 시 액션  
  onInteract?: string;     // 상호작용 시 액션
}

// 이동 가능 오브젝트
export interface MovableDef extends ObjectDefBase {
  kind: 'movable';
  pushable?: boolean;      // 밀기 가능
  pullable?: boolean;      // 당기기 가능
  gridSnapped?: boolean;   // 타일 그리드에 맞춤
}
```

## 🔧 타입 활용 패턴

### 타입 가드 함수
```typescript
// 타입 안전한 구분
export function isInteractiveObject(obj: ObjectDef): obj is InteractiveDef {
  return obj.kind === 'interactive';
}

export function isMovableObject(obj: ObjectDef): obj is MovableDef {
  return obj.kind === 'movable';
}
```

### 제네릭 활용
```typescript
// 시스템별 데이터 타입
export interface SystemData<T = any> {
  systemId: string;
  data: T;
  timestamp: number;
}

// 사용 예
export type DialogueSystemData = SystemData<DialogueState>;
export type PlayerSystemData = SystemData<PlayerStats>;
```

### 유니온 타입과 리터럴
```typescript
// 방향 정의
export type Direction = 'down' | 'left' | 'right' | 'up';

// 씬 타입  
export type SceneKey = 'boot' | 'preload' | 'menu' | 'game';

// 액션 타입
export type ActionType = 'add_stat' | 'set_flag' | 'teleport' | 'spawn_item';
```

## 🛠️ 확장 가이드

### 새로운 데이터 타입 추가
```typescript
// 1. 기본 인터페이스 정의
export interface NewFeatureData {
  id: string;
  name: string;
  properties: Record<string, any>;
}

// 2. GameData에 통합
export interface GameData {
  // 기존 필드들...
  newFeature?: Record<string, NewFeatureData>;
}

// 3. 관련 타입들 정의
export interface NewFeatureConfig {
  enabled: boolean;
  settings: NewFeatureData;
}
```

### 타입 확장 패턴
```typescript
// 기존 타입 확장
export interface ExtendedPlayerStats extends PlayerStats {
  mana: number;
  stamina: number;
  skills: Record<string, number>;
}

// 선택적 확장
export interface OptionalExtension {
  baseData: PlayerStats;
  extensions?: {
    combat?: CombatStats;
    social?: SocialStats;
  };
}
```

## ✅ 타입 검증

### 런타임 타입 체크
```typescript
// 타입 검증 유틸리티
export function validatePlayerStats(data: any): data is PlayerStats {
  return (
    typeof data.health === 'number' &&
    typeof data.maxHealth === 'number' &&
    typeof data.gold === 'number' &&
    // ... 기타 검증 로직
  );
}

// 사용 예
if (validatePlayerStats(loadedData)) {
  // 안전하게 타입 사용 가능
  player.setStats(loadedData);
}
```

### 컴파일 타임 체크
```typescript
// 필수 필드 체크
type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

// 사용 예: id와 kind는 반드시 필요
export type ValidObjectDef = RequiredFields<ObjectDefBase, 'id' | 'kind'>;
```

## 🚀 성능과 메모리

### 타입 최적화
```typescript
// 메모리 효율적인 타입
export interface CompactStats {
  // 숫자를 배열로 압축
  values: [health: number, maxHealth: number, gold: number];
  // 불린 값들을 비트마스크로
  flags: number;
}

// 필요한 필드만 선택
export type MinimalPlayerData = Pick<PlayerStats, 'health' | 'gold'>;
```

### 조건부 타입 활용
```typescript
// 조건에 따른 타입 변경
export type DialogueData<T extends boolean> = T extends true
  ? FullDialogueData    // 에디터 모드
  : CompactDialogueData; // 런타임 모드
```

## ⚠️ 주의사항

### 타입 호환성
- **하위 호환성**: 기존 데이터와 호환되는 타입 설계
- **버전 관리**: 데이터 구조 변경 시 마이그레이션 고려
- **확장성**: 미래 기능 추가를 고려한 여유 있는 설계

### 성능 고려사항
- **깊은 중첩 피하기**: 과도한 중첩은 타입 체크 성능 저하
- **유니온 타입 최적화**: 너무 많은 유니온은 컴파일 속도 저하
- **제네릭 남용 피하기**: 복잡한 제네릭은 가독성 저해

## 🔗 연관 관계

### 직접 사용
- **모든 src 폴더**: 모든 소스 코드에서 타입 정의 참조
- **systems/**: 각 시스템의 데이터 구조 정의
- **entities/**: 엔티티 클래스들의 속성 타입

### 간접 영향  
- **public/assets/**: 데이터 파일 구조가 타입과 일치해야 함
- **docs/**: 문서화 시 타입 정의 기반으로 설명
- **저장 데이터**: 게임 저장 파일 형식 결정