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
  options?: { fadeMs?: number };
}
```

## 예시 (`public/assets/maps/main/portals.json`)
```json
[
  {
    "id": "to_forest_01",
    "area": { "x": 27, "y": 1, "width": 2, "height": 2 },
    "target": { "mapId": "forest", "spawn": { "x": 3, "y": 7 } },
    "options": { "fadeMs": 400 }
  }
]
```

## 동작 흐름
- 스페이스 입력 시, `PortalManager`가 P1/P2 위치를 타일 단위로 변환하여 동일 포탈 영역 내 포함 여부 확인
- 포함되면 페이드 아웃 → 맵 언로드/로드 → 스폰 이동 → 페이드 인

## 디버그
- 포탈 디버그 경계 표시 토글은 추후 키에 매핑 예정. 현재는 로드 시 1회 경계 갱신만 수행

