# 포탈 시스템

## 개요
- 위치: `public/assets/maps/<mapId>/portals.json`
- 정책: 상호작용 키(스페이스)로 전환, P1/P2 모두 포탈 영역에 있어야 발동
- 좌표: 타일 그리드 기준(x,y,width,height), 스폰은 타겟 맵의 타일 좌표

## 스키마
```ts
interface PortalArea { x:number; y:number; width:number; height:number }
interface PortalTarget { mapId:string; spawn:{ x:number; y:number } }
interface PortalDef {
  id: string;
  area: PortalArea;
  target: PortalTarget;
  options?: { fadeMs?: number; color?: number } // color: 디버그 표시용(0xRRGGBB)
}
```

## 예시 (`public/assets/maps/main/portals.json`)
```json
[
  {
    "id": "to_forest_01",
    "area": { "x": 27, "y": 18, "width": 2, "height": 2 },
    "target": { "mapId": "forest", "spawn": { "x": 3, "y": 7 } },
    "options": { "fadeMs": 400, "color": 255 }
  },
  {
    "id": "to_water_village_01",
    "area": { "x": 14, "y": 1, "width": 4, "height": 2 },
    "target": { "mapId": "water-village", "spawn": { "x": 15, "y": 3 } },
    "options": { "fadeMs": 400, "color": 16711680 }
  }
]
```

## 동작 흐름
- 스페이스 입력 시, `PortalManager`가 P1/P2 위치를 타일 단위로 변환하여 동일 포탈 영역 내 포함 여부 확인
- 포함되면 페이드 아웃 → 맵 언로드/로드 → 스폰 이동 → 페이드 인

## 해금/게이트(Unlock/Gating)
- 특정 포탈은 해금 플래그가 설정되어야만 힌트가 표시되고 전환이 가능하도록 게이트됩니다.
- 현재 매핑(확장 가능):
  - `to_forest_01` → `flags.portals_unlocked_lower` (아랫마을: forest)
  - `to_water_village_01` → `flags.portals_unlocked_upper` (윗마을: water-village)
- 해금은 대화 액션으로 설정합니다. 예: 세계수 상태 대화 완료 시 두 포탈 해금
```yaml
# alien_001.yaml (일부)
world_tree_state_3:
  text: "우리 시무린들은 세계수가 있어야만 힘을 낼 수 있어서 발만 동동 구르고 있어."
  action: "set_flag:portals_unlocked_lower:true;set_flag:portals_unlocked_upper:true"
  choices:
    - text: "(계속)"
      next: "ask_more"
      action: null
```
- 새로운 포탈을 해금해야 할 경우, `GameScene`의 포탈 해금 매핑(포털ID→플래그)을 추가하면 즉시 반영됩니다.

## 디버그
- 포탈 디버그 경계 표시 토글은 추후 키에 매핑 예정. 현재는 로드 시 1회 경계 갱신만 수행
- `options.color`가 지정된 경우, 해당 색상(0xRRGGBB)으로 포탈 디버그 경계가 표시됩니다. 미지정 시 기본 시안색.

