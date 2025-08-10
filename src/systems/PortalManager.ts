import Phaser from 'phaser';
import { PortalDef } from '../types/MapTypes';

export class PortalManager {
  private scene: Phaser.Scene;
  private portals: PortalDef[] = [];
  private debugGraphics: Phaser.GameObjects.Graphics | null = null;
  private debugVisible = true;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  public setPortals(portals: PortalDef[] | null | undefined): void {
    this.portals = Array.isArray(portals) ? portals : [];
  }

  public clear(): void {
    this.portals = [];
    if (this.debugGraphics) {
      this.debugGraphics.clear();
      this.debugGraphics.destroy();
      this.debugGraphics = null;
    }
  }

  public toggleDebug(): void {
    this.debugVisible = !this.debugVisible;
    if (!this.debugVisible) {
      if (this.debugGraphics) {
        this.debugGraphics.clear();
      }
      return;
    }
    if (!this.debugGraphics) {
      this.debugGraphics = this.scene.add.graphics();
      this.debugGraphics.setDepth(1500);
    }
  }

  public setVisible(visible: boolean, tileSize?: number): void {
    this.debugVisible = visible;
    if (!visible) {
      if (this.debugGraphics) {
        this.debugGraphics.clear();
      }
      return;
    }
    if (!this.debugGraphics) {
      this.debugGraphics = this.scene.add.graphics();
      this.debugGraphics.setDepth(1500);
    }
    if (tileSize) this.drawDebug(tileSize);
  }

  public drawDebug(tileSize: number): void {
    if (!this.debugVisible) return;
    if (!this.debugGraphics) return;
    this.debugGraphics.clear();
    // NPC와 구분되는 시안색 반투명 채움 + 테두리
    this.debugGraphics.fillStyle(0x00ffff, 0.15);
    this.debugGraphics.lineStyle(2, 0x00ffff, 0.9);
    for (const p of this.portals) {
      const x = p.area.x * tileSize;
      const y = p.area.y * tileSize;
      const w = p.area.width * tileSize;
      const h = p.area.height * tileSize;
      this.debugGraphics.fillRect(x, y, w, h);
      this.debugGraphics.strokeRect(x, y, w, h);
    }
  }

  /**
   * Returns the first portal that contains both players (tile-based AABB include check).
   */
  public findPortalIfBothInside(
    p1: Phaser.Math.Vector2,
    p2: Phaser.Math.Vector2,
    tileSize: number
  ): PortalDef | null {
    for (const portal of this.portals) {
      if (
        this.contains(portal, p1.x, p1.y, tileSize) &&
        this.contains(portal, p2.x, p2.y, tileSize)
      ) {
        return portal;
      }
    }
    return null;
  }

  private contains(portal: PortalDef, px: number, py: number, tileSize: number): boolean {
    const tileX = Math.floor(px / tileSize);
    const tileY = Math.floor(py / tileSize);
    return (
      tileX >= portal.area.x &&
      tileY >= portal.area.y &&
      tileX < portal.area.x + portal.area.width &&
      tileY < portal.area.y + portal.area.height
    );
  }
}

