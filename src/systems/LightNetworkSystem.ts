// src/systems/LightNetworkSystem.ts
import Phaser from 'phaser';
import { MapLoader } from './MapLoader';
import { MapData, MapTile } from '../types/MapTypes';
// import { MapLayer } from '../types/MapTypes'; // 사용되지 않음

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
    // private readonly lampsOnLayerName = 'lamps_on'; // 사용되지 않음
    private readonly flowersOffLayerName = 'flowers_off';
    // private readonly flowersOnLayerName = 'flowers_on'; // 사용되지 않음

    private overlay: Phaser.GameObjects.Container;
    private lampSensorBody?: Phaser.Physics.Arcade.Image;
    // private activated = false; // 사용되지 않음


    /** wires 좌표 집합 ("x,y") */
    private readonly wiresSet: Set<string> = new Set();
    /** devices_off 중 '꽃'만 남긴 좌표 (키: "x,y") */
    private readonly deviceTiles: Map<string, TileXY> = new Map();
    /** 램프(4x4) 타일 집합 (키: "x,y") */
    private lampTiles: Set<string> = new Set();
    /** 램프에서 도달 가능한 wire 좌표 집합 ("x,y") */
    private readonly reachableWireSet: Set<string> = new Set();

        /** ── Multi-lamp support (light-village-2용) ───────────────────────────── */
    private readonly simultaneousWindowMs = 500;
    private lampClusters: Array<{
        id: number;
        tiles: Set<string>;
        bbox: { minX: number; minY: number; maxX: number; maxY: number };
        sensor?: Phaser.Physics.Arcade.Image;
        reachable: Set<string>;
        revealed: boolean; // lamps_off에서 이미 꺼진(=켜진) 상태인지
    }> = [];
    private lampActivatedAt: Map<number, number> = new Map();

    private flowerGroups: Array<{
        id: number;
        tiles: TileXY[];
        required: Set<number>;
        cleared: boolean;
        center: { x: number; y: number };
    }> = [];


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
        // this.activated = false; // 사용되지 않음
    }

    /** 램프 클러스터별로 레이저 overlap 연결 */
    public attachLaserGroup(lasers: Phaser.Physics.Arcade.Group): void {
        if (!this.lampClusters.length) return;

        for (const cluster of this.lampClusters) {
            if (!cluster.sensor) continue;

            this.scene.physics.add.overlap(
                cluster.sensor,
                lasers,
                (_lamp, laser) => {
                    const s = laser as Phaser.Physics.Arcade.Sprite;
                    if (s.active) {
                        s.disableBody(true, true);
                        s.destroy();
                    }

                    const now = this.scene.time.now;
                    this.lampActivatedAt.set(cluster.id, now);

                    this.flashLampCluster(cluster);               // 클러스터 중심 플래시
                    this.rippleAlongWireSet(cluster.reachable);   // 해당 클러스터 와이어로 파동

                    // 바로 켜지지 않는다. (동시성 판정에서만 켬)
                    this.tryTriggerMultiLampFlowers();

                },
                undefined,
                this
            );
        }
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

        // 클러스터/센서/도달 와이어 및 꽃 그룹 선계산
        this.buildLampClustersFromLampTiles();
        this.buildFlowerGroups();
    }



    /** 램프 둘레에서 시작해서 wires 위로 BFS → 도달 집합 계산 */
    // private computeReachableWires(): void {
    //     this.reachableWireSet.clear();

    //     const starts: string[] = [];
    //     const seen = new Set<string>();

    //     for (const key of this.lampTiles) {
    //         const { x, y } = parseKeyToXY(key);
    //         const adj = [ this.k(x+1,y), this.k(x-1,y), this.k(x,y+1), this.k(x,y-1) ];
    //         for (const a of adj) {
    //             if (this.wiresSet.has(a) && !seen.has(a)) {
    //                 seen.add(a);
    //                 starts.push(a);
    //             }
    //         }
    //     }

    //     const visited = new Set<string>(starts);
    //     const q = [...starts];
    //     while (q.length) {
    //         const cur = q.shift()!;
    //         this.reachableWireSet.add(cur);
    //         const { x: cx, y: cy } = parseKeyToXY(cur);
    //         const nb = [ this.k(cx+1,cy), this.k(cx-1,cy), this.k(cx,cy+1), this.k(cx,cy-1) ];
    //         for (const nk of nb) {
    //             if (this.wiresSet.has(nk) && !visited.has(nk)) {
    //                 visited.add(nk);
    //                 q.push(nk);
    //             }
    //         }
    //     }
    // }

        /** lamps_off 타일 집합을 4방향 인접 기준으로 클러스터화하고,
     *  각 클러스터에 대해 센서(physics body)와 도달 가능 wire 집합을 계산한다. */
    private buildLampClustersFromLampTiles(): void {
        this.lampClusters = [];

        // 1) flood fill로 클러스터 나누기
        const visited = new Set<string>();
        const dirs = [[1,0],[-1,0],[0,1],[0,-1]] as const;
        const tiles = Array.from(this.lampTiles);

        let nextId = 1;
        for (const key of tiles) {
            if (visited.has(key)) continue;
            const { x: sx, y: sy } = parseKeyToXY(key);
            const q: TileXY[] = [{ x: sx, y: sy }];
            const clusterTiles = new Set<string>();
            let minX = sx, minY = sy, maxX = sx, maxY = sy;

            while (q.length) {
                const { x, y } = q.shift()!;
                const k = this.k(x, y);
                if (visited.has(k) || !this.lampTiles.has(k)) continue;
                visited.add(k);
                clusterTiles.add(k);
                if (x < minX) minX = x; if (y < minY) minY = y;
                if (x > maxX) maxX = x; if (y > maxY) maxY = y;

                for (const [dx, dy] of dirs) {
                    const nx = x + dx, ny = y + dy;
                    const nk = this.k(nx, ny);
                    if (!visited.has(nk) && this.lampTiles.has(nk)) {
                        q.push({ x: nx, y: ny });
                    }
                }
            }

            const bbox = { minX, minY, maxX, maxY };
            const reachable = this.computeReachableWiresFor(clusterTiles);
            this.lampClusters.push({ id: nextId++, tiles: clusterTiles, bbox, reachable, revealed: false });
        }

        // 2) 클러스터별 센서 생성 (램프 타일 외곽에 딱 맞는 직사각형)
        for (const c of this.lampClusters) {
            const centerX = (c.bbox.minX + c.bbox.maxX + 1) * 0.5 * this.tileSize;
            const centerY = (c.bbox.minY + c.bbox.maxY + 1) * 0.5 * this.tileSize;
            const w = (c.bbox.maxX - c.bbox.minX + 1) * this.tileSize;
            const h = (c.bbox.maxY - c.bbox.minY + 1) * this.tileSize;

            const img = this.scene.physics.add.image(centerX, centerY, undefined as unknown as string);
            img.setVisible(false).setActive(true);
            const body = img.body as Phaser.Physics.Arcade.Body;
            body.setAllowGravity(false);
            body.setImmovable(true);
            body.setSize(w, h);
            body.setOffset(-w / 2, -h / 2);
            c.sensor = img;
        }
    }

    /** 특정 램프 클러스터에서 시작해 wires 위로 BFS → 도달 집합 계산 */
    private computeReachableWiresFor(clusterTiles: Set<string>): Set<string> {
        const starts: string[] = [];
        const seen = new Set<string>();

        for (const key of clusterTiles) {
            const { x, y } = parseKeyToXY(key);
            const adj = [ this.k(x+1,y), this.k(x-1,y), this.k(x,y+1), this.k(x,y-1) ];
            for (const a of adj) {
                if (this.wiresSet.has(a) && !seen.has(a)) {
                    seen.add(a);
                    starts.push(a);
                }
            }
        }

        const reachable = new Set<string>();
        const visited = new Set<string>(starts);
        const q = [...starts];
        while (q.length) {
            const cur = q.shift()!;
            reachable.add(cur);
            const { x: cx, y: cy } = parseKeyToXY(cur);
            const nb = [ this.k(cx+1,cy), this.k(cx-1,cy), this.k(cx,cy+1), this.k(cx,cy-1) ];
            for (const nk of nb) {
                if (this.wiresSet.has(nk) && !visited.has(nk)) {
                    visited.add(nk);
                    q.push(nk);
                }
            }
        }
        return reachable;
    }

    /** flowers_off 레이어를 미리 그룹화하고, 각 그룹에 필요한 램프 클러스터 집합을 계산 */
    private buildFlowerGroups(): void {
        this.flowerGroups = [];
        const visited = new Set<string>();
        const all = Array.from(this.deviceTiles.values());

        let gid = 1;
        for (const t of all) {
            const key = this.k(ensureNumber(t.x, 'flower.x'), ensureNumber(t.y, 'flower.y'));
            if (visited.has(key)) continue;

            const tiles = this.collectContiguousFlowers(t.x!, t.y!, visited);
            if (!tiles.length) continue;

            // 중심좌표 (이펙트용)
            const cx = (tiles.reduce((s,v)=>s+v.x,0)/tiles.length + 0.5) * this.tileSize;
            const cy = (tiles.reduce((s,v)=>s+v.y,0)/tiles.length + 0.5) * this.tileSize;

            // 이 그룹이 연결된 램프 클러스터 집합 계산
            const required = new Set<number>();
            for (const c of this.lampClusters) {
                let touches = false;
                for (const g of tiles) {
                    const adj = [ this.k(g.x+1,g.y), this.k(g.x-1,g.y), this.k(g.x,g.y+1), this.k(g.x,g.y-1) ];
                    if (adj.some(a => c.reachable.has(a))) { touches = true; break; }
                }
                if (touches) required.add(c.id);
            }

            this.flowerGroups.push({ id: gid++, tiles, required, cleared: false, center: { x: cx, y: cy } });
        }
    }

    /** 해당 클러스터 램프를 '켜진' 상태로 보이도록 off 레이어에서 가린다 */
    private revealLampCluster(cluster: { tiles: Set<string>; revealed: boolean } & any): void {
        if (cluster.revealed) return;
        for (const key of cluster.tiles) {
            const { x, y } = parseKeyToXY(key);
            this.hideTileFromLayer(this.lampsOffLayerName, x, y);
        }
        cluster.revealed = true;
    }

    /** 클러스터의 중심에 플래시 효과 */
    private flashLampCluster(cluster: { bbox: { minX:number; minY:number; maxX:number; maxY:number } }): void {
        const x = (cluster.bbox.minX + cluster.bbox.maxX + 1) * 0.5 * this.tileSize;
        const y = (cluster.bbox.minY + cluster.bbox.maxY + 1) * 0.5 * this.tileSize;
        const r = Math.max(cluster.bbox.maxX - cluster.bbox.minX + 1, cluster.bbox.maxY - cluster.bbox.minY + 1) * this.tileSize * 0.6;
        const circ = this.scene.add.circle(x, y, r, 0xffffaa, 0.6);
        circ.setBlendMode(Phaser.BlendModes.ADD).setDepth(1250);
        this.overlay.add(circ);
        this.scene.tweens.add({
            targets: circ, alpha: 0, duration: 280, onComplete: () => circ.destroy()
        });
    }

    /** 전달된 wire 집합을 따라 짧은 파동 이펙트 */
    private rippleAlongWireSet(wires: Set<string>, onDone?: () => void): void {
        const tiles = Array.from(wires).map(parseKeyToXY);
        let idx = 0;
        const step = () => {
            const batch = tiles.slice(idx, idx + 20);
            idx += 20;
            for (const { x, y } of batch) {
                const cx = (x + 0.5) * this.tileSize;
                const cy = (y + 0.5) * this.tileSize;
                const p = this.scene.add.circle(cx, cy, this.tileSize * 0.35, 0x99ddff, 0.8);
                p.setBlendMode(Phaser.BlendModes.ADD).setDepth(1230);
                this.overlay.add(p);
                this.scene.tweens.add({
                    targets: p, alpha: 0, duration: 220, onComplete: () => p.destroy()
                });
            }
            if (idx < tiles.length) this.scene.time.delayedCall(60, step);
            else if (onDone) onDone();
        };
        step();
    }

    /** 다중 램프 동시(Δt ≤ 0.5s) 점등 판정 후, 조건을 만족하는 꽃 그룹만 제거 */
    private tryTriggerMultiLampFlowers(): void {
        // const now = this.scene.time.now; // 사용되지 않음

        for (const g of this.flowerGroups) {
            if (g.cleared) continue;
            if (!g.required.size) continue; // 연결된 램프가 없으면 건너뜀

            // 필요한 모든 램프의 최근 점등 시각이 존재하고, 서로 0.5s 이내인지 확인
            let minT = Infinity, maxT = -Infinity;
            for (const id of g.required) {
                const t = this.lampActivatedAt.get(id);
                if (t === undefined) { minT = Infinity; break; }
                if (t < minT) minT = t;
                if (t > maxT) maxT = t;
            }
            if (minT === Infinity) continue;

            if (maxT - minT <= this.simultaneousWindowMs) {
                // ── 1) 이 꽃 그룹이 요구하는 모든 "램프 클러스터"를 한꺼번에 켠다 (off → 숨김)
                for (const id of g.required) {
                    const cluster = this.lampClusters.find(c => c.id === id);
                    if (!cluster) continue;
                    this.revealLampCluster(cluster);              // off 레이어 타일 숨김
                }

                // ── 2) 꽃 그룹 제거
                g.cleared = true;
                for (const tile of g.tiles) {
                    const cx = (tile.x + 0.5) * this.tileSize;
                    const cy = (tile.y + 0.5) * this.tileSize;
                    const glow = this.scene.add.circle(cx, cy, this.tileSize * 0.45, 0xffffff, 0.95);
                    glow.setBlendMode(Phaser.BlendModes.ADD).setDepth(1260);
                    this.overlay.add(glow);
                    this.scene.tweens.add({ targets: glow, alpha: 0, duration: 380, onComplete: () => glow.destroy() });

                    this.hideTileFromLayer(this.flowersOffLayerName, tile.x, tile.y);
                }
            }

        }
    }



    /** (구버전 호환) 전체 램프를 하나의 센서로 만들던 방식은 더 이상 사용하지 않음.
     *  대신 buildLampClustersFromLampTiles()에서 클러스터별 센서를 생성한다.
     *  (함수는 남겨두되, 아무 것도 하지 않게 유지) */
    private createLampSensor(): void {
        // no-op (cluster sensors are created in buildLampClustersFromLampTiles)
    }



    /** 점등 → 와이어 파동 → 꽃 트리거 */
    // private propagateAndTrigger(): void {
    //     // 램프 점등: off 레이어를 끄면 on 레이어가 드러남
    //     // this.setLayerVisible(this.lampsOffLayerName, false);
    //     // this.flashLamp();
    //     // this.rippleAlongWires(() => this.triggerFlowers());
    // }

    // private flashLamp(): void {
    //     if (this.lampTiles.size === 0) return;

    //     let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    //     for (const key of this.lampTiles) {
    //         const { x, y } = parseKeyToXY(key);
    //         if (x < minX) minX = x; if (y < minY) minY = y;
    //         if (x > maxX) maxX = x; if (y > maxY) maxY = y;
    //     }

    //     const x = (minX + maxX + 1) * 0.5 * this.tileSize;
    //     const y = (minY + maxY + 1) * 0.5 * this.tileSize;
    //     const r = Math.max(maxX - minX + 1, maxY - minY + 1) * this.tileSize * 0.6;

    //     const circ = this.scene.add.circle(x, y, r, 0xffffaa, 0.6);
    //     circ.setBlendMode(Phaser.BlendModes.ADD).setDepth(1250);
    //     this.overlay.add(circ);
    //     this.scene.tweens.add({
    //         targets: circ, alpha: 0, scale: 1.3, duration: 300,
    //         onComplete: () => circ.destroy()
    //     });
    // }


    /** 와이어를 따라 파동 이펙트 */
    // private rippleAlongWires(onComplete: () => void): void {
    //     // Set<string> → string[] → TileXY[] (실패 시 throw, 반환 타입 확정)
    //     const keys: string[] = Array.from(this.reachableWireSet);
    //     let i = 0;

    //     const step = () => {
    //     if (i >= keys.length) { onComplete(); return; }

    //     const batchKeys = keys.slice(i, i + 12);
    //     i += 12;

    //     for (const key of batchKeys) {
    //         const { x, y } = parseKeyToXY(key); // ← 여기서 TileXY 확정
    //         const cx: number = (x + 0.5) * this.tileSize;
    //         const cy: number = (y + 0.5) * this.tileSize;

    //         const p = this.scene.add.circle(cx, cy, this.tileSize * 0.35, 0x99ddff, 0.8);
    //         p.setBlendMode(Phaser.BlendModes.ADD).setDepth(1230);
    //         this.overlay.add(p);
    //         this.scene.tweens.add({
    //         targets: p, alpha: 0, duration: 220, onComplete: () => p.destroy()
    //         });
    //     }

    //     this.scene.time.delayedCall(60, step);
    //     };

    //     step();
    // }

    /** 꽃 트리거 (레이저 직접 반응 X, wires 전파 도달 시만) */
    // private triggerFlowers(): void {
    //     // 1) 와이어에 닿은 '씨앗' 타일만 먼저 찾기
    //     const seeds: TileXY[] = [];
    //     for (const t of this.deviceTiles.values()) {
    //         const x = ensureNumber(t.x, 'flower.x');
    //         const y = ensureNumber(t.y, 'flower.y');
    //         const adj = [ this.k(x+1,y), this.k(x-1,y), this.k(x,y+1), this.k(x,y-1) ];
    //         if (adj.some(a => this.reachableWireSet.has(a))) {
    //             seeds.push({ x, y });
    //         }
    //     }

    //     // 2) 씨앗 타일마다 'flowers_off'에 연속으로 붙어있는 덩어리를 flood fill로 전부 모아서 지운다
    //     const visited = new Set<string>();
    //     for (const s of seeds) {
    //         const group = this.collectContiguousFlowers(s.x, s.y, visited);
    //         for (const g of group) {
    //             const cx = (g.x + 0.5) * this.tileSize;
    //             const cy = (g.y + 0.5) * this.tileSize;

    //             // (이펙트는 기존과 동일)
    //             const glow = this.scene.add.circle(cx, cy, this.tileSize * 0.45, 0xffffff, 0.95);
    //             glow.setBlendMode(Phaser.BlendModes.ADD).setDepth(1260);
    //             this.overlay.add(glow);
    //             this.scene.tweens.add({
    //                 targets: glow, alpha: 0, duration: 380, onComplete: () => glow.destroy()
    //             });

    //             // 핵심: 덩어리 전체를 숨김 (아래 flowers_on이 드러남)
    //             this.hideTileFromLayer(this.flowersOffLayerName, g.x, g.y);
    //         }
    //     }
    // }


    /** 레이어 전체 가시성 토글: TilemapLayer 우선 탐색 */
    // private setLayerVisible(layerName: string, visible: boolean): void {
        // 1) MapLoader API가 있으면 우선 사용
        // const ml: any = MapLoader as any;
        // const mapKey = `map:${this.mapId}`;
        // if (ml && typeof ml.setLayerVisible === 'function') {
        //     ml.setLayerVisible(this.scene, mapKey, layerName, visible);
        //     return;
        // }

        // 2) Phaser TilemapLayer 직접 탐색
        // let toggled = false;
        // (this.scene.children.list as any[]).forEach((obj: any) => {
        //     // Phaser v3: StaticTilemapLayer/DynamicTilemapLayer 둘 다 layer/name 구조가 있다
        //     const lname: string | undefined =
        //         obj?.layer?.name ?? obj?.tilemapLayer?.layer?.name ?? obj?.name;

        //     const match =
        //         lname === layerName ||
        //         lname?.endsWith(`:${layerName}`) ||
        //         lname === `layer:${this.mapId}:${layerName}` ||
        //         lname === `tilelayer:${this.mapId}:${layerName}`;

        //     if (match) {
        //         if (typeof obj.setVisible === 'function') obj.setVisible(visible);
        //         else if (typeof obj.setAlpha === 'function') obj.setAlpha(visible ? 1 : 0);
        //         toggled = true;
        //     }
        // });

        // if (!toggled) {
        //     console.warn(`[LightNetworkSystem] Could not toggle layer "${layerName}"`);
        // }
    // }


    /** 해당 레이어의 (x,y) 타일을 지워서 아래 on 타일이 드러나게 함 */
    private hideTileFromLayer(layerName: string, x: number, y: number): void {
        let done = false;
        const ml: any = MapLoader as any;
        const mapKey = `map:${this.mapId}`;

        // 1) MapLoader에 개별 타일 토글 API가 있으면 우선 사용
        if (ml && typeof ml.setTileVisible === 'function') {
            ml.setTileVisible(this.scene, mapKey, layerName, x, y, false);
            this.removeColliderAt(layerName, x, y); // ★ 충돌 제거 추가
            return;
        }

        // 2) Spritefusion(Container) 레이어 처리
        {
            let found = false;
            const centerX = x * this.tileSize + this.tileSize / 2;
            const centerY = y * this.tileSize + this.tileSize / 2;
            const targetName = `${layerName}:${x},${y}`;

            (this.scene.children.list as any[]).forEach((obj: any) => {
                if (found) return;

                // 레이어 컨테이너 이름으로 매칭
                if (obj && obj.type === 'Container' && (obj.name === layerName)) {
                    const list = (obj.list || []) as any[];

                    for (const child of list) {
                        // 1) 이름으로 정확 매칭
                        if (child?.name === targetName) {
                            if (typeof child.destroy === 'function') child.destroy();
                            else if (typeof child.setVisible === 'function') child.setVisible(false);
                            found = true;
                            break;
                        }

                        // 2) 좌표로 근사 매칭 (혹시 name이 비어있는 경우 대비)
                        const cx = child?.x, cy = child?.y;
                        if (typeof cx === 'number' && typeof cy === 'number') {
                            if (Math.abs(cx - centerX) < 0.5 && Math.abs(cy - centerY) < 0.5) {
                                if (typeof child.destroy === 'function') child.destroy();
                                else if (typeof child.setVisible === 'function') child.setVisible(false);
                                found = true;
                                break;
                            }
                        }
                    }
                }
            });

            if (found) {
                done = true;
                this.removeColliderAt(layerName, x, y); // ★ 충돌 제거 추가
                return;
            }

        }


        // 3) 씬의 TilemapLayer를 찾아 타일 제거
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
                        this.removeColliderAt(layerName, x, y); // ★ 충돌 제거 추가
                        return;
                    }
                    // 방법 2) 인덱스를 -1로 바꿔 비우기
                    if (typeof obj.putTileAt === 'function') {
                        obj.putTileAt(-1, x, y);
                        done = true;
                        this.removeColliderAt(layerName, x, y); // ★ 충돌 제거 추가
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

    /** flowers_off 레이어에서 시작점과 '연결된' 모든 타일을 수집 (4방향 연결) */
    private collectContiguousFlowers(startX: number, startY: number, visited: Set<string>): TileXY[] {
    const res: TileXY[] = [];
    const q: TileXY[] = [{ x: startX, y: startY }];

    while (q.length) {
        const { x, y } = q.shift()!;
        const key = this.k(x, y);
        if (visited.has(key)) continue;

        // 이 타일이 현재 flowers_off에 실제로 존재하는지 확인
        if (!this.deviceTiles.has(key)) continue;

        visited.add(key);
        res.push({ x, y });

        // 4방향 확장
        q.push({ x: x + 1, y });
        q.push({ x: x - 1, y });
        q.push({ x, y: y + 1 });
        q.push({ x, y: y - 1 });
    }
    return res;
    }

    /** 해당 레이어의 (x,y) 충돌 바디가 있으면 제거 */
    private removeColliderAt(layerName: string, x: number, y: number): void {
        const target = `collider:${layerName}:${x},${y}`;

        // 1) 이름으로 정밀 매칭 (MapCollisionManager에서 붙인 name)
        (this.scene.children.list as any[]).forEach((obj: any) => {
            if (obj?.name === target && typeof obj.destroy === 'function') {
                obj.destroy();
            }
        });

        // 2) 혹시 name이 비어있을 가능성 대비(안전망): data로 재확인
        (this.scene.children.list as any[]).forEach((obj: any) => {
            const ln = obj?.getData?.('layer');
            const d  = obj?.getData?.('tileXY');
            if (ln === layerName && d && d.x === x && d.y === y && typeof obj.destroy === 'function') {
                obj.destroy();
            }
        });
    }


    private k(x: number, y: number): string {
        return `${x},${y}`;
    }
}
