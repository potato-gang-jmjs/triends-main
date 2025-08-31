// src/systems/LightNetworkSystem.ts
import Phaser from 'phaser';
import { MapLoader } from './MapLoader';
import { MapData, MapLayer, MapTile } from '../types/MapTypes';

/** 좌표 확정 타입 */
type TileXY = { x: number; y: number };

/** 문자열 키 "x,y" → 좌표. 실패시 throw 하여 반환 타입을 확정 number로 보장 */
function parseKeyToXY(key: string): TileXY {
  const comma = key.indexOf(',');
  if (comma < 0) throw new Error(`[LightNetworkSystem] invalid key: ${key}`);
  const x = Number(key.slice(0, comma));
  const y = Number(key.slice(comma + 1));
  if (!Number.isFinite(x) || !Number.isFinite(y)) {
    throw new Error(`[LightNetworkSystem] non-finite coords from key: ${key}`);
  }
  return { x, y };
}

/** 타입가드: MapTile 이고 x,y가 확정 number 인지 */
function hasXY(t: MapTile): t is MapTile & Required<Pick<MapTile, 'x' | 'y'>> {
  return typeof t.x === 'number' && typeof t.y === 'number'
      && Number.isFinite(t.x) && Number.isFinite(t.y);
}

/** 보조: 숫자 보장 (TS에 확실히 number 반환을 약속) */
function ensureNumber(n: unknown, label: string): number {
  if (typeof n !== 'number' || !Number.isFinite(n)) {
    throw new Error(`[LightNetworkSystem] ${label} is not a finite number`);
  }
  return n;
}

/**
 * LightNetworkSystem
 * - devices_off 에서 4x4(≈16칸) 램프 클러스터를 센서로 사용 (64x64)
 * - wires 를 그래프로 보고, 램프 둘레에서 BFS 전파
 * - 레이저는 램프만 감지 (꽃은 직접 감지 X)
 * - 꽃은 전파 도달 시 깜빡임 후 overlay 로 가림(사라진 효과)
 */
export class LightNetworkSystem {
    private readonly scene: Phaser.Scene;
    private readonly mapId: string;
    private readonly tileSize: number;
    private readonly tilesKey: string;
    private readonly lampsOffLayerName = 'lamps_off';
    private readonly lampsOnLayerName = 'lamps_on';
    private readonly flowersOffLayerName = 'flowers_off';
    private readonly flowersOnLayerName = 'flowers_on';

    private overlay: Phaser.GameObjects.Container;
    private lampSensorBody?: Phaser.Physics.Arcade.Image;
    private activated = false;


    /** wires 좌표 집합 ("x,y") */
    private readonly wiresSet: Set<string> = new Set();
    /** devices_off 중 '꽃'만 남긴 좌표 (키: "x,y") */
    private readonly deviceTiles: Map<string, TileXY> = new Map();
    /** 램프(4x4) 타일 집합 (키: "x,y") */
    private lampTiles: Set<string> = new Set();
    /** 램프에서 도달 가능한 wire 좌표 집합 ("x,y") */
    private readonly reachableWireSet: Set<string> = new Set();

    constructor(scene: Phaser.Scene, mapId: string, tilesKey: string, tileSize: number) {
        this.scene   = scene;
        this.mapId   = mapId.replace(/^map:/, '');
        this.tilesKey = tilesKey;
        this.tileSize = tileSize;

        this.overlay = this.scene.add.container(0, 0);
        this.overlay.setDepth(1200);
        // tilesKey 실제 사용 → “읽히지 않음” 경고 제거
        this.overlay.setName(`light-overlay-${this.tilesKey}`);

        this.buildFromMap();
        this.createLampSensor();
    }

    public destroy(): void {
        this.overlay?.destroy(true);
        this.lampSensorBody?.destroy();
        this.lampSensorBody = undefined;

        this.wiresSet.clear();
        this.deviceTiles.clear();
        this.lampTiles.clear();
        this.reachableWireSet.clear();
        this.activated = false;
    }

    /** 램프 센서와 레이저 그룹 overlap 연결 */
    public attachLaserGroup(lasers: Phaser.Physics.Arcade.Group): void {
        if (!this.lampSensorBody) return;
        this.scene.physics.add.overlap(
        this.lampSensorBody,
        lasers,
        (_lamp, laser) => {
            const s = laser as Phaser.Physics.Arcade.Sprite;
            if (s.active) {
            s.disableBody(true, true);
            s.destroy();
            }
            if (!this.activated) {
            this.activated = true;
            this.propagateAndTrigger();
            }
        },
        undefined,
        this
        );
    }

    // ───────────────────────────────────────────── internal

    private buildFromMap(): void {
        const mapKey = `map:${this.mapId}`;
        const map = MapLoader.getMap(this.scene, mapKey) as MapData | null;
        if (!map) {
            console.warn('[LightNetworkSystem] Map not found in cache:', mapKey);
            return;
        }

        // wires 수집
        const wiresLayer = map.layers.find(l => l.name === 'wires');
        if (!wiresLayer) {
            console.warn('[LightNetworkSystem] Required layer missing: wires');
            return;
        }
        this.wiresSet.clear();
        for (const t of wiresLayer.tiles) {
            if (hasXY(t)) this.wiresSet.add(this.k(t.x, t.y));
        }

        // lamps_off / flowers_off 사용 (새 구조)
        this.lampTiles = new Set();
        this.deviceTiles.clear();

        const lampsOff = map.layers.find(l => l.name === this.lampsOffLayerName);
        const flowersOff = map.layers.find(l => l.name === this.flowersOffLayerName);

        if (!lampsOff || !flowersOff) {
            console.warn('[LightNetworkSystem] lamps_off / flowers_off not found on map');
            return;
        }

        for (const t of lampsOff.tiles) if (hasXY(t)) this.lampTiles.add(this.k(t.x, t.y));
        for (const t of flowersOff.tiles) if (hasXY(t)) this.deviceTiles.set(this.k(t.x, t.y), { x: t.x, y: t.y });

        // BFS 시작점 계산
        this.computeReachableWires();
    }


    /** 램프 둘레에서 시작해서 wires 위로 BFS → 도달 집합 계산 */
    private computeReachableWires(): void {
        this.reachableWireSet.clear();

        const starts: string[] = [];
        const seen = new Set<string>();

        for (const key of this.lampTiles) {
            const { x, y } = parseKeyToXY(key);
            const adj = [ this.k(x+1,y), this.k(x-1,y), this.k(x,y+1), this.k(x,y-1) ];
            for (const a of adj) {
                if (this.wiresSet.has(a) && !seen.has(a)) {
                    seen.add(a);
                    starts.push(a);
                }
            }
        }

        const visited = new Set<string>(starts);
        const q = [...starts];
        while (q.length) {
            const cur = q.shift()!;
            this.reachableWireSet.add(cur);
            const { x: cx, y: cy } = parseKeyToXY(cur);
            const nb = [ this.k(cx+1,cy), this.k(cx-1,cy), this.k(cx,cy+1), this.k(cx,cy-1) ];
            for (const nk of nb) {
                if (this.wiresSet.has(nk) && !visited.has(nk)) {
                    visited.add(nk);
                    q.push(nk);
                }
            }
        }
    }


    private createLampSensor(): void {
        if (this.lampTiles.size === 0) return;

        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (const key of this.lampTiles) {
            const { x, y } = parseKeyToXY(key);
            if (x < minX) minX = x; if (y < minY) minY = y;
            if (x > maxX) maxX = x; if (y > maxY) maxY = y;
        }

        const centerX = (minX + maxX + 1) * 0.5 * this.tileSize;
        const centerY = (minY + maxY + 1) * 0.5 * this.tileSize;
        const w = (maxX - minX + 1) * this.tileSize;
        const h = (maxY - minY + 1) * this.tileSize;

        const img = this.scene.physics.add.image(centerX, centerY, undefined as unknown as string);
        img.setVisible(false).setActive(true);
        const body = img.body as Phaser.Physics.Arcade.Body;
        body.setAllowGravity(false);
        body.setImmovable(true);
        body.setSize(w, h);
        body.setOffset(-w / 2, -h / 2);
        this.lampSensorBody = img;
    }


    /** 점등 → 와이어 파동 → 꽃 트리거 */
    private propagateAndTrigger(): void {
        // 램프 점등: off 레이어를 끄면 on 레이어가 드러남
        this.setLayerVisible(this.lampsOffLayerName, false);
        this.flashLamp();
        this.rippleAlongWires(() => this.triggerFlowers());
    }

    private flashLamp(): void {
        if (this.lampTiles.size === 0) return;

        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (const key of this.lampTiles) {
            const { x, y } = parseKeyToXY(key);
            if (x < minX) minX = x; if (y < minY) minY = y;
            if (x > maxX) maxX = x; if (y > maxY) maxY = y;
        }

        const x = (minX + maxX + 1) * 0.5 * this.tileSize;
        const y = (minY + maxY + 1) * 0.5 * this.tileSize;
        const r = Math.max(maxX - minX + 1, maxY - minY + 1) * this.tileSize * 0.6;

        const circ = this.scene.add.circle(x, y, r, 0xffffaa, 0.6);
        circ.setBlendMode(Phaser.BlendModes.ADD).setDepth(1250);
        this.overlay.add(circ);
        this.scene.tweens.add({
            targets: circ, alpha: 0, scale: 1.3, duration: 300,
            onComplete: () => circ.destroy()
        });
    }


    /** 와이어를 따라 파동 이펙트 */
    private rippleAlongWires(onComplete: () => void): void {
        // Set<string> → string[] → TileXY[] (실패 시 throw, 반환 타입 확정)
        const keys: string[] = Array.from(this.reachableWireSet);
        let i = 0;

        const step = () => {
        if (i >= keys.length) { onComplete(); return; }

        const batchKeys = keys.slice(i, i + 12);
        i += 12;

        for (const key of batchKeys) {
            const { x, y } = parseKeyToXY(key); // ← 여기서 TileXY 확정
            const cx: number = (x + 0.5) * this.tileSize;
            const cy: number = (y + 0.5) * this.tileSize;

            const p = this.scene.add.circle(cx, cy, this.tileSize * 0.35, 0x99ddff, 0.8);
            p.setBlendMode(Phaser.BlendModes.ADD).setDepth(1230);
            this.overlay.add(p);
            this.scene.tweens.add({
            targets: p, alpha: 0, duration: 220, onComplete: () => p.destroy()
            });
        }

        this.scene.time.delayedCall(60, step);
        };

        step();
    }

    /** 꽃 트리거 (레이저 직접 반응 X, wires 전파 도달 시만) */
    private triggerFlowers(): void {
        const toTrigger: TileXY[] = [];
        for (const t of this.deviceTiles.values()) {
            const x = ensureNumber(t.x, 'flower.x');
            const y = ensureNumber(t.y, 'flower.y');
            const adj = [ this.k(x+1,y), this.k(x-1,y), this.k(x,y+1), this.k(x,y-1) ];
            if (adj.some(a => this.reachableWireSet.has(a))) toTrigger.push({ x, y });
        }

        for (const t of toTrigger) {
            const cx = (t.x + 0.5) * this.tileSize;
            const cy = (t.y + 0.5) * this.tileSize;

            // 짧은 발광 효과
            const glow = this.scene.add.circle(cx, cy, this.tileSize * 0.45, 0xffffff, 0.95);
            glow.setBlendMode(Phaser.BlendModes.ADD).setDepth(1260);
            this.overlay.add(glow);
            this.scene.tweens.add({
                targets: glow, alpha: 0, duration: 380, onComplete: () => glow.destroy()
            });

            // 핵심: flowers_off 해당 타일만 숨김 → 아래 flowers_on이 드러남
            this.hideTileFromLayer(this.flowersOffLayerName, t.x, t.y);
        }
    }

    /** 레이어 전체 가시성 토글: TilemapLayer 우선 탐색 */
    private setLayerVisible(layerName: string, visible: boolean): void {
        // 1) MapLoader API가 있으면 우선 사용
        const ml: any = MapLoader as any;
        const mapKey = `map:${this.mapId}`;
        if (ml && typeof ml.setLayerVisible === 'function') {
            ml.setLayerVisible(this.scene, mapKey, layerName, visible);
            return;
        }

        // 2) Phaser TilemapLayer 직접 탐색
        let toggled = false;
        (this.scene.children.list as any[]).forEach((obj: any) => {
            // Phaser v3: StaticTilemapLayer/DynamicTilemapLayer 둘 다 layer/name 구조가 있다
            const lname: string | undefined =
                obj?.layer?.name ?? obj?.tilemapLayer?.layer?.name ?? obj?.name;

            const match =
                lname === layerName ||
                lname?.endsWith(`:${layerName}`) ||
                lname === `layer:${this.mapId}:${layerName}` ||
                lname === `tilelayer:${this.mapId}:${layerName}`;

            if (match) {
                if (typeof obj.setVisible === 'function') obj.setVisible(visible);
                else if (typeof obj.setAlpha === 'function') obj.setAlpha(visible ? 1 : 0);
                toggled = true;
            }
        });

        if (!toggled) {
            console.warn(`[LightNetworkSystem] Could not toggle layer "${layerName}"`);
        }
    }


    /** 해당 레이어의 (x,y) 타일을 지워서 아래 on 타일이 드러나게 함 */
    private hideTileFromLayer(layerName: string, x: number, y: number): void {
        const ml: any = MapLoader as any;
        const mapKey = `map:${this.mapId}`;

        // 1) MapLoader에 개별 타일 토글 API가 있으면 우선 사용
        if (ml && typeof ml.setTileVisible === 'function') {
            ml.setTileVisible(this.scene, mapKey, layerName, x, y, false);
            return;
        }

        // 2) 씬의 TilemapLayer를 찾아 타일 제거
        let done = false;
        (this.scene.children.list as any[]).forEach((obj: any) => {
            const lname: string | undefined =
                obj?.layer?.name ?? obj?.tilemapLayer?.layer?.name ?? obj?.name;

            const match =
                lname === layerName ||
                lname?.endsWith(`:${layerName}`) ||
                lname === `layer:${this.mapId}:${layerName}` ||
                lname === `tilelayer:${this.mapId}:${layerName}`;

            // StaticTilemapLayer / DynamicTilemapLayer 공통 API: getTileAt / removeTileAt / putTileAt
            if (match && typeof obj.getTileAt === 'function') {
                const tile = obj.getTileAt(x, y, true); // true → 없으면 null 대신 빈 타일 반환
                if (tile) {
                    // 방법 1) 완전히 비우기
                    if (typeof obj.removeTileAt === 'function') {
                        obj.removeTileAt(x, y, true); // re-calc faces
                        done = true;
                        return;
                    }
                    // 방법 2) 인덱스를 -1로 바꿔 비우기
                    if (typeof obj.putTileAt === 'function') {
                        obj.putTileAt(-1, x, y);
                        done = true;
                        return;
                    }
                    // 방법 3) 마지막 수단: 투명도 0 (성능/지형충돌 고려시 비추천)
                    if (tile && typeof tile.setAlpha === 'function') {
                        tile.setAlpha(0);
                        done = true;
                        return;
                }
            }
        }
    });

    if (!done) {
        console.warn(`[LightNetworkSystem] Could not hide tile (${x},${y}) on "${layerName}"`);
    }
    }


    private k(x: number, y: number): string {
        return `${x},${y}`;
    }
}
