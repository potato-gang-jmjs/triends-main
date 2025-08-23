import Phaser from 'phaser';
import { ActionProcessor } from '../../systems/ActionProcessor';
import { ObjectDef, SpriteRef } from '../../types/ObjectTypes';

export abstract class WorldObject {
  public readonly id: string;
  public readonly kind: ObjectDef['kind'];
  public sprite!: Phaser.GameObjects.GameObject & { body?: Phaser.Physics.Arcade.Body };
  protected scene: Phaser.Scene;
  protected def: ObjectDef;
  protected actionRunner?: ActionProcessor;
  protected tileSize: number = 64;

  constructor(scene: Phaser.Scene, def: ObjectDef, tileSize: number, actionRunner?: ActionProcessor) {
    this.scene = scene;
    this.def = def;
    this.id = def.id;
    this.kind = def.kind;
    this.tileSize = tileSize;
    this.actionRunner = actionRunner;
  }

  protected createSprite(spriteRef: SpriteRef, textureKeyForTiles: string): Phaser.GameObjects.GameObject {
    if (spriteRef.type === 'tiles') {
      const frameIndex = Number(spriteRef.frameId);
      const img = this.scene.add.image(this.def.pos.x, this.def.pos.y, textureKeyForTiles, frameIndex);
      img.setOrigin(0.5, 0.5);
      if (this.def.scale) img.setScale(this.def.scale);
      if (typeof this.def.rotation === 'number') img.setRotation(this.def.rotation);
      if (this.def.visible === false) img.setVisible(false);
      if (typeof this.def.depth === 'number') {
        img.setDepth(this.def.depth);
      } else {
        img.setDepth(500);
      }
      return img;
    } else {
      const frame = typeof spriteRef.frame === 'number' ? spriteRef.frame : undefined;
      const sprite = this.scene.add.sprite(this.def.pos.x, this.def.pos.y, spriteRef.key, frame);
      sprite.setOrigin(0.5, 0.5);
      if (this.def.scale) sprite.setScale(this.def.scale);
      if (typeof this.def.rotation === 'number') sprite.setRotation(this.def.rotation);
      if (this.def.visible === false) sprite.setVisible(false);
      if (typeof this.def.depth === 'number') {
        sprite.setDepth(this.def.depth);
      } else {
        sprite.setDepth(500);
      }
      return sprite;
    }
  }

  public setTilePosition(tileX: number, tileY: number): void {
    const x = tileX * this.tileSize + this.tileSize / 2;
    const y = tileY * this.tileSize + this.tileSize / 2;
    this.setPosition(x, y);
  }

  public setPosition(x: number, y: number): void {
    (this.sprite as any).setPosition?.(x, y);
    if ((this.sprite as any).body) {
      const b = (this.sprite as any).body as Phaser.Physics.Arcade.Body;
      b.updateFromGameObject?.();
    }
    this.runAction('onMoved');
  }

  public moveBy(dx: number, dy: number): void {
    const nx = (this.sprite as any).x + dx;
    const ny = (this.sprite as any).y + dy;
    this.setPosition(nx, ny);
  }

  public slideTo(x: number, y: number, durationMs: number = 150): void {
    this.scene.tweens.add({ targets: this.sprite as any, x, y, duration: durationMs, ease: 'Sine.easeInOut' });
    this.runAction('onMoved');
  }

  protected runAction(hook: 'onEnter' | 'onLeave' | 'onInteract' | 'onDestroyed' | 'onMoved'): void {
    const action = (this.def as any)[hook] as string | undefined;
    if (!action || !this.actionRunner) return;
    try {
      this.actionRunner.processAction(action);
    } catch (e) {
      console.warn(`[WorldObject:${this.id}] action failed (${hook}):`, e);
    }
  }

  public applyDamage(amount: number = 1): void {
    if (!this.def.destructible) return;
    const next = Math.max(0, (this.def.hp ?? this.def.maxHp ?? 1) - amount);
    this.def.hp = next;
    if (next <= 0) this.destroyObject();
  }

  public destroyObject(): void {
    this.runAction('onDestroyed');
    (this.sprite as any).destroy?.();
  }

  public abstract enablePhysics(textureKeyForTiles: string): void;
  public abstract update(dt: number): void;
}

