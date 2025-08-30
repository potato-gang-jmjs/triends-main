export interface MapTile {
  id: string; // frame index in spritesheet, but provided as string in json
  x: number;  // tile x index (grid)
  y: number;  // tile y index (grid)
}

export interface MapLayer {
  name: string;
  tiles: MapTile[];
  collider: boolean;
  is_water?: boolean; // 물 타일 레이어 여부
}

export interface MapData {
  tileSize: number;     // pixels per tile (e.g., 64)
  mapWidth: number;     // tiles horizontally
  mapHeight: number;    // tiles vertically
  layers: MapLayer[];
}

export interface TileMetaRule {
  /** optional tags like 'water', 'lava', etc. */
  tags?: string[];
  /** requires all flags to be truthy in GlobalVariableManager to pass */
  requires?: string[];
}

export type TilesMeta = Record<string, TileMetaRule>;

// ───── Portal types ─────
export interface PortalArea {
  /** tile grid x of the top-left cell */
  x: number;
  /** tile grid y of the top-left cell */
  y: number;
  /** width in tiles */
  width: number;
  /** height in tiles */
  height: number;
}

export interface PortalTargetSpawn {
  /** tile grid x of spawn cell */
  x: number;
  /** tile grid y of spawn cell */
  y: number;
}

export interface PortalTarget {
  /** target map id (used as `map:<mapId>` for cache key) */
  mapId: string;
  /** spawn tile position in target map */
  spawn: PortalTargetSpawn;
}

export interface PortalOptions {
  /** optional fade duration in ms when transitioning */
  fadeMs?: number;
}

export interface PortalDef {
  id: string;
  area: PortalArea;
  target: PortalTarget;
  options?: PortalOptions;
}

// ───── NPC types for data-driven spawns ─────
export interface NPCDefinition {
  npcId: string;
  dialogueId: string;
  spriteKey: string;
  frame?: number;
  interactionRadius?: number;
}

export interface NPCSpawnDef {
  npcId: string;
  pos: { x: number; y: number }; // tile coordinates
  overrides?: {
    dialogueId?: string;
    spriteKey?: string;
    frame?: number;
  };
}

