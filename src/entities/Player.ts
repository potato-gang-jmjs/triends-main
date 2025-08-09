import Phaser from 'phaser';
import { PLAYER_SPEED, PLAYER_DIAGONAL_SPEED } from '../utils/constants';
import { PlayerStats } from '../types/GameData';
import { SaveManager } from '../systems/SaveManager';

export class Player {
  public sprite: Phaser.Physics.Arcade.Sprite;
  public stats: PlayerStats;
  private scene: Phaser.Scene;

  constructor(scene: Phaser.Scene, x: number, y: number, spriteKey: string = 'red') {
    this.scene = scene;
    
    // 저장된 데이터에서 스탯 로드
    const savedData = SaveManager.loadGame();
    this.stats = { ...savedData.player.stats };
    
    // 임시 플레이어 스프라이트 (빨간 사각형)
    this.sprite = scene.physics.add.sprite(x, y, spriteKey);
    this.sprite.setScale(2);
    this.sprite.setCollideWorldBounds(true);
    
    // 저장된 위치로 설정 (처음 시작이 아닌 경우)
    if (savedData.player.position.x !== 512 || savedData.player.position.y !== 512) {
      this.sprite.setPosition(savedData.player.position.x, savedData.player.position.y);
    }
  }

  update(cursors: Phaser.Types.Input.Keyboard.CursorKeys): void {
    const left = cursors.left?.isDown;
    const right = cursors.right?.isDown;
    const up = cursors.up?.isDown;
    const down = cursors.down?.isDown;
    
    // 8방향 이동
    let velocityX = 0;
    let velocityY = 0;
    
    if (left) velocityX = -1;
    else if (right) velocityX = 1;
    
    if (up) velocityY = -1;
    else if (down) velocityY = 1;
    
    // 대각선 이동 시 속도 조정
    if (velocityX !== 0 && velocityY !== 0) {
      velocityX *= PLAYER_DIAGONAL_SPEED / PLAYER_SPEED;
      velocityY *= PLAYER_DIAGONAL_SPEED / PLAYER_SPEED;
    }
    
    // 속도 적용
    this.sprite.setVelocity(
      velocityX * PLAYER_SPEED,
      velocityY * PLAYER_SPEED
    );
    
    // 이동 방향에 따른 회전 (선택사항)
    if (velocityX !== 0 || velocityY !== 0) {
      const angle = Math.atan2(velocityY, velocityX);
      this.sprite.setRotation(angle + Math.PI / 2);
    }

    // 위치 자동 저장 (매 프레임마다는 부담스러우므로 간격을 둠)
    if (this.scene.game.getFrame() % 60 === 0) { // 1초마다
      this.savePosition();
    }
  }

  // 스탯 업데이트
  public updateStats(newStats: Partial<PlayerStats>): void {
    Object.assign(this.stats, newStats);
    SaveManager.updatePlayerStats(this.stats);
    console.log('플레이어 스탯 업데이트:', newStats);
  }

  // 특정 스탯 추가
  public addStat(statName: keyof PlayerStats, amount: number): void {
    if (typeof this.stats[statName] === 'number') {
      this.stats[statName] += amount;
      
      // 체력은 최대값을 초과할 수 없음
      if (statName === 'health' && this.stats.health > this.stats.maxHealth) {
        this.stats.health = this.stats.maxHealth;
      }
      
      SaveManager.updatePlayerStats(this.stats);
      console.log(`${statName} ${amount > 0 ? '+' : ''}${amount}:`, this.stats[statName]);
    }
  }

  // 특정 스탯 설정
  public setStat(statName: keyof PlayerStats, value: number): void {
    if (typeof this.stats[statName] === 'number') {
      this.stats[statName] = value;
      
      // 체력은 최대값을 초과할 수 없음
      if (statName === 'health' && this.stats.health > this.stats.maxHealth) {
        this.stats.health = this.stats.maxHealth;
      }
      
      SaveManager.updatePlayerStats(this.stats);
      console.log(`${statName} 설정:`, this.stats[statName]);
    }
  }

  // 위치 저장
  public savePosition(): void {
    const gameData = SaveManager.loadGame();
    gameData.player.position = {
      x: this.sprite.x,
      y: this.sprite.y
    };
    SaveManager.saveGame(gameData);
  }

  // 스탯 정보 가져오기
  public getStats(): PlayerStats {
    return { ...this.stats };
  }

  // 디버그: 현재 스탯 출력
  public debugStats(): void {
    console.log('=== Player Stats ===');
    console.log(`체력: ${this.stats.health}/${this.stats.maxHealth}`);
    console.log(`골드: ${this.stats.gold}`);
    console.log(`경험치: ${this.stats.experience}`);
    console.log(`레벨: ${this.stats.level}`);
    console.log(`위치: (${Math.round(this.sprite.x)}, ${Math.round(this.sprite.y)})`);
  }
} 