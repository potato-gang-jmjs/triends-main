# Scenes 폴더 가이드

## 📁 폴더 개요
Phaser.js의 씬 시스템을 활용한 게임 상태 관리 폴더입니다. 게임의 각 단계별 화면과 로직을 독립적인 씬으로 분리하여 관리합니다.

## 📄 파일 구조

### `BootScene.ts`
**역할**: 게임의 최초 초기화 씬
**핵심 기능**:
- 기본 설정 초기화
- 전역 시스템 준비
- PreloadScene으로 자동 전환

### `PreloadScene.ts`
**역할**: 게임 에셋 로딩 씬
**핵심 기능**:
- 모든 텍스처, 사운드, 데이터 파일 로딩
- 로딩 진행률 표시 (Progress Bar)
- 로딩 완료 후 MainMenuScene으로 전환

### `MainMenuScene.ts`
**역할**: 메인 메뉴 씬
**핵심 기능**:
- 게임 시작 버튼
- 설정 메뉴
- 게임 종료 옵션
- GameScene으로의 전환

### `GameScene.ts` (메인 게임플레이)
**역할**: 실제 게임이 진행되는 핵심 씬
**핵심 기능**:
- 1P/2P 플레이어 관리
- 맵 시스템 통합
- 모든 게임 시스템 통합 (NPC, 대화, 오브젝트 등)
- 실시간 게임 로직 처리

## 🎮 GameScene 상세 분석

### 시스템 통합 구조
```typescript
export class GameScene extends Phaser.Scene {
  // 플레이어 시스템
  private player!: Player;                    // 1P (WASD)
  private player2!: GinsengPlayer;            // 2P (방향키)
  
  // 관리 시스템들
  private npcManager!: NPCManager;            // NPC 관리
  private dialogueManager!: DialogueManager; // 대화 시스템
  private mapManager!: MapManager;            // 맵 시스템
  private objectManager!: ObjectManager;      // 오브젝트 관리
  
  // 특수 능력 시스템
  private vineSystem!: VineExtensionSystem;   // 2P 덩굴 능력
  private wateringSystem!: WateringCanSystem; // 1P 물뿌리개
  private mirrorSystem!: MirrorSystem;        // 1P 거울 능력
  
  // UI 시스템
  private dialogueBox!: DialogueBox;          // 대화 박스
  private heartsTextP1!: Text;               // 1P 하트 UI
  private heartsTextP2!: Text;               // 2P 하트 UI
}
```

### 초기화 순서 (create 메서드)
1. **기본 설정**: 키 바인딩, 카메라 설정
2. **맵 로딩**: MapManager를 통한 현재 맵 로드
3. **플레이어 생성**: 1P, 2P 스프라이트 및 물리 바디 생성
4. **시스템 초기화**: 각종 관리 시스템들 초기화
5. **UI 구성**: HUD, 대화 박스 등 UI 요소 생성
6. **충돌 설정**: 플레이어 간, 맵과의 충돌 처리
7. **디버그 설정**: F키 바인딩, 개발 도구

### 업데이트 루프 (update 메서드)
```typescript
update(time: number, delta: number): void {
  // 1. 대화 중인지 확인
  const inDialogue = this.dialogueManager.isInDialogue();
  
  // 2. 플레이어 업데이트 (대화 중에는 이동 제한)
  if (!inDialogue) {
    this.player.update(delta);
    this.player2.update(delta);
  }
  
  // 3. 시스템 업데이트
  this.vineSystem.update(delta);
  this.wateringSystem.update(delta);
  this.mirrorSystem.update(delta);
  
  // 4. UI 업데이트
  this.updateHeartsUI();
  
  // 5. 맵 전환 처리
  this.mapManager.update(delta);
}
```

## 🔄 씬 전환 플로우

### 게임 시작 흐름
```
BootScene → PreloadScene → MainMenuScene → GameScene
```

### 씬 간 데이터 전달
```typescript
// 데이터와 함께 씬 전환
this.scene.start('GameScene', { 
  mapId: 'main',
  playerPosition: { x: 400, y: 300 }
});

// 받는 쪽에서 데이터 사용
init(data: any): void {
  this.mapId = data.mapId || 'main';
  this.startPosition = data.playerPosition;
}
```

## 🎯 입력 시스템

### 키 바인딩 구조
```typescript
// 게임플레이 키
private keysWASD!: CursorKeys;        // 1P 이동 (WASD)
private cursors!: CursorKeys;         // 2P 이동 (방향키)
private spaceKey!: Key;               // 상호작용
private rKey!: Key;                   // 2P 형태 변환

// 디버그 키
private zKey!: Key;                   // 좌표 표시 토글
private xKey!: Key;                   // 충돌체 표시 토글

// F키 디버그 도구
F1~F12: 각종 디버그 기능
```

### 입력 우선순위
1. **대화 중**: 스페이스바만 활성화 (대화 진행)
2. **일반 상태**: 모든 입력 활성화
3. **시스템 일시정지**: 모든 입력 비활성화

## 🗺️ 맵 시스템 연동

### 맵 전환 메커니즘
- **Portal 시스템**: 특정 영역 진입 시 자동 전환
- **부드러운 전환**: 페이드 인/아웃 효과
- **플레이어 위치 보존**: 전환 후 적절한 위치에 배치
- **상태 유지**: 플레이어 스탯, 인벤토리 등 보존

### 충돌 관리
```typescript
// 타일맵 충돌
this.physics.add.collider(this.player.sprite, collisionLayer);

// 플레이어 간 충돌
this.physics.add.collider(this.player.sprite, this.player2.sprite);

// NPC 상호작용
this.physics.add.overlap(this.player.sprite, npc.interactionZone, callback);
```

## 🎨 UI 관리

### HUD 시스템
- **하트 UI**: 실시간 체력 표시 (♥/♡)
- **능력 표시기**: 현재 활성화된 특수능력
- **상호작용 힌트**: 상황별 조작 가이드
- **미니맵**: 현재 위치 및 주요 지점 표시

### 반응형 UI
- **스크롤 팩터**: 카메라 이동과 무관하게 고정
- **해상도 대응**: 다양한 화면 크기에 맞춰 조정
- **Depth 관리**: UI 요소들의 렌더링 순서 보장

## 🔧 개발 도구

### 디버그 기능
```typescript
// F키 기능들
F1: 플레이어 스탯 콘솔 출력
F2: NPC 상태 정보
F3: 대화 시스템 상태
F4: 저장 데이터 초기화
F10-F12: 하트 조작 (테스트용)

// 시각적 디버그
Z키: 좌표 표시 토글
X키: 물리 바디 표시 토글
```

### 성능 모니터링
- **FPS 표시**: 실시간 프레임률 모니터링
- **메모리 사용량**: 텍스처, 스프라이트 메모리 추적
- **충돌 횟수**: 물리 연산 부하 측정

## 🚀 최적화 팁

### 성능 향상 방법
- **오브젝트 풀링**: 자주 생성/삭제되는 객체 재사용
- **컬링**: 화면 밖 객체 업데이트 스킵
- **텍스처 아틀라스**: 여러 이미지를 하나로 합쳐 로딩 최적화
- **적응형 품질**: 성능에 따라 효과 품질 자동 조정

### 메모리 관리
- **씬 전환 시 정리**: 불필요한 리소스 해제
- **이벤트 리스너 정리**: 메모리 누수 방지
- **텍스처 캐시 관리**: 사용하지 않는 텍스처 해제

## ⚠️ 주의사항

### 씬 설계 원칙
- **단일 책임**: 각 씬은 명확한 역할만 담당
- **느슨한 결합**: 씬 간 직접적인 의존성 최소화
- **상태 독립성**: 각 씨의 상태는 독립적으로 관리

### 일반적인 실수 방지
- **메모리 누수**: 이벤트 리스너, 타이머 정리 누락
- **중복 초기화**: create 메서드에서만 초기화
- **업데이트 루프 과부하**: 무거운 연산은 주기적으로만 실행

## 🔗 연관 시스템

### 직접 의존
- **entities/**: 플레이어, NPC 등 게임 엔티티
- **systems/**: 모든 게임 시스템과 직접 연동
- **ui/**: 대화박스, HUD 등 UI 컴포넌트

### 간접 의존
- **types/**: 데이터 타입 정의 참조
- **utils/**: 상수, 유틸리티 함수 사용
- **data/**: 정적 데이터 로딩 및 참조