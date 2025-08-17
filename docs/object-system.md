# 오브젝트 시스템 (Objects)

## 개요
- 맵에 배치되는 일반 오브젝트(문, 상자, 병 등)를 데이터 기반으로 로드/렌더/충돌/상호작용합니다.
- 종류: `hazard`(함정/데미지), `blocker`(이동 차단/파괴 가능), `movable`(이동 가능), `interactive`(상호작용)
- 배치 데이터는 맵 폴더의 `objects.json`에 저장(맵 파일 수정 불필요)

## 데이터 포맷 (`public/assets/maps/<mapId>/objects.json`)
```json
[
  {
    "id": "door_center",
    "kind": "blocker",
    "pos": { "x": 640, "y": 512 },
    "sprite": { "type": "sprite", "key": "obj16", "frame": 0 },
    "collider": "static",
    "depth": 950,
    "scale": 4
  },
  {
    "id": "crate_right",
    "kind": "movable",
    "pos": { "x": 768, "y": 512 },
    "sprite": { "type": "sprite", "key": "obj16", "frame": 9 },
    "collider": "dynamic",
    "depth": 950,
    "scale": 4,
    "onMoved": "trigger_event:crate_moved"
  },
  {
    "id": "potion_top",
    "kind": "interactive",
    "pos": { "x": 1180, "y": 924 },
    "sprite": { "type": "sprite", "key": "obj16", "frame": 15 },
    "collider": "sensor",
    "depth": 950,
    "scale": 4,
    "onInteract": "add_stat:gold:5"
  }
]
```

### 필드 설명
- `kind`: `hazard | blocker | movable | interactive`
- `pos`: 월드 좌표(px). 자유 좌표 기반
- `sprite`: 두 가지 방식 지원
  - `{ type: 'tiles', frameId: string }` → 맵 타일 시트 프레임 사용
  - `{ type: 'sprite', key: string, frame?: number }` → 독립 스프라이트/시트 사용(예: `obj16`)
- `collider`: `static | dynamic | sensor | none`
- `depth`: 렌더 뎁스(미지정 시 기본 500). 오브젝트 컨테이너는 900에 배치됨
- 훅: `onEnter | onLeave | onInteract | onDestroyed | onMoved` (문자열 액션, `ActionProcessor`로 실행)

## 런타임 구성
- `ObjectManager`
  - `load(mapId, tilesTextureKey, tileSize)`: 오브젝트 로드/복원
  - `attachPlayers([p1, p2])`: 플레이어와 충돌/오버랩 바인딩
    - `InteractiveObject`는 센서 범위 진입 시 인디케이터 표시, 이탈 시 숨김
    - SPACE 입력 시 두 플레이어 중 한 명이라도 겹치면 상호작용 실행
  - `update(now, dt)`: SPACE 입력 처리 및 오브젝트 업데이트
  - `saveState()`: 맵별 오브젝트 상태 저장(파괴, 위치, HP 등)
  - `unload()`: 정리

- `WorldObject` (베이스) 및 파생 클래스
  - `HazardObject`: 센서 오버랩 중 주기/즉시 훅 실행
  - `BlockerObject`: 정/동적 충돌체, 파괴 가능
  - `MovableObject`: 동적 충돌체(현재 Pull 미구현)
  - `InteractiveObject`: 센서 + SPACE 상호작용, 인디케이터 표시

## 에셋 로딩
- `PreloadScene`
  - `tiles`: 전역 타일 시트(64x64)
  - `obj16`: 오브젝트 시트(`assets/maps/main/spritesheet[2].png`, 16x16)

## 입력과 상호작용
- 키: 스페이스(SPACE)
- 대화 중에는 상호작용 입력이 무시됨
- 포탈: 두 플레이어 모두 포탈 영역 안 → 스페이스로 전환
- 오브젝트: 한 플레이어만 센서 범위 안에 있어도 상호작용 가능

## 세이브/로드
- `SaveManager`: `objectsState[mapId][objectId]` 구조로 HP/파괴/위치 저장
- 포탈 전환 시 현재 맵의 오브젝트 상태를 저장하고, 다음 맵 로드 시 복원

## 확장 계획
- Pull 시스템 연계(`MovableObject`): 인삼 능력으로 끌기(후속 단계)
- 투사체/스포너(`emitter`) 타입 추가
- 조건부 상호작용(`ConditionEvaluator`) 연계

