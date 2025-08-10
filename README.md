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
│   │   ├── Player.ts      # 플레이어 클래스 (1P)
│   │   ├── GinsengPlayer.ts # 플레이어 클래스 (2P)
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
│   │   ├── ActionProcessor.ts      # 액션 처리 시스템 (teleport/teleport_tag 지원)
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
│       ├── characters/    # 캐릭터 시트
│       └── dialogues/     # 대화 데이터 (YAML)
├── docs/                  # 프로젝트 문서
│   ├── README.md          # 문서 개요
│   ├── dialogue-system.md # 대화 시스템 가이드
│   ├── action-system.md   # 액션 시스템 가이드
│   ├── stats-system.md    # 스탯 시스템 가이드
│   └── movement-system.md # 이동/컨트롤 시스템 (1P/2P + 태그 이동)
├── index.html             # HTML 진입점
├── package.json           # 프로젝트 설정
├── tsconfig.json          # TypeScript 설정
├── vite.config.ts         # Vite 설정
└── project-requirements.md # 프로젝트 요구사항
```

### 디렉터리 설명

#### `src/entities/`
- **Player.ts**: 1P 캐릭터 (우주인 시트, WASD)
- **GinsengPlayer.ts**: 2P 캐릭터 (인삼 시트, 방향키)
- **NPC.ts**: NPC 엔티티 클래스 (충돌 감지, 대화 시작)

#### `src/scenes/`
- **GameScene.ts**: 1P/2P 동시 업데이트, 대화 중 이동 정지/키 리셋

#### `docs/`
- **movement-system.md**: 1P/2P 컨트롤 및 태그 이동 문서

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
- **1P/2P 이동**: 1P는 WASD, 2P는 방향키
- **8방향 이동**: 대각선 이동 시 속도 보정
- **대화 중 정지**: 두 플레이어 속도 0, 입력키 리셋
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
- [x] 1P/2P 동시 조작 (WASD / 방향키)
- [x] 대화 중 이동 정지 및 입력키 리셋
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