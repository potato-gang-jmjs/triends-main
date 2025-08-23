# 인삼이(P2) 특수능력 시스템

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

## 공개 API
- `MapManager.isPointAdjacentToWater(x, y): boolean`
- `GlobalVariableManager.get/set/add/remove/has/initializeDefaults`
- `VineExtensionSystem.update(deltaMs)`