# Entities 폴더 가이드

## 📁 폴더 개요
게임 내 모든 게임 오브젝트와 캐릭터를 정의하는 폴더입니다. 플레이어, NPC, 그리고 월드 오브젝트들의 클래스를 관리합니다.

## 📄 파일 구조

### `Player.ts`
**역할**: 1P (첫 번째 플레이어) 캐릭터 클래스
**핵심 기능**:
- WASD 키 입력 처리
- 우주인 스프라이트 애니메이션 관리
- 플레이어 스탯 및 상태 관리
- 물뿌리개 시스템 연동
- 거울 능력 시스템

### `GinsengPlayer.ts`
**역할**: 2P (두 번째 플레이어) 캐릭터 클래스
**핵심 기능**:
- 방향키 입력 처리
- 인삼/해바라기/덩굴 형태 변환 시스템
- 특수 능력 (덩굴 확장) 관리
- 독립적인 스탯 시스템

### `NPC.ts`
**역할**: 게임 내 모든 NPC 캐릭터
**핵심 기능**:
- 대화 시스템 연동
- 충돌 기반 상호작용
- 상호작용 표시기
- 정적 위치 관리

## 🎮 플레이어 시스템

### 1P - Player (우주인)
```typescript
// 조작: WASD
// 특수능력: 물뿌리개, 거울
// 스프라이트: 'player' 텍스처 사용
```

#### 애니메이션 시스템
- **4방향 걷기 애니메이션**: down, left, right, up
- **Idle 상태**: 각 방향별 첫 프레임
- **프레임 구성**: 행별 4프레임 (0-3: down, 4-7: left, 8-11: right, 12-15: up)

#### 특수 능력
- **물뿌리개 모드**: `player_watering` 텍스처로 전환
- **거울 모드**: `player_mirroring` 텍스처로 전환
- **능력 상태 관리**: `WateringCanSystem`, `MirrorSystem`과 연동

### 2P - GinsengPlayer (인삼)
```typescript
// 조작: 방향키
// 특수능력: 형태 변환, 덩굴 확장
// 스프라이트: 'ginseng', 'ginseng_sunflower', 'ginseng_vine'
```

#### 형태 변환 시스템
- **기본 형태**: 인삼 (`ginseng`)
- **해바라기 형태**: 레이저 발사 (`ginseng_sunflower`)
- **덩굴 형태**: 확장/수축 능력 (`ginseng_vine`)

#### 능력별 특징
- **덩굴 확장**: `VineExtensionSystem`과 연동
- **레이저 발사**: 해바라기 모드에서 활성화
- **1P 연계**: 물뿌리개 근처에서 능력 부스트

## 🤖 NPC 시스템

### 상호작용 메커니즘
```typescript
// 충돌 감지 → 상호작용 표시기 → 스페이스바 → 대화 시작
```

#### 상호작용 영역
- **interactionZone**: 투명한 충돌체로 상호작용 범위 정의
- **크기**: 플레이어보다 약간 큰 범위
- **감지**: 플레이어가 영역에 들어오면 자동으로 표시기 활성화

#### 대화 연동
- **dialogueId**: `public/assets/dialogues/` 폴더의 YAML 파일과 매핑
- **DialogueManager**: 대화 시스템과 직접 연동
- **상태 저장**: 대화 진행 상황 자동 저장

### NPC 생성 패턴
```typescript
const npc = new NPC(scene, x, y, npcId, dialogueId, spriteKey);
// npcId: 고유 식별자
// dialogueId: 대화 데이터 파일명
// spriteKey: 스프라이트 텍스처 키
```

## ⚙️ 공통 기능

### 물리 시스템 연동
- **Arcade Physics**: 모든 엔티티가 물리 바디 보유
- **충돌 감지**: 플레이어 간, NPC와의 상호작용
- **월드 바운드**: 화면 경계 처리
- **타일맵 충돌**: `MapCollisionManager`를 통한 충돌 처리

### 애니메이션 관리
- **자동 등록**: 씬 시작 시 필요한 애니메이션 자동 생성
- **방향별 관리**: 마지막 이동 방향 추적 및 Idle 상태 적용
- **상태 기반**: 이동/정지 상태에 따른 애니메이션 전환

### 스탯 시스템
```typescript
interface PlayerStats {
  health: number;
  experience: number;
  gold: number;
  // ... 기타 스탯
}
```

## 🔧 확장 가이드

### 새로운 플레이어 타입 추가
1. **기본 구조 복사**: Player.ts 또는 GinsengPlayer.ts를 베이스로 사용
2. **입력 시스템 변경**: 다른 키 바인딩 적용
3. **애니메이션 등록**: 새로운 스프라이트시트에 맞춘 애니메이션
4. **특수 능력 연동**: 해당 시스템 클래스와 연결

### NPC 확장
```typescript
// 이동하는 NPC
class MovingNPC extends NPC {
  private movementPattern: 'patrol' | 'random' | 'follow';
  
  update(delta: number) {
    this.updateMovement(delta);
    super.update();
  }
}
```

### 커스텀 엔티티 추가
```typescript
// 기본 패턴
class CustomEntity {
  public sprite: Phaser.Physics.Arcade.Sprite;
  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.sprite = scene.physics.add.sprite(x, y, 'texture_key');
    // 물리 설정, 애니메이션 등록
  }
}
```

## 🎯 개발 팁

### 애니메이션 디버깅
- **F키 디버그**: 각 F키로 플레이어 상태 확인 가능
- **콘솔 로깅**: 상태 변화 시 자동으로 로그 출력
- **텍스처 확인**: 현재 사용 중인 텍스처 키 추적

### 성능 최적화
- **애니메이션 재사용**: 같은 애니메이션은 한 번만 등록
- **충돌체 최적화**: 필요한 경우에만 물리 바디 생성
- **업데이트 최적화**: 화면 밖 엔티티는 업데이트 스킵

### 메모리 관리
- **리소스 정리**: 씬 전환 시 엔티티 정리
- **텍스처 공유**: 여러 엔티티가 같은 텍스처 공유
- **이벤트 정리**: 이벤트 리스너 적절한 해제

## 🔗 연관 시스템

### 직접 연동
- **systems/**: 각종 시스템 클래스들과 직접 상호작용
- **scenes/GameScene**: 모든 엔티티의 생성과 업데이트 관리
- **types/GameData**: 스탯 및 상태 타입 정의

### 간접 연동
- **ui/DialogueBox**: NPC 상호작용을 통한 대화 UI
- **utils/constants**: 이동 속도, 설정값 등 공유
- **data/NPCDefinitions**: NPC 생성 시 참조하는 정적 데이터