import Phaser from 'phaser';
import { SCENES } from '../utils/constants';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: SCENES.BOOT });
  }

  create(): void {
    console.log('Boot Scene Started');
    
    // PreloadScene으로 전환
    this.scene.start(SCENES.PRELOAD);
  }
} 