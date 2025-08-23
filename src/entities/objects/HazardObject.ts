import Phaser from 'phaser';
import { WorldObject } from './WorldObject';
import { HazardDef } from '../../types/ObjectTypes';

export class HazardObject extends WorldObject {
  private overlapTimer: number = 0;
  private overlapping: boolean = false;
  // private tilesKey: string = 'tiles';

  constructor(scene: Phaser.Scene, def: HazardDef, tileSize: number, runner?: any) {
    super(scene, def, tileSize, runner);
  }

  public enablePhysics(textureKeyForTiles: string): void {
    // this.tilesKey = textureKeyForTiles;
    this.sprite = this.createSprite((this as any).def.sprite, textureKeyForTiles) as any;
    // sensor body
    const s = this.scene.physics.add.sprite((this.sprite as any).x, (this.sprite as any).y, undefined as any);
    s.setVisible(false);
    s.body.setAllowGravity(false);
    s.setImmovable(true);
    s.body.setCircle(Math.max(8, this.tileSize * 0.35));
    (s as any).linked = this.sprite;
    this.sprite = s as any;
  }

  public bindOverlap(target: Phaser.GameObjects.GameObject, onEnterLeave: (enter: boolean, self: HazardObject) => void): void {
    this.scene.physics.add.overlap(this.sprite as any, target as any, () => {
      if (!this.overlapping) {
        this.overlapping = true;
        onEnterLeave(true, this);
        this.runAction('onEnter');
        this.overlapTimer = 0;
        const def = (this as any).def as HazardDef;
        if (def.damage && !def.intervalMs) {
          // 즉시 데미지용 훅만 실행(실제 체력 시스템은 액션으로 처리)
        }
      }
    });
  }

  public unbindOverlap(_target: Phaser.GameObjects.GameObject): void {
    // Phaser overlap 해제는 collider 객체가 필요하므로, 상위 매니저에서 관리하는 것을 권장
  }

  public update(dt: number): void {
    const def = (this as any).def as HazardDef;
    if (!this.overlapping) return;
    if (def.intervalMs && def.intervalMs > 0) {
      this.overlapTimer += dt;
      if (this.overlapTimer >= def.intervalMs) {
        this.overlapTimer = 0;
        this.runAction('onEnter');
      }
    }
  }
}

