import Phaser from 'phaser';
import { SCENES, GAME_WIDTH, GAME_HEIGHT } from '../utils/constants';

export class MainMenuScene extends Phaser.Scene {
  constructor() {
    super({ key: SCENES.MAIN_MENU });
  }

  create(): void {
    // 배경
    const bg = this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'sky');
    bg.setDisplaySize(GAME_WIDTH, GAME_HEIGHT);
    
    // 타이틀
    const titleText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 3, 'POTATO GANG', {
      fontSize: '64px',
      fontFamily: 'monospace',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 8
    });
    titleText.setOrigin(0.5);
    
    // 부제목
    const subtitleText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 3 + 80, 'A Space Adventure', {
      fontSize: '24px',
      fontFamily: 'monospace',
      color: '#aaaaaa'
    });
    subtitleText.setOrigin(0.5);
    
    // 시작 버튼
    const startButton = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 100, 'START GAME', {
      fontSize: '32px',
      fontFamily: 'monospace',
      color: '#ffffff',
      backgroundColor: '#333333',
      padding: { x: 20, y: 10 }
    });
    startButton.setOrigin(0.5);
    startButton.setInteractive({ useHandCursor: true });
    
    // 버튼 호버 효과
    startButton.on('pointerover', () => {
      startButton.setStyle({ backgroundColor: '#555555' });
    });
    
    startButton.on('pointerout', () => {
      startButton.setStyle({ backgroundColor: '#333333' });
    });
    
    // 버튼 클릭
    startButton.on('pointerdown', () => {
      this.scene.start(SCENES.GAME);
    });
    
    // 크레딧
    const creditText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 50, 'Made with Phaser 3', {
      fontSize: '16px',
      fontFamily: 'monospace',
      color: '#666666'
    });
    creditText.setOrigin(0.5);
  }
} 