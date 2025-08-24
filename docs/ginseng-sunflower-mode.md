# Ginseng Sunflower Mode

본 문서는 2P 캐릭터 `GinsengPlayer`의 Sunflower(해바라기) 모드에 대한 개요, 조작법, 애니메이션/자산, 이벤트 연동, 구현 포인트를 정리합니다.

## 핵심 요약
- **변신 토글**: R 키로 `ginseng ↔ sunflower` 형태 전환
- **잠금 로직**: 변신 시작 시 이동 잠금; 해바라기 상태에서 유지, 인삼 복귀 시 번개 애니메이션 종료 후 해제
- **공격 트리거**: 해바라기 상태에서 이동 잠금 중 방향키 단발 입력(JustDown)으로 단발 사격 애니메이션 + 탄환 발사 이벤트
- **발사 처리**: 씬(`GameScene`)이 `sunflower-shoot` 이벤트를 받아 탄환(`sunflower_laser`) 스폰 및 이동/수명 관리

## 조작법
- **변신**: R 키
  - 누르는 즉시 이동 잠금(`lockMovement`) 진입
  - 약간의 지연 후 형태 전환(`toggleForm`)
  - 해바라기 변신 시 잠금 유지, 인삼 복귀 시 번개 애니 종료 콜백에서 `unlockMovement`
- **사격**: 해바라기 상태 + 이동 잠금 중에 방향키(←/→/↑/↓)를 “딸깍” 1회 입력
  - 애니메이션 1회 재생(`ginseng-sunflower-<dir>-once`)
  - 마지막 프레임에서 `sunflower-shoot` 이벤트 emit → 씬이 탄환 스폰
  - 쿨다운 및 공격 중 플래그로 중복 입력 무시

## 자산(Assets)
- 캐릭터 시트
  - `ginseng`: `public/assets/characters/ginseng_walking.png` (48x48)
  - `ginseng_sunflower`: `public/assets/gimmicks/sunflower.png` (64x64)
- 이펙트 시트
  - 번개: `public/assets/gimmicks/thunder6.png` (256x384)
- 탄환 시트
  - `sunflower_laser`: `public/assets/gimmicks/sunflower_laser.png` (64x64)

## 애니메이션 키
- 인삼 걷기: `ginseng-walk-down|left|right|up`
- 해바라기 단발: `ginseng-sunflower-down-once|left-once|right-once|up-once`
- 번개: `thunder-strike`

## 동작 흐름
1. 플레이어가 R 키를 누름 → `GameScene.onTransformToggle()`
   - 이동 잠금 활성화(`GinsengPlayer.lockMovement()`)
   - 번개 이펙트 재생(`thunder-strike`)
   - 지연 후 `GinsengPlayer.toggleForm()`으로 형태 전환
   - 해바라기 → 인삼 복귀 시 번개 종료 콜백에서 `unlockMovement()`
2. 해바라기 상태 동안 이동은 잠금 유지, 대신 방향키 단발 입력을 감지해 공격 트리거
3. `GinsengPlayer.triggerSunflowerAttack(dir)`
   - 해당 방향 단발 애니메이션 재생
   - 마지막 프레임에서 `sprite.emit('sunflower-shoot', { x,y,dir })`
   - 완료 시 공격 플래그/쿨다운 해제, idle 프레임 고정
4. `GameScene`에서 `sunflower-shoot` 수신 → `spawnSunflowerLaser(x,y,dir)`
   - 그룹 풀에서 스프라이트 활성화 → 물리 바디 설정 → 방향 속도 부여 → 수명 타이머로 제거

## 주요 코드 포인트
- 파일: `src/entities/GinsengPlayer.ts`
  - 형태/잠금 상태: `form: 'ginseng' | 'sunflower'`, `movementLocked`
  - 공격 상태: `isAttackingSunflower`, `attackOnCooldown`
  - API: `setForm()`, `toggleForm()`, `isSunflowerForm()`, `lockMovement()`, `unlockMovement()`
  - 입력 처리: 이동 잠금 중 해바라기 폼일 때만 방향키 `JustDown` 감지
- 파일: `src/scenes/GameScene.ts`
  - 키 바인딩: `setupInput()`에서 R 키 → `onTransformToggle()`
  - 이펙트: `triggerThunderAt(x,y,cb)`
  - 탄환 스폰: `spawnSunflowerLaser(x,y,dir)`; 오프셋, 히트박스(16x16), 속도(기본 500), 수명(기본 800ms)

## 튜닝 포인트
- 레이저 속도: `spawnSunflowerLaser`의 `speed`
- 히트박스: `body.setSize(HIT_W, HIT_H)` 및 `setOffset(...)`
- 발사 오프셋: `OFFSET[dir]`
- 쿨다운: `GinsengPlayer` 내부 `attackOnCooldown` 해제 타이밍(애니 완료 시)
- 애니메이션 프레임레이트: 해바라기 단발 `frameRate`

## 확장 아이디어
- 적 충돌/피해 판정: Arcade overlap/collider 연동 및 피해 처리
- 다단 히트/관통/폭발형 탄환 등 탄속/수명/패턴 다양화
- 해바라기 상태 전용 UI/HUD(쿨다운 표시 등)
- 스탯/아이템에 따른 발사 간격, 탄수, 위력 스케일링

## 참고 라인
```12:66:src/scenes/GameScene.ts
// 자산 로드, 애니 등록, R 키 바인딩, sunflower-shoot 이벤트 연결
```
```416:566:src/scenes/GameScene.ts
// onTransformToggle(), triggerThunderAt(), spawnSunflowerLaser()
```
```1:393:src/entities/GinsengPlayer.ts
// Sunflower 폼, 공격 트리거, 이동/애니/이벤트 처리
```