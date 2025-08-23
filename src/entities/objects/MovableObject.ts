import Phaser from 'phaser';
import { WorldObject } from './WorldObject';
import { MovableDef } from '../../types/ObjectTypes';

export class MovableObject extends WorldObject {
  constructor(scene: Phaser.Scene, def: MovableDef, tileSize: number, runner?: any) {
    super(scene, def, tileSize, runner);
  }

  public enablePhysics(textureKeyForTiles: string): void {
    const base = this.createSprite((this as any).def.sprite, textureKeyForTiles);
    const s = this.scene.physics.add.sprite((base as any).x, (base as any).y, undefined as any);
    s.setVisible(false);
    s.setCollideWorldBounds(true);
    s.setImmovable(false);
    (s.body as Phaser.Physics.Arcade.Body).setSize(this.tileSize * 0.9, this.tileSize * 0.9);
    (s as any).linked = base;
    this.sprite = s as any;
  }

  public update(_dt: number): void {
    // Pull 제외: 현재 프레임에선 별도 움직임 없음
  }
}

