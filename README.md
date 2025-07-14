# Potato Gang 🚀

![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Phaser](https://img.shields.io/badge/Phaser-3.90.0-blue?style=flat-square)
![Vite](https://img.shields.io/badge/Vite-7.0.4-646CFF?style=flat-square&logo=vite&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=flat-square&logo=node.js&logoColor=white)

## 프로젝트 개요

Potato Gang은 Phaser.js 3.90.0 기반의 탑뷰 RPG 게임입니다. 우주 테마의 픽셀아트 스타일로 제작되며, TypeScript와 Vite를 활용한 모던 웹 게임 개발 환경을 사용합니다.

### 개발 목표
- 90도 탑뷰 시점의 우주 테마 RPG 게임
- 픽셀 퍼펙트 렌더링을 통한 레트로 감성
- 모듈화된 씬 기반 아키텍처
- 재사용 가능한 엔티티 시스템

## 기술 스택

| 기술 | 버전 | 용도 |
|------|------|------|
| **Phaser.js** | 3.90.0 | 게임 엔진 |
| **TypeScript** | ~5.8.3 | 타입 안전성 |
| **Vite** | ^7.0.4 | 빌드 도구 |
| **Node.js** | 18+ | 개발 환경 |

### 게임 엔진 설정
- **해상도**: 1024x1024 픽셀
- **물리 엔진**: Arcade Physics
- **렌더링**: Pixel Perfect (pixelArt: true)
- **스케일링**: FIT 모드, 자동 중앙 정렬

## 프로젝트 구조

```
potato-gang/
├── src/                    # 소스 코드
│   ├── config/            # 게임 설정
│   │   └── gameConfig.ts  # Phaser 게임 설정
│   ├── entities/          # 게임 엔티티
│   │   ├── Player.ts      # 플레이어 클래스
│   │   └── NPC.ts         # NPC 클래스
│   ├── scenes/            # 게임 씬
│   │   ├── BootScene.ts   # 초기화 씬
│   │   ├── PreloadScene.ts # 에셋 로딩 씬
│   │   ├── MainMenuScene.ts # 메인 메뉴 씬
│   │   └── GameScene.ts   # 게임플레이 씬
│   ├── systems/           # 게임 시스템
│   │   ├── DialogueManager.ts      # 대화 시스템 관리
│   │   ├── DialogueLoader.ts       # YAML 대화 로더
│   │   ├── NPCManager.ts           # NPC 관리 시스템
│   │   ├── ActionProcessor.ts      # 액션 처리 시스템
│   │   ├── ConditionEvaluator.ts   # 조건 평가 시스템
│   │   ├── GlobalVariableManager.ts # 글로벌 변수 관리
│   │   └── SaveManager.ts          # 저장/로드 시스템
│   ├── ui/                # 사용자 인터페이스
│   │   └── DialogueBox.ts # 대화 박스 UI
│   ├── types/             # 타입 정의
│   │   └── GameData.ts    # 게임 데이터 타입
│   ├── utils/             # 유틸리티
│   │   └── constants.ts   # 게임 상수
│   ├── main.ts            # 진입점
│   └── style.css          # 스타일시트
├── public/                # 정적 에셋
│   └── assets/            # 게임 에셋
│       ├── sprites/       # 스프라이트 이미지
│       ├── tilemaps/      # 타일맵 데이터
│       ├── ui/            # UI 에셋
│       └── dialogues/     # 대화 데이터 (YAML)
│           ├── guard.yaml     # 경비병 대화
│           └── merchant.yaml  # 상인 대화
├── docs/                  # 프로젝트 문서
│   ├── README.md          # 문서 개요
│   ├── dialogue-system.md # 대화 시스템 가이드
│   ├── action-system.md   # 액션 시스템 가이드
│   └── stats-system.md    # 스탯 시스템 가이드
├── index.html             # HTML 진입점
├── package.json           # 프로젝트 설정
├── tsconfig.json          # TypeScript 설정
├── vite.config.ts         # Vite 설정
└── project-requirements.md # 프로젝트 요구사항
```

### 디렉터리 설명

#### `src/config/`
- **gameConfig.ts**: Phaser 게임 설정 (해상도, 물리엔진, 씬 등록)

#### `src/entities/`
- **Player.ts**: 플레이어 캐릭터 클래스 (8방향 이동, 물리 적용)
- **NPC.ts**: NPC 엔티티 클래스 (충돌 감지, 대화 시작)

#### `src/scenes/`
- **BootScene.ts**: 게임 초기화 및 기본 설정
- **PreloadScene.ts**: 에셋 로딩 및 진행률 표시
- **MainMenuScene.ts**: 메인 메뉴 UI 및 네비게이션
- **GameScene.ts**: 메인 게임플레이 로직

#### `src/systems/`
- **DialogueManager.ts**: 대화 시스템 핵심 로직
- **DialogueLoader.ts**: YAML 대화 파일 로딩
- **NPCManager.ts**: NPC 생성 및 관리
- **ActionProcessor.ts**: 대화 선택지 액션 처리
- **ConditionEvaluator.ts**: 대화 조건 평가
- **GlobalVariableManager.ts**: 게임 상태 변수 관리
- **SaveManager.ts**: 게임 저장/로드 기능

#### `src/ui/`
- **DialogueBox.ts**: 대화 UI 컴포넌트 (타이핑 효과, 선택지)

#### `src/types/`
- **GameData.ts**: 게임 데이터 타입 정의

#### `src/utils/`
- **constants.ts**: 게임 전역 상수 (속도, 크기 등)

#### `public/assets/dialogues/`
- **YAML 대화 파일**: NPC별 대화 트리 및 선택지 정의
- 플레이어 스탯 변경, 조건부 대화 지원

#### `docs/`
- **dialogue-system.md**: NPC 대화 시스템 사용 가이드
- **action-system.md**: 액션 처리 시스템 문서
- **stats-system.md**: 플레이어 스탯 시스템 문서

## 개발 환경 설정

### 필수 요구사항
- Node.js 18 이상
- npm 또는 yarn

### 설치 및 실행

```bash
# 저장소 클론
git clone [repository-url]
cd potato-gang

# 의존성 설치
npm install

# 개발 서버 실행
npm run dev

# 프로덕션 빌드
npm run build

# 빌드 결과 미리보기
npm run preview
```

### 개발 명령어

| 명령어 | 설명 |
|--------|------|
| `npm run dev` | 개발 서버 시작 (Hot Reload) |
| `npm run build` | TypeScript 컴파일 + Vite 빌드 |
| `npm run preview` | 빌드 결과 로컬 미리보기 |

## 게임 아키텍처

### 씬 시스템
Phaser의 씬 기반 상태 관리를 활용:

1. **BootScene** → 기본 설정 및 초기화
2. **PreloadScene** → 에셋 로딩
3. **MainMenuScene** → 메뉴 인터페이스
4. **GameScene** → 게임플레이

### 엔티티 시스템
- **Player 클래스**: Arcade Physics 스프라이트 기반
- **8방향 이동**: 대각선 이동 시 속도 보정
- **월드 바운드**: 화면 경계 충돌 처리

### 게임 설정 구조
```typescript
// gameConfig.ts 주요 설정
{
  type: Phaser.AUTO,           // 자동 렌더러 선택
  width: 1024, height: 1024,   // 정사각형 해상도
  pixelArt: true,              // 픽셀 퍼펙트
  physics: {
    default: 'arcade',         // Arcade Physics
    arcade: { gravity: { x: 0, y: 0 } }
  }
}
```

## 현재 구현 상태

### ✅ 완료된 기능
- [x] 기본 프로젝트 구조 설정
- [x] TypeScript + Vite 개발 환경
- [x] Phaser.js 게임 엔진 초기화
- [x] 씬 기반 상태 관리 시스템
- [x] 플레이어 8방향 이동 시스템
- [x] Arcade Physics 적용
- [x] 픽셀 퍼펙트 렌더링 설정
- [x] **NPC 대화 시스템** (YAML 기반)
  - [x] 충돌 감지 및 자동 대화 시작
  - [x] 스페이스 키 상호작용
  - [x] 선택지 기반 대화 트리
  - [x] 플레이어 스탯 변경 시스템
  - [x] 타이핑 효과 UI
  - [x] 대화 상태 저장/로드
  - [x] 조건부 대화 분기
  - [x] 글로벌 변수 관리
- [x] **NPC 관리 시스템**
  - [x] 다중 NPC 지원
  - [x] 샘플 NPC (상인, 경비병) 구현
- [x] **게임 저장/로드 시스템**
  - [x] 플레이어 상태 저장
  - [x] 대화 진행 상태 저장
  - [x] 글로벌 변수 지속성

### 🚧 개발 예정
- [ ] 우주복 캐릭터 스프라이트
- [ ] 우주 테마 배경 타일맵
- [ ] 인벤토리 시스템
- [ ] 퀘스트 시스템
- [ ] 전투 시스템
- [ ] 사운드 효과 및 BGM

### 🎮 대화 시스템 주요 특징
- **YAML 기반 대화 데이터**: 비개발자도 쉽게 편집 가능
- **충돌 기반 상호작용**: NPC와 충돌 시 자동 대화 시작
- **스페이스 키 진행**: 직관적인 대화 진행 방식
- **선택지 시스템**: 플레이어 선택에 따른 스탯 변경
- **조건부 대화**: 플레이어 상태에 따른 대화 분기
- **타이핑 효과**: 레트로 게임 느낌의 텍스트 애니메이션
- **저장 시스템**: 대화 진행 상태 자동 저장

## 배포

### Vercel 배포 가이드

1. **Vercel CLI 설치**
```bash
npm i -g vercel
```

2. **프로젝트 빌드**
```bash
npm run build
```

3. **Vercel 배포**
```bash
vercel --prod
```

### 배포 설정
- **Framework Preset**: Vite
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Install Command**: `npm install`

## 개발 가이드라인

### 코딩 컨벤션
- **TypeScript strict mode** 사용
- **ES6+ 모듈 시스템** 활용
- **클래스 기반 엔티티** 구조
- **씬별 책임 분리** 원칙

### 에셋 제공 가이드라인

#### Sprite 가이드라인
**파일 형식 및 기본 규격**
- **형식**: PNG (32bit, 투명도 지원)
- **픽셀아트**: 정수 배율로 제작 (1x, 2x, 4x)
- **기본 해상도**: 32x32 픽셀 (캐릭터 기준)
- **배경색**: 투명 (Alpha Channel 활용)

**스프라이트 시트 구조**
```
character_idle.png     # 대기 애니메이션 (4프레임)
character_walk.png     # 걷기 애니메이션 (8프레임)
character_run.png      # 달리기 애니메이션 (6프레임)
```

**애니메이션 프레임 규격**
- **프레임 크기**: 32x32 픽셀 (통일)
- **프레임 간격**: 0px (붙여서 배치)
- **배열**: 수평 방향 (left-to-right)
- **FPS**: 8-12 프레임 권장

**명명 규칙**
```
{category}_{name}_{state}.png
예시:
- character_player_idle.png
- enemy_robot_attack.png
- item_potion_sparkle.png
```

#### Tilemap 가이드라인
**타일 기본 규격**
- **타일 크기**: 32x32 픽셀 (표준)
- **타일셋 형식**: PNG (32bit)
- **그리드 정렬**: 픽셀 퍼펙트
- **여백**: 타일 간 0px 간격

**Tiled 에디터 설정**
```json
{
  "tilewidth": 32,
  "tileheight": 32,
  "type": "map",
  "orientation": "orthogonal",
  "renderorder": "right-down"
}
```

**타일맵 레이어 구조**
1. **Background** - 배경 타일 (우선순위: 0)
2. **Decoration** - 장식 요소 (우선순위: 1)
3. **Collision** - 충돌 영역 (우선순위: 2, 비가시)
4. **Objects** - 상호작용 객체 (우선순위: 3)

**파일 구조**
```
public/assets/tilemaps/
├── maps/              # Tiled JSON 파일
│   ├── level1.json
│   └── space_station.json
└── tilesets/          # 타일셋 이미지
    ├── space_floor.png
    └── space_walls.png
```

#### 파일 구조 및 명명 규칙
**디렉터리별 에셋 배치**
```
public/assets/
├── sprites/
│   ├── characters/    # 캐릭터 스프라이트
│   ├── enemies/       # 적 캐릭터
│   ├── items/         # 아이템, 오브젝트
│   └── effects/       # 이펙트, 파티클
├── tilemaps/
│   ├── maps/          # .json 맵 파일
│   └── tilesets/      # 타일셋 이미지
└── ui/
    ├── buttons/       # UI 버튼
    ├── panels/        # UI 패널
    └── icons/         # 아이콘
```

**Phaser.js 로딩 예시**
```typescript
// PreloadScene.ts에서 에셋 로딩
preload(): void {
  // 스프라이트 로딩
  this.load.spritesheet('player', 'assets/sprites/characters/player_idle.png', {
    frameWidth: 32,
    frameHeight: 32
  });
  
  // 타일맵 로딩
  this.load.tilemapTiledJSON('level1', 'assets/tilemaps/maps/level1.json');
  this.load.image('space_tiles', 'assets/tilemaps/tilesets/space_floor.png');
}
```

**최적화 가이드라인**
- **파일 크기**: 스프라이트 시트당 1MB 이하 권장
- **압축**: PNG-8 사용 (색상 제한이 없는 경우)
- **중복 제거**: 동일한 타일/스프라이트 재사용
- **로딩 순서**: 필수 에셋 우선 로딩

### 파일 구조 패턴
```typescript
// 엔티티 클래스 예시
export class EntityName {
  public sprite: Phaser.Physics.Arcade.Sprite;
  private scene: Phaser.Scene;
  
  constructor(scene: Phaser.Scene, x: number, y: number) {
    // 초기화 로직
  }
  
  update(): void {
    // 업데이트 로직
  }
}
```

### 씬 구조 패턴
```typescript
export class SceneName extends Phaser.Scene {
  constructor() {
    super({ key: 'SceneName' });
  }
  
  preload(): void { /* 에셋 로딩 */ }
  create(): void { /* 씬 초기화 */ }
  update(): void { /* 프레임별 업데이트 */ }
}
```

## 향후 개발 계획

### Phase 1: 기본 게임플레이 ✅
- ~~우주복 캐릭터 스프라이트 적용~~ (기본 스프라이트 적용됨)
- ~~우주 테마 배경 환경 구축~~ (기본 환경 구축됨)
- ~~기본적인 충돌 감지 시스템~~ (완료)

### Phase 2: 인터랙션 시스템 ✅
- ~~NPC 대화 시스템 구현~~ (완료)
- ~~선택지 기반 상호작용 메커니즘~~ (완료)
- ~~게임 진행 상태 관리~~ (완료)

### Phase 3: 게임 시스템 확장 🚧
- [ ] 인벤토리 시스템
- [ ] 퀘스트 시스템
- [x] 저장/로드 기능 (완료)

### Phase 4: 콘텐츠 확장 📋
- [ ] 추가 NPC 및 대화 트리
- [ ] 다양한 맵 및 지역
- [ ] 전투 시스템
- [ ] 아이템 및 장비 시스템
- [ ] 사운드 효과 및 배경음악 