# Project Requirements - Potato Gang

## Core Features
- 탑뷰 RPG 게임
- 우주 테마 픽셀아트 스타일
- NPC 대화 시스템 (추후 구현)
- 선택지 기반 상호작용 (추후 구현)

## Technical Specifications
- **Framework**: Phaser.js 3.90.0
- **Language**: TypeScript
- **Bundler**: Vite
- **Resolution**: 1024x1024 pixels
- **View**: 90도 탑뷰 (정확히 위에서 내려다보는 시점)
- **Art Style**: 2D 픽셀아트
- **Physics**: Arcade Physics
- **Rendering**: Pixel Perfect (pixelArt: true)

## Player Character
- 우주복을 입은 캐릭터
- 8방향 이동 가능
- 픽셀아트 스프라이트

## Assets
- Phaser 공식 예제 에셋 사용
- 우주 테마 배경
- 픽셀아트 스타일 유지

## Development Standards
- TypeScript strict mode
- 모듈화된 코드 구조
- 씬 기반 게임 상태 관리
- 재사용 가능한 엔티티 시스템

## Project Structure
```
potato-gang/
├── src/           # 소스 코드
├── public/        # 정적 에셋
├── index.html     # 메인 HTML
└── 설정 파일들
``` 