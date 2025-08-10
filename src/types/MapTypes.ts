export interface MapTile {
  id: string; // frame index in spritesheet, but provided as string in json
  x: number;  // tile x index (grid)
  y: number;  // tile y index (grid)
}

export interface MapLayer {
  name: string;
  tiles: MapTile[];
  collider: boolean;
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

