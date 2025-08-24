# 특수능력 시스템 (Ability Systems)

## 개요
- 프레임워크: Phaser 3.90.0
- 언어: TypeScript
- 번들러: Vite
- 대상 엔티티: `GinsengPlayer` (P2)
- 관련 파일:
  - 시스템: `src/systems/VineExtensionSystem.ts`
  - 글로벌 상태: `src/systems/GlobalVariableManager.ts`
  - 맵 접근/판정: `src/systems/MapManager.ts`
  - 통합: `src/scenes/GameScene.ts`

## 발동 조건
- isNearWater = true일 때 `E` 키로 능력 발동
- isNearWater는 물 레이어(`is_water: true`)의 타일과 4방 인접 시 true
  - 판정: `MapManager.isPointAdjacentToWater(worldX, worldY)`

## 입력/조작
- 조준(aiming): `Q` + WASD(8방향)
  - Q를 누른 상태에서 WASD 조합으로 벡터 결정
- 발동/유지: `E` 홀드로 확장, 키를 떼면 수축 시작

## 동작/연출
- 덩굴은 초록색 직사각형으로 표시(교체 용이)
- 최대 길이: 인삼이 바디 크기(가로/세로 중 큰 값) × 8
- 타이밍: 확장 2초, 수축 1초
- UI: “E 능력 사용 가능” 힌트(물 근처이고 대기 상태일 때 노출)

## 전역 변수
- isNearWater: boolean — 물 인접 여부
- isVineSkillActivated: boolean — 능력 활성화 여부
- vine_collision: boolean — 덩굴 충돌 단계 여부(내부용)
- collision: boolean — 확장 중 상호작용 차단용(NPC 등)
- p1VineLocked: boolean — 1P가 덩굴에 훅된 상태(이동 잠금)
- 초기화: `GlobalVariableManager.initializeDefaults()`

## 상호작용 차단
- collision = true 동안 NPC 상호작용 비활성화
  - 구현 위치: `src/systems/NPCManager.ts`

## 통합 흐름
1. 씬 생성 시
   - `GlobalVariableManager.initializeDefaults()` 호출
   - `new VineExtensionSystem(this, player2.sprite, player1.sprite)` 생성
2. 씬 업데이트에서
   - `mapManager.isPointAdjacentToWater(player2.x, player2.y)`로 isNearWater 갱신
   - `vineSystem.update(delta)` 호출
   - `vineSystem.isP1MovementLocked()`가 true면 `player1.haltMovementAndIdle()` 적용

## 교체/확장 포인트
- 그래픽 자산으로 교체: ensureVineGraphic()
- 속성 조정: extendDurationMs/retractDurationMs, maxLengthPx, 사각형 두께
- 힌트 문구/스타일: createPHintUI

## 1P 훅/끌어오기 기믹
- 조건: 확장 중 1P가 덩굴 선분에 접촉하면 훅됨(`p1VineLocked = true`), 이동 제한
- 끌어오기: 수축 단계에서 1P를 덩굴 끝점으로 즉시 이동(충돌 무시)
- 종료: 덩굴이 완전히 수축되면 훅 해제(`p1VineLocked = false`)

## 번개 효과 및 형태 변환 시스템
### 변신 시퀀스
- **덩굴 확장 시작**: idle → extending 전환 시 번개 효과 + vine 형태로 변신
- **덩굴 수축 완료**: retracting → idle 전환 시 번개 효과 + ginseng 형태로 복원

### 형태 관리
- **기본 형태**: 'ginseng' (`ginseng_walking.png`)
- **덩굴 형태**: 'vine' (`vine.png` 스프라이트시트)
- **sunflower 형태**: 'sunflower' (기존 지원)

### 번개 효과
- **스프라이트**: `thunder6.png` 스프라이트시트
- **애니메이션**: `thunder-strike` (6프레임, 100ms 간격)
- **실행**: `triggerThunderEffect()` 메서드로 플레이어 위치에 재생

### 통합 구현
```typescript
// 형태 변환과 함께 번개 효과
private transitionToExtending(): void {
  this.triggerThunderEffect();
  if (this.ginsengPlayer) {
    this.ginsengPlayer.setForm('vine');
  }
  // ... 기존 로직
}
```

## 공개 API
- `MapManager.isPointAdjacentToWater(x, y): boolean`
- `GlobalVariableManager.get/set/add/remove/has/initializeDefaults`
- `VineExtensionSystem.update(deltaMs)`

---

# 우주인(P1) 물뿌리개 시스템

## 개요
- 프레임워크: Phaser 3.90.0
- 언어: TypeScript
- 대상 엔티티: `Player` (P1)
- 관련 파일:
  - 시스템: `src/systems/WateringCanSystem.ts`
  - 글로벌 상태: `src/systems/GlobalVariableManager.ts`
  - 플레이어: `src/entities/Player.ts`
  - 통합: `src/scenes/GameScene.ts`

## 상태 관리 (State Machine)
- **idle**: 기본 상태, 물뿌리개 없음
- **equipped**: 물뿌리개 장착 상태, 물뿌리기 준비
- **watering**: 실제 물뿌리기 진행 중

## 발동 조건
- 물 타일 인접 시 P키로 물뿌리개 장착 (`idle` → `equipped`)
- 물뿌리개 장착 상태에서 P키로 물뿌리기 시작 (`equipped` → `watering`)
- 물 타일 인접 판정: `MapManager.isPointAdjacentToWater(worldX, worldY)`

## 입력/조작
- **장착**: 물 타일 근처에서 `P` 키 (JustDown)
- **물뿌리기**: 장착 상태에서 `P` 키 홀드
- **중지**: `P` 키 해제 시 즉시 중지 (`watering` → `equipped`)

## 동작/연출
### 스프라이트 변경
- **기본**: `astronaut_walking.png` 
- **장착**: `astronaut_walking_water.png`

### 물 엔티티 (Water Entity)
- **스프라이트**: `astronaut_water.png`
- **애니메이션**: `water-spray` (4프레임, 200ms 간격)
- **위치 조정** (플레이어 방향별):
  - 아래: `y + 64`
  - 왼쪽: `x - 20, y + 20 + playerHeight/2`
  - 오른쪽: `x + 20 + playerWidth, y + 20 + playerHeight/2`
  - 위쪽: `y - 8` + 상하반전
- **Depth**: 플레이어 depth - 1

### 물 소모 시스템
- **최대 용량**: 10초 (10.0)
- **소모율**: 1초당 1.0
- **자동 리필**: 물 타일 근처에서 물이 없을 때 P키 시 자동 충전

## UI 시스템
### 물 양 표시 (우상단)
- **위치**: 화면 우상단
- **표시**: `물: X/10` 형태
- **색상**: 부족 시 빨간색(`#ff5252`), 충분 시 파란색(`#4fc3f7`)
- **가시성**: `idle` 상태에서는 숨김, `equipped`/`watering` 상태에서만 표시

### P키 힌트 (화면 하단)
- **조건**: `equipped` 상태 + 물 타일 인접 + 물 보유
- **메시지**: "P키: 물뿌리기 시작"

## 2P 상호작용
### 덩굴 능력 부스트
- **활성화**: P1이 물뿌리기 중 + P2가 225px 범위 내
- **효과**: P2 덩굴 능력 사용 가능 (`waterNearby`, `vineAbilityBoosted` 플래그)
- **비활성화**: 물뿌리기 중지 또는 P2가 범위 밖

## 전역 변수
- `isP1NearWater`: boolean — P1의 물 인접 여부
- `waterNearby`: boolean — P1이 P2에게 물 제공 중
- `vineAbilityBoosted`: boolean — P2 덩굴 능력 부스트 상태

## 안전장치 (Fallback)
### 텍스처 부재 시
- `water_entity` 텍스처 없을 때: 파란색 펄스 원형 효과
- `water-spray` 애니메이션 없을 때: 첫 번째 프레임 고정

### 타입 안전성
- 플레이어 body 크기 안전한 접근 (기본값 32px)
- 메서드 존재 확인 (`typeof setPosition === 'function'`)
- null 체크 강화

## 통합 흐름
1. **씬 생성 시**
   - `WateringCanSystem` 인스턴스 생성
   - 애셋 로딩: `player_watering`, `water_entity` 스프라이트시트
   - 애니메이션 등록: `player-watering-*`, `water-spray`

2. **씬 업데이트에서**
   - `isP1NearWater` 플래그 업데이트
   - `wateringSystem.update(delta)` 호출

3. **상태 전환**
   ```
   idle → (P키 + 물 인접) → equipped → (P키) → watering
        ←                            ←  (P키 해제 or 물 소진) ←
   ```

## 교체/확장 포인트
- **물 용량**: `maxWaterAmount` 상수 변경
- **소모율**: `deltaMs / 1000` 계수 조정
- **상호작용 범위**: `player2InteractionRange` (현재 225px)
- **UI 스타일**: `createUI()` 메서드
- **물 엔티티 위치**: 방향별 `offsetX`, `offsetY` 값

## 공개 API
- `WateringCanSystem.update(deltaMs)`
- `Player.setWateringCanEquipped(equipped: boolean)`
- `Player.getLastDirection(): string`
- `Player.isWateringCanEquippedState(): boolean`