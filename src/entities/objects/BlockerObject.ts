import Phaser from 'phaser';
import { WorldObject } from './WorldObject';
import { BlockerDef } from '../../types/ObjectTypes';

export class BlockerObject extends WorldObject {
  constructor(scene: Phaser.Scene, def: BlockerDef, tileSize: number, runner?: any) {
    super(scene, def, tileSize, runner);
  }

  public enablePhysics(textureKeyForTiles: string): void {
    const base = this.createSprite((this as any).def.sprite, textureKeyForTiles);
    // 정적 충돌체(또는 동적) 설정
    const d = (this as any).def as BlockerDef;
    if (d.collider === 'dynamic') {
      const sprite = this.scene.physics.add.sprite((base as any).x, (base as any).y, undefined as any);
      sprite.setVisible(false);
      sprite.setCollideWorldBounds(true);
      sprite.setImmovable(false);
      (sprite.body as Phaser.Physics.Arcade.Body).setSize(this.tileSize * 0.9, this.tileSize * 0.9);
      (sprite as any).linked = base;
      this.sprite = sprite as any;
    } else {
      const s = this.scene.physics.add.staticSprite((base as any).x, (base as any).y, undefined as any);
      s.setVisible(false);
      (s.body as Phaser.Physics.Arcade.StaticBody).setSize(this.tileSize * 0.9, this.tileSize * 0.9);
      (s as any).linked = base;
      this.sprite = s as any;
    }
  }

  public update(_dt: number): void {
    // 파괴 가능 로직 등은 액션/피해 훅으로 처리
  }
}

