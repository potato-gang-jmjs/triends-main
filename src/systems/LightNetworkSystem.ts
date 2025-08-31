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
    private readonly lampOffLayerName = 'lamps_off';
    private readonly lampOnLayerName = 'lamps_on';
    private readonly flowerOffLayerName = 'flowers_off';
    private readonly flowerOnLayerName = 'flowers_on';


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

        const wiresLayer = map.layers.find(l => l.name === 'wires');
        if (!wiresLayer) {
            console.warn('[LightNetworkSystem] Required layer missing: wires');
            return;
        }

        // wires 좌표 수집
        this.wiresSet.clear();
        for (const t of wiresLayer.tiles) {
            if (hasXY(t)) this.wiresSet.add(this.k(t.x, t.y));
        }

        // 새 구조: lamp_off / flower_off 우선
        const lampOff = map.layers.find(l => l.name === this.lampOffLayerName);
        const flowerOff = map.layers.find(l => l.name === this.flowerOffLayerName);

        this.lampTiles = new Set();
        this.deviceTiles.clear();

        if (lampOff && flowerOff) {
            for (const t of lampOff.tiles) {
            if (hasXY(t)) this.lampTiles.add(this.k(t.x, t.y));
            }
            for (const t of flowerOff.tiles) {
            if (hasXY(t)) this.deviceTiles.set(this.k(t.x, t.y), { x: t.x, y: t.y });
            }
        } else {
            // 하위 호환: devices_off 에서 램프 클러스터 추출 (구맵)
            const devicesLayer = map.layers.find(l => l.name === 'devices_off');
            if (!devicesLayer) {
            console.warn('[LightNetworkSystem] Neither (lamp_off/flower_off) nor devices_off found');
            return;
            }
            const deviceCandidates: TileXY[] = [];
            for (const t of devicesLayer.tiles) if (hasXY(t)) deviceCandidates.push({ x: t.x, y: t.y });
            this.detectLampCluster(deviceCandidates);
            for (const d of deviceCandidates) {
            const key = this.k(d.x, d.y);
            if (!this.lampTiles.has(key)) this.deviceTiles.set(key, d);
            }
        }

        // 램프 둘레에서 BFS 시작점 구성 → 전파 집합 계산
        this.reachableWireSet.clear();
        this.computeReachableWires();
        }


    /** devices_off 좌표에서 4x4(≈16칸) 램프 클러스터를 우선 식별 (가장 큰 클러스터가 아님) */
    private detectLampCluster(devices: TileXY[]): void {
        const devicesSet = new Set(devices.map(p => this.k(p.x, p.y)));
        const visited = new Set<string>();
        const clusters: string[][] = [];

        for (const t of devices) {
        const startKey = this.k(t.x, t.y);
        if (visited.has(startKey)) continue;

        const cluster: string[] = [];
        const q: TileXY[] = [{ x: t.x, y: t.y }];
        visited.add(startKey);

        while (q.length) {
            const { x, y } = q.shift()!;
            const k = this.k(x, y);
            cluster.push(k);

            const nb: TileXY[] = [
            { x: x + 1, y }, { x: x - 1, y },
            { x, y: y + 1 }, { x, y: y - 1 },
            ];
            for (const n of nb) {
            const nk = this.k(n.x, n.y);
            if (!visited.has(nk) && devicesSet.has(nk)) {
                visited.add(nk);
                q.push(n);
            }
            }
        }

        if (cluster.length) clusters.push(cluster);
        }

        // 4x4 후보를 가장 우선으로 선택
        const boundsOf = (cl: string[]) => {
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (const kk of cl) {
            const { x, y } = parseKeyToXY(kk);
            if (x < minX) minX = x; if (y < minY) minY = y;
            if (x > maxX) maxX = x; if (y > maxY) maxY = y;
        }
        return { minX, minY, maxX, maxY, w: maxX - minX + 1, h: maxY - minY + 1 };
        };

        let chosen: string[] = [];
        // 1) 정확히 4x4 이면서 12~16칸 채워진 클러스터를 우선 선택
        for (const cl of clusters) {
        const { w, h } = boundsOf(cl);
        if (w === 4 && h === 4 && cl.length >= 12) { chosen = cl; break; }
        }
        // 2) 없다면, 4x4에 가장 가까운(가로/세로 오차 최소) 클러스터로 폴백
        if (chosen.length === 0 && clusters.length) {
        const score = (cl: string[]) => {
            const { w, h } = boundsOf(cl);
            const rectPenalty = Math.abs(w - 4) + Math.abs(h - 4); // 작을수록 좋음
            return -rectPenalty * 100 + cl.length; // tie-breaker: 큰 것 선호
        };
        clusters.sort((a, b) => score(b) - score(a));
        chosen = clusters[0] ?? [];
        const b = boundsOf(chosen);
        console.warn(
            '[LightNetworkSystem] 정확한 4x4 램프를 찾지 못해 근사치 사용:',
            { width: b.w, height: b.h, size: chosen.length }
        );
        }

        this.lampTiles = new Set(chosen);
        if (this.lampTiles.size === 0) {
        console.warn('[LightNetworkSystem] 4x4 램프 클러스터를 식별하지 못함. devices_off 크기:', devices.length);
        }
    }


    /** 램프 둘레에서 시작해서 wires 위로 BFS → 도달 집합 계산 */
    private computeReachableWires(): void {
        const b = this.getLampBoundsInTiles();
        if (!b) return;

        const { minX, minY, maxX, maxY } = b;
        const tryPush = (x: number, y: number) => {
        const key = this.k(x, y);
        if (this.wiresSet.has(key)) starts.push(key);
        };

        const starts: string[] = [];
        for (let x = minX - 1; x <= maxX + 1; x++) {
        tryPush(x, minY - 1);
        tryPush(x, maxY + 1);
        }
        for (let y = minY - 1; y <= maxY + 1; y++) {
        tryPush(minX - 1, y);
        tryPush(maxX + 1, y);
        }

        const visited = new Set<string>();
        const q: string[] = [];
        for (const s of starts) { visited.add(s); q.push(s); }

        while (q.length) {
        const cur = q.shift()!;
        this.reachableWireSet.add(cur);
        const { x: cx, y: cy } = parseKeyToXY(cur);
        const nb = [
            this.k(cx + 1, cy), this.k(cx - 1, cy),
            this.k(cx, cy + 1), this.k(cx, cy - 1),
        ];
        for (const nk of nb) {
            if (this.wiresSet.has(nk) && !visited.has(nk)) {
            visited.add(nk);
            q.push(nk);
            }
        }
        }
    }

    /** 64x64 램프 센서 생성 (가시화 X) */
    private createLampSensor(): void {
        const b = this.getLampBoundsInTiles();
        if (!b) return;

        const centerX = (b.minX + b.maxX + 1) * 0.5 * this.tileSize;
        const centerY = (b.minY + b.maxY + 1) * 0.5 * this.tileSize;
        const w = (b.maxX - b.minX + 1) * this.tileSize;
        const h = (b.maxY - b.minY + 1) * this.tileSize;

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
        this.setLayerVisible(this.lampOffLayerName, false);
        this.flashLamp();
        this.rippleAlongWires(() => this.triggerFlowers());
    }

    private flashLamp(): void {
        const b = this.getLampBoundsInTiles();
        if (!b) return;

        const x = (b.minX + b.maxX + 1) * 0.5 * this.tileSize;
        const y = (b.minY + b.maxY + 1) * 0.5 * this.tileSize;
        const r = Math.max(b.maxX - b.minX + 1, b.maxY - b.minY + 1) * this.tileSize * 0.6;

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

            // 효과: 살짝 번쩍
            const glow = this.scene.add.circle(cx, cy, this.tileSize * 0.45, 0xffffff, 0.95);
            glow.setBlendMode(Phaser.BlendModes.ADD).setDepth(1260);
            this.overlay.add(glow);
            this.scene.tweens.add({
            targets: glow, alpha: 0, duration: 380, onComplete: () => glow.destroy()
            });

            // 핵심: flower_off 해당 타일만 숨김 → 아래 깔린 flower_on 이 드러남
            this.hideTileFromLayer(this.flowerOffLayerName, t.x, t.y);
        }
    }

    /** 레이어 전체 가시성 토글 (MapLoader가 제공하면 우선 사용) */
    private setLayerVisible(layerName: string, visible: boolean): void {
    const mapKey = `map:${this.mapId}`;
    const ml: any = MapLoader as any;
    if (ml && typeof ml.setLayerVisible === 'function') {
        ml.setLayerVisible(this.scene, mapKey, layerName, visible);
        return;
    }
    const names = [`layer:${this.mapId}:${layerName}`, `layer:${layerName}`];
    for (const nm of names) {
        const obj = this.scene.children.getByName(nm) as any;
        if (obj && typeof obj.setVisible === 'function') { obj.setVisible(visible); return; }
    }
    console.warn(`[LightNetworkSystem] Could not toggle layer ${layerName} (no handle)`);
    }

    /** 해당 레이어의 (x,y) 타일만 숨김 → 아래 on 타일이 드러남 */
    private hideTileFromLayer(layerName: string, x: number, y: number): void {
    const mapKey = `map:${this.mapId}`;
    const ml: any = MapLoader as any;

    // 1) MapLoader에 개별 타일 가시성 API가 있으면 우선 사용
    if (ml && typeof ml.setTileVisible === 'function') {
        ml.setTileVisible(this.scene, mapKey, layerName, x, y, false);
        return;
    }

    // 2) 레이어 컨테이너에서 (타일 원점 기준) 자식 찾기
    const names = [`layer:${this.mapId}:${layerName}`, `layer:${layerName}`];
    const tlx = x * this.tileSize;   // 대부분의 타일은 origin (0,0)로 배치
    const tly = y * this.tileSize;
    for (const nm of names) {
        const layer = this.scene.children.getByName(nm) as any;
        if (layer && Array.isArray(layer.list)) {
        const child = layer.list.find((o: any) =>
            Math.abs((o.x ?? -9999) - tlx) < 0.5 && Math.abs((o.y ?? -9999) - tly) < 0.5
        );
        if (child && typeof child.setVisible === 'function') { child.setVisible(false); return; }
        }
    }

    console.warn(`[LightNetworkSystem] Could not hide tile (${x},${y}) on ${layerName}`);
    }

    /** 램프(4x4)의 타일 경계 */
    private getLampBoundsInTiles():
        | { minX: number; minY: number; maxX: number; maxY: number }
        | null {
        if (this.lampTiles.size === 0) return null;
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (const key of this.lampTiles) {
        const { x, y } = parseKeyToXY(key); // 여기서도 확정 타입
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
        }
        return { minX, minY, maxX, maxY };
    }

    private k(x: number, y: number): string {
        return `${x},${y}`;
    }
}
