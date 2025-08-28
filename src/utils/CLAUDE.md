# Utils 폴더 가이드

## 📁 폴더 개요
프로젝트 전반에서 사용되는 유틸리티 함수, 상수, 헬퍼 클래스들을 관리하는 폴더입니다. 코드의 재사용성과 일관성을 높이기 위한 공통 기능들을 제공합니다.

## 📄 파일 구조

### `constants.ts`
**역할**: 프로젝트 전체에서 사용되는 상수값들의 중앙 집중 관리
**핵심 기능**:
- 게임 설정 상수 (해상도, 속도, 크기)
- 시스템별 설정값 (대화, UI, 입력)
- 에셋 키 및 씬 키 관리
- 타입 안전한 상수 정의

## 🎯 Constants.ts 상세 분석

### 게임 기본 설정
```typescript
// 게임 해상도 (Spritefusion 64px 타일 기준)
export const GAME_WIDTH = 1280;   // 64 * 20 = 20타일 가로
export const GAME_HEIGHT = 1024;  // 64 * 16 = 16타일 세로

// 플레이어 이동 설정
export const PLAYER_SPEED = 200;           // 기본 이동 속도 (픽셀/초)
export const PLAYER_DIAGONAL_SPEED = 141;  // 대각선 이동 속도 (√2로 보정)
```

### 씬 관리 시스템
```typescript
export const SCENES = {
  BOOT: 'BootScene',          // 초기화 씬
  PRELOAD: 'PreloadScene',    // 에셋 로딩 씬  
  MAIN_MENU: 'MainMenuScene', // 메인 메뉴 씬
  GAME: 'GameScene'           // 게임플레이 씬
} as const;

// 타입 안전성 보장
type SceneKey = typeof SCENES[keyof typeof SCENES];
```

### 에셋 키 관리
```typescript
export const ASSETS = {
  PLAYER: 'player',           // 플레이어 스프라이트
  BACKGROUND: 'background',   // 배경 이미지
  TILEMAP: 'tilemap'          // 타일맵 데이터
} as const;

// 사용 시 자동완성과 타입 체크 지원
this.load.image(ASSETS.PLAYER, 'path/to/player.png');
```

### 대화 시스템 설정
```typescript
export const DIALOGUE_CONFIG = {
  BOX_WIDTH: 800,              // 대화박스 너비
  BOX_HEIGHT: 150,             // 대화박스 높이
  BOX_Y: GAME_HEIGHT - 300,    // Y 위치 (선택지 공간 확보)
  TEXT_SPEED: 30,              // 타이핑 속도 (ms당 글자 수)
  INTERACTION_RADIUS: 50,      // 상호작용 반경
  CHOICE_BUTTON_HEIGHT: 40,    // 선택지 버튼 높이
  CHOICE_BUTTON_MARGIN: 10     // 선택지 간격
} as const;
```

### 입력 시스템 설정
```typescript
export const INPUT_KEYS = {
  INTERACT: 'SPACE',          // 상호작용 키
  ESCAPE: 'ESC'               // 취소/뒤로가기 키
} as const;

export const NPC_TYPES = {
  MERCHANT: 'merchant',       // 상인 NPC
  GUARD: 'guard',            // 경비병 NPC
  VILLAGER: 'villager'       // 마을주민 NPC
} as const;
```

## 🔧 상수 사용 패턴

### 타입 안전한 상수 정의
```typescript
// as const를 사용하여 리터럴 타입 보장
export const COLORS = {
  PRIMARY: '#ff6b35',
  SECONDARY: '#004e89',
  SUCCESS: '#009b00',
  DANGER: '#ff0000'
} as const;

// 타입 추출
type ColorKey = keyof typeof COLORS;        // 'PRIMARY' | 'SECONDARY' | ...
type ColorValue = typeof COLORS[ColorKey]; // '#ff6b35' | '#004e89' | ...
```

### 계산된 상수
```typescript
// 기본값을 기반으로 계산된 상수들
export const UI_CONFIG = {
  MARGIN: 20,
  PADDING: 10,
  // 계산된 값들
  CONTENT_WIDTH: GAME_WIDTH - (2 * 20),      // GAME_WIDTH - (2 * MARGIN)
  DIALOG_Y: GAME_HEIGHT * 0.7,               // 화면의 70% 지점
  BUTTON_WIDTH: (800 - 40) / 3               // 3개 버튼을 균등 분할
} as const;
```

### 중첩된 설정 구조
```typescript
export const SYSTEM_CONFIG = {
  PHYSICS: {
    GRAVITY: { x: 0, y: 0 },
    DEBUG: false,
    WORLD_BOUNDS: {
      width: GAME_WIDTH,
      height: GAME_HEIGHT
    }
  },
  AUDIO: {
    MASTER_VOLUME: 1.0,
    SFX_VOLUME: 0.8,
    MUSIC_VOLUME: 0.6
  },
  GRAPHICS: {
    PIXEL_ART: true,
    ANTIALIAS: false,
    RESOLUTION: 1
  }
} as const;
```

## 🛠️ 유틸리티 함수 확장

### 수학 유틸리티
```typescript
// math.ts (확장 예제)
export const MathUtils = {
  // 각도 변환
  degToRad: (degrees: number): number => degrees * Math.PI / 180,
  radToDeg: (radians: number): number => radians * 180 / Math.PI,
  
  // 거리 계산
  distance: (x1: number, y1: number, x2: number, y2: number): number => {
    return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
  },
  
  // 범위 제한
  clamp: (value: number, min: number, max: number): number => {
    return Math.max(min, Math.min(max, value));
  },
  
  // 선형 보간
  lerp: (start: number, end: number, factor: number): number => {
    return start + (end - start) * factor;
  }
} as const;
```

### 문자열 유틸리티
```typescript
// string.ts (확장 예제)  
export const StringUtils = {
  // 카멜케이스 변환
  toCamelCase: (str: string): string => {
    return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
  },
  
  // 스네이크케이스 변환
  toSnakeCase: (str: string): string => {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  },
  
  // 문자열 자르기 (말줄임)
  truncate: (str: string, length: number, suffix = '...'): string => {
    return str.length > length ? str.slice(0, length) + suffix : str;
  }
} as const;
```

### 게임 특화 유틸리티
```typescript
// game.ts (확장 예제)
export const GameUtils = {
  // 타일 좌표 변환
  tileToWorld: (tileX: number, tileY: number, tileSize = 64) => ({
    x: tileX * tileSize + tileSize / 2,
    y: tileY * tileSize + tileSize / 2
  }),
  
  worldToTile: (worldX: number, worldY: number, tileSize = 64) => ({
    x: Math.floor(worldX / tileSize),
    y: Math.floor(worldY / tileSize)
  }),
  
  // 방향 계산
  getDirection: (dx: number, dy: number): 'up' | 'down' | 'left' | 'right' => {
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);
    
    if (absDx > absDy) {
      return dx > 0 ? 'right' : 'left';
    } else {
      return dy > 0 ? 'down' : 'up';
    }
  },
  
  // 화면 경계 체크
  isInBounds: (x: number, y: number, margin = 0) => {
    return x >= margin && 
           x <= GAME_WIDTH - margin && 
           y >= margin && 
           y <= GAME_HEIGHT - margin;
  }
} as const;
```

## 📊 설정 관리 시스템

### 환경별 설정
```typescript
// config.ts (확장 예제)
const isDevelopment = process.env.NODE_ENV === 'development';

export const CONFIG = {
  // 개발/배포 환경에 따른 설정
  DEBUG: {
    ENABLED: isDevelopment,
    SHOW_FPS: isDevelopment,
    SHOW_PHYSICS: isDevelopment,
    VERBOSE_LOGGING: isDevelopment
  },
  
  // 성능 설정
  PERFORMANCE: {
    MAX_PARTICLES: isDevelopment ? 100 : 50,
    SHADOW_QUALITY: isDevelopment ? 'high' : 'medium',
    AUDIO_CHANNELS: 32
  },
  
  // API 설정
  API: {
    BASE_URL: isDevelopment ? 'http://localhost:3000' : 'https://api.game.com',
    TIMEOUT: 5000,
    RETRY_COUNT: 3
  }
} as const;
```

### 지역화 상수
```typescript
// localization.ts (확장 예제)
export const LOCALE = {
  DEFAULT_LANGUAGE: 'ko',
  SUPPORTED_LANGUAGES: ['ko', 'en', 'ja'] as const,
  
  // 다국어 문자열
  STRINGS: {
    ko: {
      GAME_TITLE: '포테이토 갱',
      START_GAME: '게임 시작',
      SETTINGS: '설정',
      EXIT: '종료'
    },
    en: {
      GAME_TITLE: 'Potato Gang',
      START_GAME: 'Start Game', 
      SETTINGS: 'Settings',
      EXIT: 'Exit'
    }
  }
} as const;
```

## 🚀 성능 최적화

### 상수 최적화
```typescript
// 자주 사용되는 계산값들을 미리 계산
export const PRECOMPUTED = {
  PI_2: Math.PI / 2,
  PI_4: Math.PI / 4,
  SQRT_2: Math.sqrt(2),
  
  // 타일 크기 관련 미리 계산
  TILE_SIZE: 64,
  HALF_TILE: 32,
  DOUBLE_TILE: 128,
  
  // 자주 사용되는 각도들 (라디안)
  ANGLES: {
    UP: -Math.PI / 2,
    DOWN: Math.PI / 2,
    LEFT: Math.PI,
    RIGHT: 0
  }
} as const;
```

### 메모리 효율성
```typescript
// 불변 객체로 메모리 사용량 최적화
export const IMMUTABLE_CONFIGS = Object.freeze({
  COLORS: Object.freeze({
    PRIMARY: '#ff6b35',
    SECONDARY: '#004e89'
  }),
  
  SIZES: Object.freeze({
    SMALL: 16,
    MEDIUM: 32,
    LARGE: 64
  })
});
```

## ⚠️ 주의사항

### 네이밍 규칙
- **상수명**: `SCREAMING_SNAKE_CASE` 사용
- **객체 그룹**: `PascalCase` + `_CONFIG` 패턴
- **의미있는 이름**: 줄임말보다는 명확한 단어 사용

### 타입 안전성
```typescript
// ✅ 좋은 예: 타입 안전한 상수
export const VALID_DIRECTIONS = ['up', 'down', 'left', 'right'] as const;
type Direction = typeof VALID_DIRECTIONS[number];

// ❌ 나쁜 예: 타입 안전하지 않음
export const INVALID_DIRECTIONS = ['up', 'down', 'left', 'right'];
```

### 순환 참조 방지
```typescript
// ❌ 순환 참조 위험
// constants.ts에서 game.ts를 import하고
// game.ts에서 constants.ts를 import하는 상황 방지

// ✅ 의존성 방향을 명확히 하기
// constants.ts -> 기본 상수만
// config.ts -> constants.ts 참조
// utils.ts -> constants.ts, config.ts 참조
```

## 🔗 연관 시스템

### 직접 사용
- **모든 소스 파일**: 상수값 참조
- **config/gameConfig.ts**: 게임 엔진 설정에 상수 활용
- **ui/**: UI 레이아웃에 크기/위치 상수 사용

### 간접 영향
- **빌드 시스템**: 환경 변수 기반 조건부 컴파일
- **테스트**: 테스트 환경별 설정 분리
- **배포**: 배포 환경에 맞는 상수 적용

각 상수는 한 곳에서만 정의하고 전체 프로젝트에서 참조하여 일관성과 유지보수성을 보장합니다.