# 물뿌리개 시스템 (Watering Can System) - 상세 구현 가이드

## 📋 개요
P1(우주인) 전용 물뿌리개 능력 시스템으로, 상태 기반 관리와 P2 덩굴 능력 부스트 기능을 제공합니다.

- **타겟**: Player (P1, 우주인)
- **주요 파일**: `src/systems/WateringCanSystem.ts`
- **버전**: v1.0.12 (2024-01-03)

## 🏗️ 시스템 아키텍처

### 상태 머신 (State Machine)
```typescript
type WateringState = 'idle' | 'equipped' | 'watering';
```

#### 상태 전환 다이어그램
```
┌─────────┐   P키 + 물 인접   ┌──────────┐     P키      ┌───────────┐
│  idle   │ ──────────────→ │ equipped │ ──────────→ │ watering  │
│         │                  │          │              │           │
└─────────┘                  └──────────┘              └───────────┘
     ↑                           ↑                          │
     │ 물 소진 or 물에서 멀어짐      │ P키 해제                  │
     └───────────────────────────┘←─────────────────────────┘
```

### 핵심 클래스 구조
```typescript
class WateringCanSystem {
  private state: WateringState = 'idle';
  private waterAmount: number = 0;
  private maxWaterAmount: number = 10;
  private isWatering: boolean = false;
  private waterEntity: Phaser.GameObjects.Sprite | null = null;
  
  // UI 요소
  private waterUI: Phaser.GameObjects.Text | null = null;
  private hintText: Phaser.GameObjects.Text | null = null;
  
  // 상호작용 범위
  private player2InteractionRange: number = 225;
}
```

## 🔧 구현 세부사항

### 1. 초기화 (Initialization)
```typescript
// GameScene.ts
this.wateringSystem = new WateringCanSystem(this, this.player, this.player2);
```

### 2. 애셋 로딩 (Asset Loading)
```typescript
// GameScene.preload()
this.load.spritesheet('player_watering', 'public/assets/characters/astronaut_walking_water.png', {
  frameWidth: 32, frameHeight: 32
});
this.load.spritesheet('water_entity', 'public/assets/characters/astronaut_water.png', {
  frameWidth: 32, frameHeight: 32
});
```

### 3. 애니메이션 등록 (Animation Setup)
```typescript
// GameScene.create()
// 물뿌리개 장착 애니메이션
['down', 'left', 'right', 'up'].forEach(direction => {
  this.anims.create({
    key: `player-watering-${direction}`,
    frames: this.anims.generateFrameNumbers('player_watering', { start: 0, end: 3 }),
    frameRate: 10,
    repeat: -1
  });
});

// 물 스프레이 애니메이션
if (this.textures.exists('water_entity')) {
  this.anims.create({
    key: 'water-spray',
    frames: this.anims.generateFrameNumbers('water_entity', { start: 0, end: 3 }),
    frameRate: 5,
    repeat: -1
  });
}
```

### 4. 물 엔티티 위치 계산 (Water Entity Positioning)
```typescript
private getWaterEntityOffset(direction: string, playerWidth: number, playerHeight: number) {
  switch (direction) {
    case 'down': 
      return { x: 0, y: 64 };
    case 'left': 
      return { x: -20, y: 20 + playerHeight / 2 };
    case 'right': 
      return { x: 20 + playerWidth, y: 20 + playerHeight / 2 };
    case 'up': 
      return { x: 0, y: -8 };
    default: 
      return { x: 0, y: 0 };
  }
}
```

### 5. UI 시스템 (User Interface)
```typescript
private createUI(): void {
  // 물 양 표시 (우상단)
  this.waterUI = this.scene.add.text(
    this.scene.scale.width - 20, 20,
    `물: ${Math.ceil(this.waterAmount)}/${this.maxWaterAmount}`,
    { fontSize: '14px', color: '#4fc3f7' }
  );
  this.waterUI.setOrigin(1, 0);
  this.waterUI.setScrollFactor(0);
  this.waterUI.setDepth(2000);

  // P키 힌트 (화면 하단)
  this.hintText = this.scene.add.text(
    this.scene.scale.width / 2, this.scene.scale.height - 60,
    'P키: 물뿌리기 시작',
    { fontSize: '12px', color: '#ffffff', backgroundColor: '#000000aa', padding: { x: 6, y: 4 } }
  );
  this.hintText.setOrigin(0.5);
  this.hintText.setScrollFactor(0);
  this.hintText.setDepth(2000);
  this.hintText.setVisible(false);
}
```

## 🎮 상태별 동작 로직

### Idle 상태
- **진입 조건**: 게임 시작, 물 소진, 물 타일에서 멀어짐
- **동작**: 
  - 물 양 UI 숨김
  - 물 엔티티 없음
  - 일반 플레이어 스프라이트
- **전환**: P키 + 물 인접 → `equipped`

### Equipped 상태
- **진입 조건**: 물 타일 근처에서 P키
- **동작**:
  - 물뿌리개 스프라이트로 변경
  - 물 양 UI 표시
  - P키 힌트 표시 (조건부)
  - 물이 없으면 자동 리필
- **전환**: 
  - P키 → `watering`
  - 물에서 멀어짐 → `idle`

### Watering 상태
- **진입 조건**: equipped 상태에서 P키
- **동작**:
  - 물 엔티티 생성 및 표시
  - P2 덩굴 능력 부스트 활성화
  - 물 소모 진행
  - 물 엔티티 플레이어 추적
- **전환**: 
  - P키 해제 → `equipped`
  - 물 소진 → `idle`

## 🔄 P2 상호작용 시스템

### 덩굴 능력 부스트
```typescript
private isPlayer2Nearby(): boolean {
  if (!this.player2?.sprite) return false;
  
  const distance = Phaser.Math.Distance.Between(
    this.player.sprite.x, this.player.sprite.y,
    this.player2.sprite.x, this.player2.sprite.y
  );
  
  return distance <= this.player2InteractionRange; // 225px
}

private activatePlayer2VineAbility(): void {
  const gvm = GlobalVariableManager.getInstance();
  if (this.isPlayer2Nearby()) {
    gvm.set('waterNearby', true);
    gvm.set('vineAbilityBoosted', true);
  }
}
```

## 🛡️ 안전장치 및 오류 처리

### 1. 텍스처/애니메이션 부재 대응
```typescript
private createWaterEntity(): void {
  // 텍스처 존재 확인
  if (!this.scene.textures.exists('water_entity')) {
    console.warn('water_entity 텍스처가 로드되지 않았습니다. 기본 시각 효과를 사용합니다.');
    this.createFallbackWaterEffect(player, offsetX, offsetY);
    return;
  }

  // 애니메이션 안전하게 재생
  if (this.scene.anims.exists('water-spray')) {
    this.waterEntity.play('water-spray');
  } else {
    console.warn('water-spray 애니메이션이 존재하지 않습니다.');
    this.waterEntity.setFrame(0);
  }
}
```

### 2. Fallback 효과
```typescript
private createFallbackWaterEffect(player: Phaser.Physics.Arcade.Sprite, offsetX: number, offsetY: number): void {
  this.waterEntity = this.scene.add.circle(
    player.x + offsetX,
    player.y + offsetY,
    8, // 반지름
    0x4fc3f7, // 파란색
    0.7 // 투명도
  ) as any;
  
  if (this.waterEntity) {
    const playerDepth = player.depth;
    this.waterEntity.setDepth(playerDepth - 1);
  }
  
  // 펄스 효과
  this.scene.tweens.add({
    targets: this.waterEntity,
    scaleX: 1.2,
    scaleY: 1.2,
    duration: 300,
    yoyo: true,
    repeat: -1
  });
}
```

### 3. 타입 안전성
```typescript
// 플레이어 크기 안전한 접근
const playerWidth = (player.body as Phaser.Physics.Arcade.Body)?.width || 32;
const playerHeight = (player.body as Phaser.Physics.Arcade.Body)?.height || 32;

// 메서드 존재 확인
if (typeof this.waterEntity.setPosition === 'function') {
  this.waterEntity.setPosition(x, y);
}

if (typeof this.waterEntity.setFlipY === 'function') {
  this.waterEntity.setFlipY(direction === 'up');
}
```

## 📊 성능 최적화

### 1. 업데이트 최적화
```typescript
update(deltaMs: number): void {
  // 조건부 실행으로 불필요한 연산 방지
  const isNearWater = this.isNearWaterTile();
  
  // UI 업데이트는 상태 변경 시에만
  if (this.needsUIUpdate) {
    this.updateWaterUI();
    this.needsUIUpdate = false;
  }
  
  // 물 엔티티 위치 업데이트는 watering 상태에서만
  if (this.state === 'watering' && this.waterEntity) {
    this.updateWaterEntityPosition();
  }
}
```

### 2. 메모리 관리
```typescript
private destroyWaterEntity(): void {
  if (this.waterEntity) {
    this.waterEntity.destroy();
    this.waterEntity = null;
  }
}

destroy(): void {
  this.destroyWaterEntity();
  if (this.waterUI) {
    this.waterUI.destroy();
    this.waterUI = null;
  }
  if (this.hintText) {
    this.hintText.destroy();
    this.hintText = null;
  }
}
```

## 🎨 시각적 개선 사항

### 위치 최적화 (v1.0.11-1.0.12)
- **오른쪽**: playerWidth만큼 추가 오프셋
- **왼쪽/오른쪽**: playerHeight/2만큼 아래로 조정
- **위쪽**: 상하반전 효과 적용
- **Depth**: 플레이어보다 정확히 1 낮게

### UI 개선
- **가시성 제어**: idle 상태에서 물 양 UI 숨김
- **색상 피드백**: 물 부족 시 빨간색 표시
- **조건부 힌트**: 적절한 타이밍에만 P키 힌트 표시

## 🔮 확장 가능성

### 1. 새로운 물 효과 타입
```typescript
enum WaterEffectType {
  NORMAL = 'normal',
  HEALING = 'healing',
  SPEED_BOOST = 'speed_boost'
}
```

### 2. 업그레이드 시스템
```typescript
interface WateringCanUpgrade {
  capacity: number;
  range: number;
  duration: number;
  effectType: WaterEffectType;
}
```

### 3. 다중 플레이어 지원
```typescript
class MultiPlayerWateringSystem {
  private systems: Map<string, WateringCanSystem> = new Map();
  
  addPlayer(playerId: string, system: WateringCanSystem): void {
    this.systems.set(playerId, system);
  }
}
```

## 📝 디버깅 가이드

### 콘솔 명령어
```javascript
// 브라우저 콘솔에서 사용 가능
window.debugWateringSystem = {
  getState: () => wateringSystem.state,
  setWater: (amount) => wateringSystem.waterAmount = amount,
  forceState: (state) => wateringSystem.state = state,
  toggleUI: () => wateringSystem.waterUI?.setVisible(!wateringSystem.waterUI.visible)
};
```

### 로그 출력
```typescript
private logStateTransition(from: WateringState, to: WateringState): void {
  console.log(`[WateringCan] State transition: ${from} → ${to}`);
  console.log(`[WateringCan] Water: ${this.waterAmount}/${this.maxWaterAmount}`);
  console.log(`[WateringCan] Near water: ${this.isNearWaterTile()}`);
}
```

## 🚀 배포 체크리스트

- [ ] 모든 애셋 파일 존재 확인
- [ ] 애니메이션 정상 작동 확인
- [ ] P1-P2 상호작용 테스트
- [ ] 다양한 맵에서 물 타일 인식 확인
- [ ] UI 가시성 및 위치 확인
- [ ] 메모리 누수 없음 확인
- [ ] 성능 프로파일링 완료

---

**개발자**: AI Assistant  
**최종 업데이트**: 2024-01-03  
**버전**: v1.0.12  
**상태**: ✅ 완료