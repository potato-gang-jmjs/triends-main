export type ObjectKind = 'hazard' | 'blocker' | 'movable' | 'interactive' | 'emitter';

export type ColliderKind = 'none' | 'static' | 'dynamic' | 'sensor';

export type SpriteRef =
  | { type: 'tiles'; frameId: string }
  | { type: 'sprite'; key: string; frame?: number };

export interface ObjectPosition {
  x: number; // world coordinates (pixels)
  y: number; // world coordinates (pixels)
}

export interface ObjectDefBase {
  id: string;
  kind: ObjectKind;
  pos: ObjectPosition;
  sprite: SpriteRef;
  collider: ColliderKind;
  depth?: number;
  tags?: string[];
  visible?: boolean;
  scale?: number;
  rotation?: number;
  // state
  hp?: number;
  maxHp?: number;
  destructible?: boolean;
  // movement
  gridSnapped?: boolean; // default false; if true, helper moves by tile grid
  speed?: number; // optional movement speed for movable objects
  constraints?: {
    bounds?: { x: [number, number]; y: [number, number] };
    axis?: 'x' | 'y' | 'both';
  };
  // hooks (ActionProcessor-compatible strings)
  onEnter?: string;      // when player enters sensor/overlap
  onLeave?: string;      // when player leaves sensor/overlap
  onInteract?: string;   // when SPACE pressed while nearby
  onDestroyed?: string;  // when hp reaches 0
  onMoved?: string;      // when moved by code
}

export interface HazardOptions {
  damage?: number;        // default action if onEnter not provided
  intervalMs?: number;    // periodic damage interval while overlapping
  knockback?: number;     // optional knockback strength
}

export type HazardDef = ObjectDefBase & {
  kind: 'hazard';
} & HazardOptions;

export type BlockerDef = ObjectDefBase & {
  kind: 'blocker';
};

export type MovableDef = ObjectDefBase & {
  kind: 'movable';
};

export type InteractiveDef = ObjectDefBase & {
  kind: 'interactive';
};

export type ObjectDef = HazardDef | BlockerDef | MovableDef | InteractiveDef;

export interface ObjectsStateEntry {
  id: string;
  destroyed?: boolean;
  hp?: number;
  posX?: number;
  posY?: number;
  custom?: Record<string, any>;
}

export type ObjectsState = Record<string, ObjectsStateEntry>; // by object id

