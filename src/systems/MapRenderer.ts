import Phaser from 'phaser';
import { MapData } from '../types/MapTypes';

export interface RenderedLayer {
  container: Phaser.GameObjects.Container;
  images: Phaser.GameObjects.Image[];
}

export class MapRenderer {
  private scene: Phaser.Scene;
  private tileSize: number = 64;
  // reserved for future culling
  // private layers: MapLayer[] = [];
  private rendered: RenderedLayer[] = [];

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  public render(
    map: MapData,
    layerDepths?: Record<string, number>,
    tilesTextureKey: string = 'tiles'
  ): void {
    this.clear();
    this.tileSize = map.tileSize;
    // this.layers = map.layers;

    map.layers.forEach((layer, index) => {
      const container = this.scene.add.container(0, 0);
      const depth = (layerDepths && layerDepths[layer.name] !== undefined)
        ? (layerDepths[layer.name] as number)
        : this.depthForLayer(layer.name, index);
      container.setDepth(depth ?? 0);
      const images: Phaser.GameObjects.Image[] = [];

      for (const t of layer.tiles) {
        const frameIndex = Number(t.id);
        const img = this.scene.add.image(
          t.x * this.tileSize + this.tileSize / 2,
          t.y * this.tileSize + this.tileSize / 2,
          tilesTextureKey,
          frameIndex
        );
        img.setOrigin(0.5);
        images.push(img);
        container.add(img);
      }

      this.rendered.push({ container, images });
    });
  }

  private depthForLayer(name: string, index: number): number {
    const n = name.toLowerCase();
    if (n.includes('background')) return -100; // always behind
    if (n.includes('back')) return -10;        // e.g., Trees back
    if (n.includes('front')) return 100;       // e.g., Trees front (over player)
    // default: maintain relative order
    return index * 10;
  }

  public clear(): void {
    this.rendered.forEach(layer => {
      layer.images.forEach(img => img.destroy());
      layer.container.destroy();
    });
    this.rendered = [];
  }
}

