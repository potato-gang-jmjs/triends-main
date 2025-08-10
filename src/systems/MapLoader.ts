import Phaser from 'phaser';
import { MapData } from '../types/MapTypes';

export class MapLoader {
  public static getMap(scene: Phaser.Scene, key: string): MapData | null {
    const data = scene.cache.json.get(key) as MapData | undefined;
    if (!data) return null;
    // minimal validation
    if (!data.tileSize || !data.mapWidth || !data.mapHeight || !Array.isArray(data.layers)) {
      console.warn('Invalid map data for key:', key);
      return null;
    }
    return data;
  }
}

