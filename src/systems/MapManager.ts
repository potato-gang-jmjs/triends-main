import Phaser from 'phaser';
import { MapData, MapLayer, MapTile, TilesMeta } from '../types/MapTypes';
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
  private currentMapData: MapData | null = null;
  private currentTilesTextureKey: string = 'tiles';
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
    this.currentMapData = data;

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

    // ───── 타일 스프라이트시트 로드 (맵 전용 → 없으면 글로벌 폴백) ─────
    const perMapTilesKey = `tiles:${rawKey}`;
    const perMapTilesPath = `assets/maps/${rawKey}/spritesheet.png`;

    // 이미 로드되어 있는지 확인
    const existing = this.scene.textures.exists(perMapTilesKey);
    if (!existing) {
      // 존재 여부를 먼저 확인 후 로드 시도
      try {
        const head = await fetch(perMapTilesPath, { method: 'HEAD' });
        if (head.ok) {
          await new Promise<void>((resolve) => {
            this.scene.load.spritesheet(perMapTilesKey, perMapTilesPath, {
              frameWidth: data!.tileSize,
              frameHeight: data!.tileSize
            });
            this.scene.load.once(Phaser.Loader.Events.COMPLETE, () => resolve());
            this.scene.load.start();
          });
        }
      } catch (e) {
        // ignore; 폴백 사용
      }
    }

    const tilesTextureKey = this.scene.textures.exists(perMapTilesKey) ? perMapTilesKey : 'tiles';
    this.currentTilesTextureKey = tilesTextureKey;

    // 렌더링
    this.renderer.render(data, layerDepths, tilesTextureKey);

    // 충돌
    this.collision.setTilesTextureKey(tilesTextureKey);
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

  public getCurrentMapData(): MapData | null {
    return this.currentMapData;
  }

  /**
   * 주어진 월드 좌표가 물 타일 인접(상하좌우 4방 기준)에 있는지 판단
   * 맵 데이터의 레이어에 `is_water: true` 가 설정된 레이어의 타일을 기준으로 검사한다.
   * 맵 데이터가 없거나 물 레이어가 없으면 false.
   */
  public isPointAdjacentToWater(worldX: number, worldY: number): boolean {
    const data = this.currentMapData;
    if (!data) return false;
    const tileSize = data.tileSize || this.lastTileSize;
    const tx = Math.floor(worldX / tileSize);
    const ty = Math.floor(worldY / tileSize);

    // 물 레이어만 필터링
    const waterLayers: MapLayer[] = (data.layers || []).filter(l => (l as any).is_water === true);
    if (waterLayers.length === 0) return false;

    const isWaterAt = (x: number, y: number): boolean => {
      for (const layer of waterLayers) {
        if (!layer.tiles || layer.tiles.length === 0) continue;
        // 선형 탐색 (맵이 크면 세트 구축 고려 가능)
        for (const t of layer.tiles as MapTile[]) {
          if (t.x === x && t.y === y) return true;
        }
      }
      return false;
    };

    // 4방향 인접 + 현재 위치가 물인 경우 포함
    if (isWaterAt(tx, ty)) return true;
    if (isWaterAt(tx + 1, ty)) return true;
    if (isWaterAt(tx - 1, ty)) return true;
    if (isWaterAt(tx, ty + 1)) return true;
    if (isWaterAt(tx, ty - 1)) return true;

    return false;
  }

  public getTilesTextureKey(): string {
    return this.currentTilesTextureKey || 'tiles';
  }
}

