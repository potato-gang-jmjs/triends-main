import Phaser from 'phaser';
import { MapData, TilesMeta } from '../types/MapTypes';
import { GlobalVariableManager } from './GlobalVariableManager';

export type CollisionMode = 'arcade' | 'grid';

export class MapCollisionManager {
  private scene: Phaser.Scene;
  private tileSize = 64;
  private staticColliders: Phaser.Physics.Arcade.StaticGroup | null = null;
  private mode: CollisionMode = 'arcade';
  private tilesMeta: TilesMeta = {};
  private debugVisible = false;
  private pendingPlayers: Phaser.Physics.Arcade.Sprite[] = [];
  private tilesTextureKey: string = 'tiles';

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  public setMode(mode: CollisionMode): void {
    this.mode = mode;
  }

  public setTilesMeta(meta: TilesMeta): void {
    this.tilesMeta = meta || {};
  }

  public setTilesTextureKey(key: string): void {
    this.tilesTextureKey = key || 'tiles';
  }

  public build(map: MapData): void {
    this.clear();
    this.tileSize = map.tileSize;

    if (this.mode === 'arcade') {
      this.buildArcade(map);
      this.attachPendingPlayers();
    } else {
      // grid mode is a no-op for now; collision checks would be performed in movement
    }
  }

  private canCollideByMeta(tileId: string): boolean {
    const rule = this.tilesMeta[tileId];
    if (!rule || !rule.requires || rule.requires.length === 0) return true;
    const gvm = GlobalVariableManager.getInstance();
    return !rule.requires.every(flag => !!gvm.get(flag));
  }

  private buildArcade(map: MapData): void {
    this.staticColliders = this.scene.physics.add.staticGroup();

    for (const layer of map.layers) {
      if (!layer.collider) continue;
      for (const t of layer.tiles) {
        if (!this.canCollideByMeta(t.id)) {
          // requires 조건이 충족되면 충돌을 만들지 않음(통과 가능)
          continue;
        }

        const colliderWidth = this.tileSize;
        const colliderHeight = this.tileSize;

        const worldLeft = t.x * this.tileSize;
        const worldTop = t.y * this.tileSize;
        const cx = worldLeft + colliderWidth / 2;
        const cy = worldTop + colliderHeight / 2;

        const img = this.staticColliders.create(cx, cy, this.tilesTextureKey) as Phaser.Physics.Arcade.Image;
        img.setVisible(this.debugVisible);
        img.setAlpha(this.debugVisible ? 0.3 : 1);
        img.setDisplaySize(colliderWidth, colliderHeight);
        // 충돌 오브젝트 식별자 부여
        img.name = `collider:${layer.name}:${t.x},${t.y}`;
        img.setData('layer', layer.name);
        img.setData('tileXY', { x: t.x, y: t.y });
        const body = img.body as Phaser.Physics.Arcade.StaticBody;
        body.setSize(colliderWidth, colliderHeight);
        body.updateFromGameObject();
      }
    }
  }

  public attachPlayer(player: Phaser.Physics.Arcade.Sprite): void {
    if (this.mode !== 'arcade') return;
    if (this.staticColliders) {
      this.scene.physics.add.collider(player, this.staticColliders);
    } else {
      this.pendingPlayers.push(player);
    }
  }

  public clear(): void {
    if (this.staticColliders) {
      this.staticColliders.clear(true, true);
      (this.staticColliders as any) = null;
    }
  }

  public toggleDebugVisibility(): void {
    this.debugVisible = !this.debugVisible;
    if (!this.staticColliders) return;
    this.staticColliders.children.iterate((obj: any) => {
      const img = obj as Phaser.Physics.Arcade.Image;
      img.setVisible(this.debugVisible);
      img.setAlpha(this.debugVisible ? 0.3 : 1);
      // displaySize is already set to collider bounds on creation
      return false;
    });
  }

  private attachPendingPlayers(): void {
    if (!this.staticColliders) return;
    for (const p of this.pendingPlayers) {
      this.scene.physics.add.collider(p, this.staticColliders);
    }
    this.pendingPlayers = [];
  }
}

