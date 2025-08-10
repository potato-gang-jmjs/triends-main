# 맵/타일맵 시스템 (Spritefusion)

## 개요
- 포맷: Spritefusion 내보내기 JSON 사용
- 좌표 이동(연속), 타일 단위 충돌(Arcade Physics)
- 맵 다중화, 레이어별 깊이(depth) 제어, 조건부 통과 준비

## 파일 구조
```
public/assets/
  spritesheet/spritesheet.png        # 전역 타일 시트(기본) - 예: 64x64 프레임 (키: tiles)
  maps/
    main/
      map.json                      # Spritefusion 맵 데이터
      layers.json                   # 레이어별 depth 매핑(선택)
      spritesheet.png               # 맵 전용 타일 시트(선택, 프레임=tileSize)
    forest/
      map.json
      layers.json                   # 선택
      spritesheet.png               # 선택, 프레임=tileSize (예: forest는 16x16)
```

## map.json 스키마
```json
{
  "tileSize": 64,
  "mapWidth": 29,
  "mapHeight": 16,
  "layers": [
    {
      "name": "Buildings",
      "tiles": [{ "id": "59", "x": 12, "y": 1 }],
      "collider": true
    },
    {
      "name": "Stairs",
      "tiles": [{ "id": "148", "x": 9, "y": 8 }],
      "collider": false
    }
  ]
}
```
- id: 스프라이트시트 프레임 인덱스(문자열)
- x,y: 타일 그리드 좌표
- collider: true면 충돌 생성, false면 통과

## layers.json (선택)
```json
{
  "Background": -100,
  "Trees back": -10,
  "Buildings": 20,
  "Trees front": 900
}
```
- 레이어명에 대한 depth를 지정
- 미지정 레이어는 기본 규칙으로 fallback(간단한 순서/키워드 기반)

## 런타임 구성 요소
- MapManager: 맵 로드/언로드, 카메라/월드 경계 설정, 충돌 연결, 디버그 토글
- MapLoader: Phaser 캐시(json)에서 맵 데이터 조회/검증
- MapRenderer: 레이어별 타일을 Image로 생성, depth 적용 (맵별 타일 텍스처 키 지원)
- MapCollisionManager: collider=true 타일 위치에 Arcade 정적 바디 생성, 플레이어와 충돌 연결

소스 위치:
```
src/
  systems/
    MapManager.ts
    MapLoader.ts
    MapRenderer.ts
    MapCollisionManager.ts
  types/
    MapTypes.ts
```

## 화면/카메라
- 화면 해상도: 1280x1024 (64px 타일 20x16 가시)
- 월드 경계: tileSize * mapWidth, tileSize * mapHeight
- 카메라: 플레이어 추적, 맵 크기에 맞춰 경계 설정

## 충돌
- collider=true 타일에 대해 staticGroup.create(x,y,'red')로 정적 바디 생성
- 타일 크기로 바디/디스플레이 크기 설정, 기본 비가시
- 플레이어(1P/2P) 모두 충돌 그룹에 연결
- 디버그: X 키로 충돌체 표시 토글

## 계단(Stairs)
- 데이터 기반 처리: map.json에서 Stairs 레이어의 collider를 false로 설정
- 별도 예외 로직 없이 통로로 동작

## 레이어 깊이 규칙
- layers.json 우선
- fallback 규칙(일부 예):
  - 이름에 background: -100
  - 이름에 back: -10
  - 이름에 front: 100
  - 그 외: 레이어 순서에 따라 0, 10, 20...

## 디버그/단축키
- Z: P1/P2 현재 좌표 출력(콘솔/화면)
- X: 충돌체 디버그 표시 토글

## 새로운 맵 추가 가이드
1. public/assets/maps/<mapId>/map.json 준비 (Spritefusion 내보내기)
2. 선택적으로 layers.json 생성(레이어별 depth)
3. (선택) 맵 전용 스프라이트시트 `public/assets/maps/<mapId>/spritesheet.png` 추가
   - 프레임 크기 = `map.json.tileSize`와 동일해야 함 (예: tileSize=16이면 16x16)
   - 존재하면 자동으로 해당 맵에서 우선 사용됨
4. 전역 스프라이트시트를 사용할 경우 별도 파일 추가 없이 `public/assets/spritesheet/spritesheet.png`를 사용(기본)
5. 프리로드에 json 키를 추가하거나 런타임 로딩 루틴에 맞게 fetch
6. MapManager.load('map:<mapId>') 호출로 로드

## 타일 스프라이트시트 로딩 규칙
- 맵 전용 시트 자동 탐지: `assets/maps/<mapId>/spritesheet.png`
  - 존재 시 `tiles:<mapId>` 키로 런타임 로드 (frameWidth/Height = `map.json.tileSize`)
  - 렌더러는 해당 키로 타일 이미지를 생성
- 전역 폴백: 맵 전용 시트가 없으면 `assets/spritesheet/spritesheet.png`를 `tiles` 키로 사용
- 주의: 스프라이트시트의 프레임 크기는 반드시 맵의 `tileSize`와 일치해야 함

## 확장 포인트
- 타일 메타(tiles.meta.json)로 태그/조건(requires: ['walk_water']) 정의 → 조건부 통과에 사용(준비됨)
- 전경/후경 세분화 depth 규칙 강화
- 대형 맵 최적화를 위한 배칭/가시성 컬링