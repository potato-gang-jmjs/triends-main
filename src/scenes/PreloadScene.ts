import Phaser from 'phaser';
import { SCENES } from '../utils/constants';

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super({ key: SCENES.PRELOAD });
  }

  preload(): void {
    // 로딩 화면 표시
    this.add.text(512, 384, 'Loading...', {
      fontSize: '32px',
      color: '#ffffff'
    }).setOrigin(0.5);

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

    // 배경
    this.add.graphics()
      .fillGradientStyle(0x87ceeb, 0x87ceeb, 0x98fb98, 0x98fb98)
      .fillRect(0, 0, 1024, 1024)
      .generateTexture('sky', 1024, 1024);
  }

  create(): void {
    // 게임 씬으로 이동
    this.scene.start(SCENES.GAME);
  }
} 