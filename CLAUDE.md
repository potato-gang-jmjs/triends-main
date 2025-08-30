# 원칙

- 과도한 폴백 로직으로 의도치 않은 오류를 만들지 않습니다. 빠른 에러와 빠른 수정을 선호합니다
- 타입 안정성을 중시합니다

# Triends Project Structure

## 개요
Phaser.js 기반의 탑뷰 RPG 게임 프로젝트입니다. TypeScript와 Vite를 사용하여 개발되었으며, 픽셀아트 스타일의 우주 테마 게임입니다.

## 기술 스택
- **게임 엔진**: Phaser.js 3.90.0
- **언어**: TypeScript 5.8.3
- **빌드 도구**: Vite 7.0.4
- **물리 엔진**: Arcade Physics

## 프로젝트 폴더 구조

### 📁 `/` (루트)
- `index.html` - HTML 진입점
- `package.json` - 프로젝트 의존성 및 스크립트
- `tsconfig.json` - TypeScript 컴파일러 설정
- `vite.config.ts` - Vite 빌드 도구 설정
- `project-requirements.md` - 프로젝트 요구사항 문서

### 📁 `src/` - 소스 코드
게임의 모든 TypeScript 소스 코드가 위치합니다.

#### 📁 `src/config/`
- `gameConfig.ts` - Phaser 게임 엔진 설정 (해상도, 물리엔진, 렌더링 설정)

#### 📁 `src/data/`
- `NPCDefinitions.ts` - NPC 정의 및 데이터

#### 📁 `src/entities/` - 게임 엔티티
- `Player.ts` - 1P 플레이어 클래스 (우주인, WASD 조작)
- `GinsengPlayer.ts` - 2P 플레이어 클래스 (인삼, 방향키 조작)
- `NPC.ts` - NPC 엔티티 클래스

#### 📁 `src/entities/objects/` - 월드 오브젝트
- `WorldObject.ts` - 기본 월드 오브젝트 클래스
- `InteractiveObject.ts` - 상호작용 가능한 오브젝트
- `MovableObject.ts` - 이동 가능한 오브젝트
- `BlockerObject.ts` - 블로킹 오브젝트
- `HazardObject.ts` - 위험 요소 오브젝트

#### 📁 `src/scenes/` - 게임 씬
- `BootScene.ts` - 게임 부팅 및 초기화 씬
- `PreloadScene.ts` - 에셋 로딩 씬
- `MainMenuScene.ts` - 메인 메뉴 씬
- `GameScene.ts` - 메인 게임플레이 씬 (1P/2P 동시 조작)

#### 📁 `src/systems/` - 게임 시스템
핵심 게임 로직을 관리하는 시스템들:
- `ActionProcessor.ts` - 액션 처리 시스템 (teleport, teleport_tag 지원)
- `ConditionEvaluator.ts` - 조건 평가 시스템
- `DialogueLoader.ts` - YAML 대화 데이터 로더
- `DialogueManager.ts` - 대화 시스템 관리
- `GlobalVariableManager.ts` - 글로벌 변수 관리
- `MapCollisionManager.ts` - 맵 충돌 관리
- `MapLoader.ts` - 맵 데이터 로더
- `MapManager.ts` - 맵 시스템 관리
- `MapRenderer.ts` - 맵 렌더링
- `MirrorSystem.ts` - 거울 능력 시스템
- `NPCManager.ts` - NPC 관리 시스템
- `ObjectManager.ts` - 오브젝트 관리
- `PortalManager.ts` - 포털 시스템
- `SaveManager.ts` - 저장/로드 시스템
- `VineExtensionSystem.ts` - 덩굴 확장 시스템
- `WateringCanSystem.ts` - 물뿌리개 시스템

#### 📁 `src/types/` - 타입 정의
- `GameData.ts` - 게임 데이터 타입 정의
- `MapTypes.ts` - 맵 관련 타입 정의
- `ObjectTypes.ts` - 오브젝트 타입 정의
- `global.d.ts` - 전역 타입 선언

#### 📁 `src/ui/` - 사용자 인터페이스
- `DialogueBox.ts` - 대화 박스 UI 컴포넌트

#### 📁 `src/utils/` - 유틸리티
- `constants.ts` - 게임 내 상수 정의

### 📁 `public/` - 정적 에셋
웹에서 직접 접근 가능한 정적 파일들입니다.

#### 📁 `public/assets/` - 게임 에셋

##### 📁 `public/assets/characters/`
캐릭터 스프라이트 시트:
- `astronaut_*.png` - 우주인 캐릭터 애니메이션 (걷기, 거울, 물뿌리개)
- `ginseng_walking.png` - 인삼 캐릭터 걷기 애니메이션

##### 📁 `public/assets/dialogues/`
YAML 형식의 대화 데이터:
- `guard.yaml` - 경비병 대화
- `merchant.yaml` - 상인 대화
- `villager.yaml` - 마을주민 대화

##### 📁 `public/assets/gimmicks/`
게임 기믹 스프라이트:
- `sunflower.png` - 해바라기
- `sunflower_laser.png` - 해바라기 레이저
- `thunder6.png` - 번개 효과
- `vine.png` - 덩굴

##### 📁 `public/assets/maps/`
맵별 데이터와 에셋:

###### 📁 `public/assets/maps/forest/`
숲 맵 관련:
- `map.json` - 맵 데이터
- `npcs.json` - NPC 배치 정보
- `portals.json` - 포털 정보
- `spritesheet.png` - 숲맵 전용 타일 스프라이트시트

###### 📁 `public/assets/maps/main/`
메인 맵 관련:
- `layers.json` - 레이어 정보
- `map.json`, `map[2].json` - 맵 데이터
- `npcs.json` - NPC 배치 정보
- `objects.json` - 오브젝트 배치 정보
- `portals.json` - 포털 정보
- `spritesheet.png`, `spritesheet[2].png` - 메인맵 전용 타일 스프라이트시트

##### 📁 `public/assets/objects/`
월드 오브젝트 에셋 (현재 비어있음)

### 📁 `docs/` - 프로젝트 문서
시스템별 상세 문서:
- `README.md` - 문서 개요
- `abillity-system.md` - 능력 시스템 가이드
- `action-system.md` - 액션 시스템 가이드
- `dialogue-system.md` - 대화 시스템 가이드
- `ginseng-sunflower-mode.md` - 인삼-해바라기 모드 문서
- `map-links.md` - 맵 연결 시스템
- `map-system.md` - 맵 시스템 가이드
- `movement-system.md` - 이동/컨트롤 시스템
- `object-system.md` - 오브젝트 시스템
- `portal-system.md` - 포털 시스템
- `stats-system.md` - 스탯 시스템
- `watering-can-system.md` - 물뿌리개 시스템

### 📁 `dist/` - 빌드 결과물
Vite 빌드 시 생성되는 배포용 파일들

### 📁 `node_modules/` - 의존성 패키지
npm으로 설치된 패키지들

## 개발 명령어
- `npm run dev` - 개발 서버 시작 (Hot Reload)
- `npm run build` - TypeScript 컴파일 + Vite 빌드
- `npm run preview` - 빌드 결과 미리보기

## 게임 특징
- **1P/2P 동시 플레이**: WASD vs 방향키
- **8방향 이동**: 대각선 이동 지원
- **픽셀 퍼펙트 렌더링**: 레트로 감성
- **모듈화된 시스템 구조**: 각 기능별 독립적 관리
- **YAML 기반 대화 시스템**: 비개발자도 쉽게 편집 가능
- **포털 기반 맵 이동**: seamless 맵 전환
- **능력 시스템**: 거울, 물뿌리개 등 다양한 능력