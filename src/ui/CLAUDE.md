# UI 폴더 가이드

## 📁 폴더 개요
게임의 사용자 인터페이스 컴포넌트들을 관리하는 폴더입니다. 플레이어와 상호작용하는 모든 UI 요소들의 구현과 관리를 담당합니다.

## 📄 파일 구조

### `DialogueBox.ts`
**역할**: 대화 시스템의 시각적 인터페이스
**핵심 기능**:
- 대화 텍스트 표시 및 타이핑 효과
- NPC 이름 표시
- 선택지 버튼 생성 및 관리
- 대화 진행 상태 표시
- 키보드/마우스 입력 처리

## 🎨 DialogueBox 상세 분석

### UI 구성 요소
```typescript
export class DialogueBox {
  // 컨테이너 시스템
  private container: Phaser.GameObjects.Container;     // 전체 UI 컨테이너
  private background: Phaser.GameObjects.Rectangle;    // 대화박스 배경
  
  // 텍스트 요소들
  private nameText: Phaser.GameObjects.Text;          // NPC 이름
  private dialogueText: Phaser.GameObjects.Text;      // 대화 내용
  private choiceButtons: Phaser.GameObjects.Text[];   // 선택지 버튼들
  private continueIndicator: Phaser.GameObjects.Text; // 계속하기 표시
  
  // 상태 관리
  private isVisible: boolean = false;                 // 표시 여부
  private isTyping: boolean = false;                  // 타이핑 중 여부
  private typingTween?: Phaser.Tweens.Tween;         // 타이핑 애니메이션
}
```

### UI 레이아웃 설계
```typescript
// 대화박스 위치 및 크기 (constants.ts에서 정의)
const DIALOGUE_CONFIG = {
  BOX_WIDTH: 800,           // 박스 너비
  BOX_HEIGHT: 200,          // 박스 높이  
  BOX_Y: 600,              // Y 위치 (화면 하단)
  MARGIN: 20,              // 내부 여백
  CHOICE_MARGIN: 40        // 선택지 간격
};
```

### 렌더링 계층 구조
```
Depth 1000: DialogueBox Container
├── Background (검은색 반투명, 흰색 테두리)
├── NPC Name (왼쪽 상단, 굵은 글씨)
├── Dialogue Text (메인 텍스트, 타이핑 효과)
├── Choice Buttons (선택지들, 하이라이트 지원)
└── Continue Indicator (스페이스바 힌트, 깜빡임)
```

## ⚡ 타이핑 효과 시스템

### 타이핑 애니메이션
```typescript
private startTyping(text: string): void {
  this.fullText = text;
  this.isTyping = true;
  this.dialogueText.setText('');
  
  // 캐릭터 단위로 텍스트 표시
  this.typingTween = this.scene.tweens.addCounter({
    from: 0,
    to: text.length,
    duration: text.length * TYPING_SPEED, // 글자당 속도
    onUpdate: (tween) => {
      const progress = Math.floor(tween.getValue());
      this.dialogueText.setText(text.substring(0, progress));
    },
    onComplete: () => {
      this.isTyping = false;
      this.onTypingComplete?.();
      this.showContinueIndicator();
    }
  });
}
```

### 타이핑 스킵 기능
```typescript
// 스페이스바로 타이핑 완료
private skipTyping(): void {
  if (this.typingTween) {
    this.typingTween.complete();
    this.isTyping = false;
    this.dialogueText.setText(this.fullText);
  }
}
```

## 🎯 선택지 시스템

### 동적 선택지 생성
```typescript
private createChoiceButtons(choices: DialogueChoice[]): void {
  // 기존 선택지 정리
  this.clearChoices();
  
  choices.forEach((choice, index) => {
    const button = this.scene.add.text(
      GAME_WIDTH / 2 - DIALOGUE_CONFIG.BOX_WIDTH / 2 + 40,
      this.calculateChoiceY(index),
      `${index + 1}. ${choice.text}`,
      CHOICE_STYLE
    );
    
    // 상호작용 설정
    button.setInteractive();
    button.on('pointerover', () => this.highlightChoice(index));
    button.on('pointerout', () => this.unhighlightChoice(index));
    button.on('pointerdown', () => this.selectChoice(index));
    
    this.choiceButtons.push(button);
    this.container.add(button);
  });
}
```

### 키보드 선택지 제어
```typescript
private setupInputHandlers(): void {
  // 숫자키로 선택지 선택
  for (let i = 1; i <= 9; i++) {
    const key = this.scene.input.keyboard.addKey(`DIGIT${i}`);
    key.on('down', () => {
      if (this.isVisible && this.choiceButtons.length >= i) {
        this.selectChoice(i - 1);
      }
    });
  }
  
  // 스페이스바로 계속하기
  const spaceKey = this.scene.input.keyboard.addKey('SPACE');
  spaceKey.on('down', () => {
    if (this.isTyping) {
      this.skipTyping();
    } else if (this.canContinue()) {
      this.onChoiceSelected?.(-1); // 계속하기 신호
    }
  });
}
```

## 🎨 스타일링 시스템

### 텍스트 스타일 정의
```typescript
const DIALOGUE_STYLES = {
  // NPC 이름 스타일
  NAME_STYLE: {
    fontSize: '18px',
    fontFamily: 'Arial, sans-serif',
    color: '#ffff00',        // 노란색
    fontStyle: 'bold'
  },
  
  // 대화 텍스트 스타일
  TEXT_STYLE: {
    fontSize: '16px',
    fontFamily: 'Arial, sans-serif', 
    color: '#ffffff',        // 흰색
    wordWrap: { width: 750 }, // 자동 줄바꿈
    lineSpacing: 5
  },
  
  // 선택지 스타일
  CHOICE_STYLE: {
    fontSize: '14px',
    fontFamily: 'Arial, sans-serif',
    color: '#cccccc',        // 회색
    backgroundColor: '#333333' // 어두운 배경
  }
};
```

### 하이라이트 효과
```typescript
private highlightChoice(index: number): void {
  const button = this.choiceButtons[index];
  if (button) {
    button.setColor('#ffff00');      // 노란색으로 변경
    button.setScale(1.1);            // 약간 확대
    button.setBackgroundColor('#444444'); // 배경 밝게
  }
}

private unhighlightChoice(index: number): void {
  const button = this.choiceButtons[index];
  if (button) {
    button.setColor('#cccccc');      // 원래 색으로
    button.setScale(1.0);            // 원래 크기로
    button.setBackgroundColor('#333333'); // 원래 배경으로
  }
}
```

## 📱 반응형 지원

### 해상도 대응
```typescript
private updateLayout(): void {
  const screenWidth = this.scene.cameras.main.width;
  const screenHeight = this.scene.cameras.main.height;
  
  // 화면 크기에 따라 박스 크기 조정
  const boxWidth = Math.min(800, screenWidth * 0.9);
  const boxHeight = Math.min(200, screenHeight * 0.25);
  
  this.background.setSize(boxWidth, boxHeight);
  this.repositionElements(boxWidth, boxHeight);
}
```

### 스크롤 팩터 설정
```typescript
private createUI(): void {
  // UI는 카메라 이동에 영향받지 않음
  this.container.setScrollFactor(0);
  
  // 항상 화면 최상위에 표시
  this.container.setDepth(1000);
}
```

## 🔄 상태 관리

### 대화 상태 전환
```typescript
// 대화 시작
public show(npcName: string): void {
  this.isVisible = true;
  this.container.setVisible(true);
  this.nameText.setText(npcName);
  
  // 페이드인 효과
  this.container.setAlpha(0);
  this.scene.tweens.add({
    targets: this.container,
    alpha: 1,
    duration: 300,
    ease: 'Power2'
  });
}

// 대화 종료
public hide(): void {
  this.isVisible = false;
  
  // 페이드아웃 효과
  this.scene.tweens.add({
    targets: this.container,
    alpha: 0,
    duration: 300,
    ease: 'Power2',
    onComplete: () => {
      this.container.setVisible(false);
      this.cleanup();
    }
  });
}
```

### 메모리 정리
```typescript
private cleanup(): void {
  // 타이핑 애니메이션 정리
  if (this.typingTween) {
    this.typingTween.destroy();
    this.typingTween = undefined;
  }
  
  // 선택지 버튼들 정리
  this.clearChoices();
  
  // 텍스트 초기화
  this.dialogueText.setText('');
  this.nameText.setText('');
}
```

## 🛠️ 확장 가이드

### 새로운 UI 컴포넌트 추가
```typescript
// 기본 UI 컴포넌트 클래스
export abstract class UIComponent {
  protected scene: Phaser.Scene;
  protected container: Phaser.GameObjects.Container;
  protected isVisible: boolean = false;
  
  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.createContainer();
  }
  
  protected abstract createContainer(): void;
  public abstract show(): void;
  public abstract hide(): void;
  public abstract destroy(): void;
}

// 사용 예: 인벤토리 UI
export class InventoryUI extends UIComponent {
  private items: Phaser.GameObjects.Text[] = [];
  
  protected createContainer(): void {
    this.container = this.scene.add.container(0, 0);
    // UI 구성 로직
  }
}
```

### 고급 애니메이션 효과
```typescript
// 대화박스 등장 애니메이션
private showWithAnimation(): void {
  this.container.setPosition(0, 100); // 아래에서 시작
  this.container.setAlpha(0);
  
  this.scene.tweens.add({
    targets: this.container,
    y: 0,
    alpha: 1,
    duration: 500,
    ease: 'Back.easeOut'
  });
}

// 선택지 순차 등장
private animateChoices(): void {
  this.choiceButtons.forEach((button, index) => {
    button.setAlpha(0);
    button.setX(button.x - 50);
    
    this.scene.tweens.add({
      targets: button,
      x: button.x + 50,
      alpha: 1,
      duration: 300,
      delay: index * 100, // 순차적 딜레이
      ease: 'Power2'
    });
  });
}
```

## 🎯 접근성 고려사항

### 키보드 내비게이션
- **Tab 키**: 선택지 간 이동
- **Enter 키**: 선택지 확정
- **Escape 키**: 대화 취소
- **숫자 키**: 직접 선택지 선택

### 시각적 피드백
- **색상 대비**: 텍스트와 배경 간 충분한 대비
- **폰트 크기**: 가독성을 위한 적절한 크기
- **애니메이션**: 과도하지 않은 부드러운 효과

## ⚠️ 주의사항

### 성능 최적화
- **텍스처 재사용**: 배경, 버튼 등 공통 요소 재사용
- **메모리 정리**: 사용 후 적절한 리소스 해제
- **애니메이션 관리**: 불필요한 애니메이션 중복 방지

### 일관성 유지
- **스타일 통일**: 모든 UI 요소에 일관된 스타일 적용
- **상호작용 패턴**: 동일한 방식의 사용자 입력 처리
- **피드백 일관성**: 유사한 상황에 동일한 피드백 제공

## 🔗 연관 시스템

### 직접 연동
- **systems/DialogueManager**: 대화 로직과 직접 연결
- **scenes/GameScene**: UI 생성 및 관리
- **utils/constants**: UI 설정값 참조

### 간접 연동
- **types/GameData**: 대화 데이터 타입 사용
- **entities/NPC**: NPC 상호작용 시 UI 활성화
- **systems/SaveManager**: UI 상태 저장/복원