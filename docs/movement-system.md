# 이동/컨트롤 시스템 (1P/2P + 태그 이동)

## 개요
- 두 명의 플레이어를 동시 지원합니다.
  - 1P: `Player` (우주인 시트)
  - 2P: `GinsengPlayer` (인삼 시트)
- 대화 중에는 두 플레이어 모두 즉시 정지하며, 입력키가 리셋됩니다.
- 좌표/태그 기반 이동(텔레포트) 액션을 통해 특정 지점으로 순간 이동을 지원합니다.

## 컨트롤 매핑
- 1P: WASD 키 (`keysWASD`)
- 2P: 방향키 (`cursors`)

게임 루프에서는 대화가 활성화되어 있지 않을 때에만 각 플레이어를 업데이트합니다.

```ts
// GameScene.update() 요약
if (!dialogueManager.getState().isActive) {
  player.update(keysWASD);  // 1P: WASD
  player2.update(cursors);  // 2P: 방향키
}
```

대화 시작 시에는 즉시 두 플레이어의 속도를 0으로 만들고, 눌려 있던 키 상태를 초기화합니다.

```ts
// GameScene 내 로직 요약
haltPlayersAndResetKeys(); // 두 플레이어 정지 + 키 리셋
```

## 태그 이동(텔레포트)
두 가지 방식의 순간 이동을 지원합니다.

### 1) 좌표 텔레포트 액션
지정 좌표로 이동합니다.

- 문법: `teleport:x:y`
- 대상: 기본적으로 1P에 적용됩니다.

예시 (YAML):
```yaml
choices:
  - text: "비밀방으로 이동"
    action: "teleport:512:256"
```

### 2) 태그 텔레포트 액션
사전에 정의된 태그 지점으로 이동합니다.

- 문법: `teleport_tag:tag_id[:target]`
  - `target`: `p1` | `p2` | `both` (기본값 `p1`)

예시 (YAML):
```yaml
choices:
  - text: "사원으로 이동 (둘 다)"
    action: "teleport_tag:temple:both"

  - text: "항구로 이동 (2P만)"
    action: "teleport_tag:harbor:p2"
```

동작 규칙:
- 이동 직후 두 플레이어의 속도는 0으로 초기화됩니다.
- 애니메이션은 현재 방향의 idle 프레임에 맞춰 정지합니다.
- 위치 저장은 기존 주기(프레임 기반) 규칙을 그대로 따릅니다.

## 개발 팁
- 코드에서 수동 이동이 필요한 경우:
```ts
// 1P 수동 이동
player.sprite.setPosition(x, y);
player.savePosition();

// 2P 수동 이동
player2.sprite.setPosition(x, y);
```
- 대화/액션에서 이동을 트리거하려면 위의 액션 문법(`teleport`, `teleport_tag`)을 사용하세요.

## 요약
- 1P/2P 동시 조작: 1P는 WASD, 2P는 방향키
- 대화 중 이동 정지 및 입력키 리셋 자동 처리
- 좌표/태그 기반 텔레포트 액션으로 특정 지점으로 순간 이동 가능
