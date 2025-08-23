import Phaser from 'phaser';
import { WorldObject } from './WorldObject';
import { InteractiveDef } from '../../types/ObjectTypes';

export class InteractiveObject extends WorldObject {
  private isPlayerInside = false;
  private indicator?: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, def: InteractiveDef, tileSize: number, runner?: any) {
    super(scene, def, tileSize, runner);
  }

  public enablePhysics(textureKeyForTiles: string): void {
    const base = this.createSprite((this as any).def.sprite, textureKeyForTiles);
    const s = this.scene.physics.add.sprite((base as any).x, (base as any).y, 'green');
    s.setVisible(false);
    s.body.setAllowGravity(false);
    s.setImmovable(true);
    const radius = Math.max(24, this.tileSize * 0.75);
    s.body.setCircle(radius);
    (s as any).linked = base;
    this.sprite = s as any;
  }

  public bindOverlap(target: Phaser.GameObjects.GameObject): void {
    this.scene.physics.add.overlap(this.sprite as any, target as any, () => {
      if (!this.isPlayerInside) {
        this.isPlayerInside = true;
        this.onPlayerEnter();
      }
    });
  }

  public onPlayerEnter(): void {
    this.ensureIndicator();
    this.indicator!.setVisible(true);
    this.scene.tweens.add({ targets: this.indicator!, y: this.indicator!.y - 6, duration: 500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.runAction('onEnter');
  }

  public onPlayerLeave(): void {
    this.runAction('onLeave');
    this.isPlayerInside = false;
    if (this.indicator) {
      this.scene.tweens.killTweensOf(this.indicator);
      this.indicator.setVisible(false);
      this.indicator.setY((this.sprite as any).y - 40);
    }
  }

  public tryInteract(): void {
    if (this.isPlayerInside) {
      this.runAction('onInteract');
    }
  }

  // Allow manager to trigger interact if ANY of given players overlaps right now
  public tryInteractWith(players: Phaser.Physics.Arcade.Sprite[], physicsWorld: Phaser.Physics.Arcade.World): void {
    const anyInside = players.some((p) => physicsWorld.overlap(this.sprite as any, p as any));
    if (anyInside) {
      this.runAction('onInteract');
    }
  }

  public update(_dt: number): void {
    // leave 감지는 상위 매니저에서 매 프레임 bounds overlap 체크로 처리 권장
  }

  public getIsPlayerInside(): boolean {
    return this.isPlayerInside;
  }

  private ensureIndicator(): void {
    if (this.indicator) return;
    const x = (this.sprite as any).x;
    const y = (this.sprite as any).y - 40;
    this.indicator = this.scene.add.text(x, y, 'SPACE', {
      fontSize: '16px',
      color: '#ffffff',
      backgroundColor: '#000000'
    }).setOrigin(0.5).setDepth(1100);
    this.indicator.setVisible(false);
  }
}

