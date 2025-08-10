import Phaser from 'phaser';
import { SCENES, GAME_WIDTH, GAME_HEIGHT } from '../utils/constants';

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super({ key: SCENES.PRELOAD });
  }

  preload(): void {
    // 로딩 화면 표시
    const loadingText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 40, 'Loading...', {
      fontSize: '28px',
      color: '#ffffff'
    }).setOrigin(0.5);

    const barWidth = 600;
    const barHeight = 24;
    const barX = (GAME_WIDTH - barWidth) / 2;
    const barY = GAME_HEIGHT / 2;
    this.add.rectangle(barX + barWidth / 2, barY, barWidth, barHeight, 0x333333).setOrigin(0.5);
    const progressBar = this.add.rectangle(barX, barY, 0, barHeight, 0x88cc88).setOrigin(0, 0.5);
    const percentText = this.add.text(GAME_WIDTH / 2, barY + 40, '0%', { fontSize: '20px', color: '#cccccc' }).setOrigin(0.5);

    this.load.on('progress', (value: number) => {
      progressBar.width = barWidth * value;
      percentText.setText(`${Math.round(value * 100)}%`);
    });
    this.load.on('complete', () => {
      loadingText.setText('Complete');
    });

    // 임시 텍스처 생성 (실제 에셋 대신 사용)
    this.add.graphics()
      .fillStyle(0xff0000)
      .fillRect(0, 0, 32, 32)
      .generateTexture('red', 32, 32);

    this.add.graphics()
      .fillStyle(0x0000ff)
      .fillRect(0, 0, 32, 32)
      .generateTexture('blue', 32, 32);

    this.add.graphics()
      .fillStyle(0x00ff00)
      .fillRect(0, 0, 32, 32)
      .generateTexture('green', 32, 32);

    this.add.graphics()
      .fillStyle(0xffff00)
      .fillRect(0, 0, 32, 32)
      .generateTexture('yellow', 32, 32);

    // NPC 스프라이트들
    this.add.graphics()
      .fillStyle(0x0080ff)
      .fillRect(0, 0, 32, 32)
      .generateTexture('npc', 32, 32);

    this.add.graphics()
      .fillStyle(0x8000ff)
      .fillRect(0, 0, 32, 32)
      .generateTexture('merchant', 32, 32);

    this.add.graphics()
      .fillStyle(0xff8000)
      .fillRect(0, 0, 32, 32)
      .generateTexture('guard', 32, 32);

    // 배경 (현재 화면 크기에 맞춰 생성)
    this.add.graphics()
      .fillGradientStyle(0x87ceeb, 0x87ceeb, 0x98fb98, 0x98fb98)
      .fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT)
      .generateTexture('sky', GAME_WIDTH, GAME_HEIGHT);

    // ───── 맵/타일 에셋 로드 (Spritefusion: 64px 타일 가정) ─────
    this.load.spritesheet('tiles', 'assets/spritesheet/spritesheet.png', {
      frameWidth: 64,
      frameHeight: 64
    });
    // 맵을 map별 폴더 구조로 관리 (예: assets/maps/main/map.json)
    this.load.json('map:main', 'assets/maps/main/map.json');
  }

  create(): void {
    // 메인 메뉴로 이동 (로딩 완료 후 약간의 페이드)
    this.cameras.main.fadeIn(200, 0, 0, 0);
    this.time.delayedCall(200, () => this.scene.start(SCENES.MAIN_MENU));
  }
} 