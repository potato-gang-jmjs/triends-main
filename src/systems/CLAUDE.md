# Systems 폴더 가이드

## 📁 폴더 개요
게임의 핵심 로직과 시스템들을 관리하는 폴더입니다. 각 시스템은 독립적으로 동작하며, 서로 필요에 따라 연동됩니다. 게임의 모든 기능적 측면을 담당하는 핵심 구성 요소들입니다.

## 🗂️ 시스템 분류

### 💬 대화 시스템
- **DialogueManager.ts**: 대화 플로우 및 상태 관리
- **DialogueLoader.ts**: YAML 대화 데이터 로딩 및 파싱
- **ConditionEvaluator.ts**: 대화 조건 평가 (스탯, 플래그 등)

### 🗺️ 맵 시스템
- **MapManager.ts**: 맵 전체 관리 및 전환 제어
- **MapLoader.ts**: 맵 데이터 로딩 및 파싱
- **MapRenderer.ts**: 맵 타일 렌더링
- **MapCollisionManager.ts**: 맵 충돌 처리
- **PortalManager.ts**: 포털 기반 맵 전환

### 🤖 엔티티 관리
- **NPCManager.ts**: NPC 생성, 배치, 관리
- **ObjectManager.ts**: 월드 오브젝트 관리

### ⚡ 특수 능력 시스템
- **WateringCanSystem.ts**: 1P 물뿌리개 시스템
- **VineExtensionSystem.ts**: 2P 덩굴 확장 시스템
- **MirrorSystem.ts**: 1P 거울 능력 시스템

### 🔧 핵심 유틸리티
- **ActionProcessor.ts**: 액션 명령어 처리 엔진
- **GlobalVariableManager.ts**: 전역 변수 및 플래그 관리
- **SaveManager.ts**: 게임 저장/로드 시스템

## 🎯 핵심 시스템 상세

### DialogueManager (대화 시스템)
```typescript
// 주요 기능
- startDialogue(dialogueId): 대화 시작
- processChoice(choiceIndex): 선택지 처리  
- isInDialogue(): 대화 중인지 확인
- endDialogue(): 대화 종료
```
**특징**:
- YAML 기반 대화 데이터 처리
- 조건부 선택지 표시
- 액션 시스템과 연동
- 타이핑 효과 지원

### MapManager (맵 시스템)
```typescript
// 주요 기능
- loadMap(mapId): 새로운 맵 로딩
- switchMap(mapId, position): 맵 전환
- getCurrentMap(): 현재 맵 정보
- checkPortals(player): 포털 충돌 검사
```
**특징**:
- Spritefusion JSON 형식 지원
- 레이어별 깊이 제어
- 동적 충돌체 생성
- 부드러운 전환 효과

### ActionProcessor (액션 엔진)
```typescript
// 지원하는 액션 타입
- add_stat / set_stat: 스탯 조작
- add_item / remove_item: 아이템 관리
- set_flag: 플래그 설정
- teleport / teleport_tag: 이동 명령
- trigger_event: 커스텀 이벤트
```
**문법 예제**:
```yaml
action: "add_stat:gold:10;set_flag:quest_complete:true;teleport:400,300"
```

### WateringCanSystem (물뿌리개)
```typescript
// 상태: idle → equipped → watering
- 물 타일 근처에서만 장착 가능
- Shift 키로 물뿌리기 시작/중지
- 2P가 근처에 있으면 덩굴 능력 부스트
- 실시간 물 양 UI 표시
```

### VineExtensionSystem (덩굴 확장)
```typescript  
// 2P 전용 능력
- Q키로 덩굴 발사/수축
- 1P를 끌어오기 가능
- 물뿌리개 근처에서 능력 향상
- 최대 확장 거리 제한
```

### MirrorSystem (거울 능력)
```typescript
// 1P 전용 능력
- E키로 거울 모드 활성화/비활성화
- 레이저를 반사하여 두 갈래로 분할
- 특정 각도로 반사 방향 제어
- 시각적 반사 효과
```

## 🔄 시스템 간 연동

### 대화 → 액션 → 스탯 플로우
```
DialogueManager → ActionProcessor → Player.stats
                                 → GlobalVariableManager
                                 → SaveManager
```

### 맵 전환 플로우
```
PortalManager → MapManager → MapLoader → MapRenderer
                           → MapCollisionManager
                           → NPCManager
                           → ObjectManager
```

### 능력 시스템 연동
```
WateringCanSystem ←→ VineExtensionSystem (상호 부스트)
MirrorSystem → 레이저 반사 → GinsengPlayer (해바라기 모드)
```

## 📊 데이터 흐름

### 전역 상태 관리
```typescript
// GlobalVariableManager를 통한 상태 공유
- 플레이어 위치 정보
- 퀘스트 진행 상황  
- 능력 활성화 상태
- 맵별 이벤트 플래그
```

### 저장/로드 시스템
```typescript  
// SaveManager가 관리하는 데이터
- 플레이어 스탯 (체력, 골드, 경험치)
- 대화 진행 상황
- 전역 변수 및 플래그
- 현재 맵 위치
```

## 🛠️ 확장 가이드

### 새로운 시스템 추가
1. **기본 구조**:
```typescript
export class NewSystem {
  private scene: Phaser.Scene;
  private isActive = false;
  
  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }
  
  public update(deltaMs: number): void {
    if (!this.isActive) return;
    // 업데이트 로직
  }
}
```

2. **GameScene에서 통합**:
```typescript
// GameScene.ts
private newSystem!: NewSystem;

create(): void {
  this.newSystem = new NewSystem(this);
}

update(time: number, delta: number): void {
  this.newSystem.update(delta);
}
```

### 시스템 간 통신
```typescript
// 이벤트 기반 통신
this.scene.events.emit('system:event', data);
this.scene.events.on('system:event', this.handleEvent, this);

// 직접 참조 (주의깊게 사용)
const gvm = GlobalVariableManager.getInstance();
gvm.set('key', value);
```

## 🔍 디버깅 도구

### 시스템별 디버그 정보
```typescript
// F키를 통한 디버그 정보 출력
F1: Player stats
F2: NPC Manager state  
F3: Dialogue Manager state
F4: Save data reset
F5-F6: Stat manipulation
F10-F12: Health manipulation
```

### 콘솔 로깅
- 각 시스템은 중요한 상태 변화 시 콘솔에 로그 출력
- 액션 처리 실패 시 경고 메시지
- 맵 전환, 대화 시작/종료 등 주요 이벤트 추적

## 🚀 성능 최적화

### 업데이트 최적화
```typescript
// 조건부 업데이트
public update(deltaMs: number): void {
  if (!this.needsUpdate()) return;
  // 실제 업데이트 로직
}

// 시간 기반 주기적 업데이트
private lastUpdate = 0;
public update(deltaMs: number): void {
  this.lastUpdate += deltaMs;
  if (this.lastUpdate >= 100) { // 100ms마다
    this.doPeriodicUpdate();
    this.lastUpdate = 0;
  }
}
```

### 메모리 관리
- **시스템 정리**: 씬 전환 시 적절한 cleanup
- **이벤트 정리**: destroy 메서드에서 이벤트 리스너 해제
- **타이머 정리**: 시스템 비활성화 시 타이머 중지

## ⚠️ 주의사항

### 설계 원칙
- **단일 책임**: 각 시스템은 하나의 명확한 역할
- **느슨한 결합**: 시스템 간 직접적 의존성 최소화
- **확장성**: 새로운 기능 추가 시 기존 시스템 수정 최소화

### 일반적인 실수 방지
- **순환 참조**: 시스템 간 상호 참조 주의
- **상태 동기화**: 여러 시스템에서 같은 데이터 관리 시 일관성 유지
- **메모리 누수**: 이벤트 리스너, 타이머 등 적절한 정리

## 🔗 연관 관계

### 직접 의존
- **scenes/GameScene**: 모든 시스템의 통합 지점
- **entities/**: 플레이어, NPC 등과 직접 상호작용
- **types/**: 데이터 타입 정의 참조

### 간접 의존  
- **ui/**: 시스템 상태를 UI로 표시
- **data/**: 정적 데이터 로딩 및 참조
- **utils/**: 공통 유틸리티 함수 사용

각 시스템은 독립적으로 개발 및 테스트 가능하며, 필요에 따라 다른 시스템과 연동하여 복합적인 게임 기능을 구현합니다.