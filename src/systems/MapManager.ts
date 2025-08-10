import Phaser from 'phaser';
import { TilesMeta } from '../types/MapTypes';
import { MapLoader } from './MapLoader';
import { MapRenderer } from './MapRenderer';
import { MapCollisionManager, CollisionMode } from './MapCollisionManager';
import { SaveManager } from './SaveManager';
import { PortalDef } from '../types/MapTypes';
import { PortalManager } from './PortalManager';

export class MapManager {
  private scene: Phaser.Scene;
  private renderer: MapRenderer;
  private collision: MapCollisionManager;
  private portals: PortalManager;
  private lastTileSize: number = 64;
  // 현재 로드된 맵 키(필요 시 노출/사용). 미사용 시 최적화에서 제외하려면 주석 처리 가능
  // private currentMapKey: string | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.renderer = new MapRenderer(scene);
    this.collision = new MapCollisionManager(scene);
    this.portals = new PortalManager(scene);
  }

  public setCollisionMode(mode: CollisionMode): void {
    this.collision.setMode(mode);
  }

  public async load(mapKey: string, tilesMeta?: TilesMeta): Promise<boolean> {
    const rawKey = mapKey.replace('map:', '');
    let data = MapLoader.getMap(this.scene, mapKey);
    if (!data) {
      // 런타임 페치 폴백
      try {
        const res = await fetch(`assets/maps/${rawKey}/map.json`);
        if (res.ok) {
          const json = await res.json();
          // 캐시에 주입하여 기존 로직과 동일 경로 사용
          this.scene.cache.json.add(mapKey, json);
          data = MapLoader.getMap(this.scene, mapKey);
        }
      } catch (e) {
        // ignore
      }
      if (!data) return false;
    }
    // this.currentMapKey = mapKey;
    this.lastTileSize = data.tileSize;

    // 카메라/월드 경계
    const worldWidth = data.tileSize * data.mapWidth;
    const worldHeight = data.tileSize * data.mapHeight;
    this.scene.physics.world.setBounds(0, 0, worldWidth, worldHeight);
    this.scene.cameras.main.setBounds(0, 0, worldWidth, worldHeight);

    // 레이어 depth 설정 로드 시도: mapKey가 'map:main'이면 assets/maps/main/layers.json
    let layerDepths: Record<string, number> | undefined;
    try {
      const path = `assets/maps/${rawKey}/layers.json`;
      // Phaser cache에는 없을 수 있어 fetch 사용
      const res = await fetch(path);
      if (res.ok) {
        layerDepths = await res.json();
      }
    } catch (e) {
      // optional file; ignore errors
    }

    // 렌더링
    this.renderer.render(data, layerDepths);

    // 충돌
    if (tilesMeta) this.collision.setTilesMeta(tilesMeta);
    this.collision.build(data);

    // 포탈 로드 (선택 파일)
    const portalPath = `assets/maps/${rawKey}/portals.json`;
    try {
      const res = await fetch(portalPath);
      if (res.ok) {
        const portals = (await res.json()) as PortalDef[];
        this.portals.setPortals(portals);
        this.portals.setVisible(true, data.tileSize);
      } else {
        this.portals.setPortals([]);
        this.portals.setVisible(true, data.tileSize);
      }
    } catch (e) {
      this.portals.setPortals([]);
      this.portals.setVisible(true, data.tileSize);
    }

    // 저장
    const save = SaveManager.loadGame();
    save.gameState.currentScene = this.scene.scene.key;
    (save.gameState as any).currentMap = mapKey;
    SaveManager.saveGame(save);
    return true;
  }

  public attachPlayer(player: Phaser.Physics.Arcade.Sprite): void {
    this.collision.attachPlayer(player);
  }

  public unload(): void {
    this.renderer.clear();
    this.collision.clear();
    this.portals.clear();
    // this.currentMapKey = null;
  }

  public toggleCollisionDebug(): void {
    this.collision.toggleDebugVisibility();
  }

  public getPortalManager(): PortalManager {
    return this.portals;
  }

  public getTileSize(): number {
    return this.lastTileSize;
  }
}

