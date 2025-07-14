import Phaser from 'phaser';
import { SCENES, GAME_WIDTH, GAME_HEIGHT } from '../utils/constants';
import { Player } from '../entities/Player';

export class GameScene extends Phaser.Scene {
  private player!: Player;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;

  constructor() {
    super({ key: SCENES.GAME });
  }

  create(): void {
    // 배경
    const bg = this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'sky');
    bg.setDisplaySize(GAME_WIDTH, GAME_HEIGHT);
    
    // 플레이어 생성
    this.player = new Player(this, GAME_WIDTH / 2, GAME_HEIGHT / 2);
    
    // 키보드 입력 설정
    this.cursors = this.input.keyboard!.createCursorKeys();
    
    // 카메라 설정
    this.cameras.main.setBounds(0, 0, GAME_WIDTH, GAME_HEIGHT);
    this.cameras.main.startFollow(this.player.sprite);
    
    // ESC 키로 메인 메뉴로 돌아가기
    this.input.keyboard!.on('keydown-ESC', () => {
      this.scene.start(SCENES.MAIN_MENU);
    });
  }

  update(): void {
    // 플레이어 업데이트
    this.player.update(this.cursors);
  }
} 