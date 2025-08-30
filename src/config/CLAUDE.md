# Config 폴더 가이드

## 📁 폴더 개요
게임의 핵심 설정 파일들을 관리하는 폴더입니다. Phaser.js 게임 엔진의 초기화와 전역 설정을 담당합니다.

## 📄 파일 구조

### `gameConfig.ts`
**역할**: Phaser.js 게임 엔진의 메인 설정 파일
**핵심 기능**:
- 게임 해상도 및 스케일링 설정
- 물리 엔진 (Arcade Physics) 초기화
- 씬 로딩 순서 정의
- 픽셀아트 렌더링 설정

## 🔧 주요 설정

### 게임 해상도
```typescript
width: GAME_WIDTH,   // utils/constants.ts에서 가져옴
height: GAME_HEIGHT, // 기본적으로 정사각형 해상도 사용
```

### 픽셀아트 설정
```typescript
pixelArt: true,  // 픽셀 퍼펙트 렌더링 활성화
```

### 물리 엔진
```typescript
physics: {
  default: 'arcade',
  arcade: {
    gravity: { x: 0, y: 0 },  // 탑뷰 게임이므로 중력 없음
    debug: false              // 배포 시 false로 설정
  }
}
```

### 씬 로딩 순서
1. **BootScene** - 초기화 및 기본 설정
2. **PreloadScene** - 에셋 로딩
3. **MainMenuScene** - 메인 메뉴
4. **GameScene** - 게임플레이

### 스케일링
```typescript
scale: {
  mode: Phaser.Scale.FIT,           // 화면에 맞게 조정
  autoCenter: Phaser.Scale.CENTER_BOTH  // 자동 중앙 정렬
}
```

## 🛠️ 설정 변경 가이드

### 해상도 변경
1. `src/utils/constants.ts`에서 `GAME_WIDTH`, `GAME_HEIGHT` 수정
2. 타일 크기와의 비율 고려 필요

### 물리 엔진 디버그 모드
```typescript
arcade: {
  debug: true  // 충돌체 시각화 활성화
}
```

### 새로운 씬 추가
```typescript
scene: [BootScene, PreloadScene, MainMenuScene, GameScene, NewScene]
```

## 🎮 게임 특성

### 픽셀 퍼펙트 렌더링
- 레트로 게임 스타일 구현
- 스프라이트 스무딩 비활성화
- 정수 단위 위치 계산 필요

### 탑뷰 설정
- 중력 없는 2D 물리 환경
- 8방향 이동 지원
- Z축 깊이는 depth로 관리

## 🚀 최적화 팁

### 성능 향상
- `debug: false`로 설정하여 배포
- 불필요한 씬 제거
- 적절한 해상도 선택

### 반응형 지원
- `Phaser.Scale.FIT` 모드로 다양한 화면 크기 지원
- 자동 중앙 정렬로 일관된 사용자 경험

## ⚠️ 주의사항

### 설정 변경 시 고려사항
- 해상도 변경 시 UI 요소 위치 재조정 필요
- 타일맵과 스프라이트 크기 일관성 유지
- 씬 로딩 순서 변경 시 의존성 확인

### 호환성
- 모든 설정은 Phaser.js 3.90.0 기준
- 물리 엔진 변경 시 엔티티 코드 수정 필요