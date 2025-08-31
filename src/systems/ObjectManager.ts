import Phaser from 'phaser';
import { ActionProcessor } from './ActionProcessor';
import { ObjectDef, ObjectKind, ObjectsState } from '../types/ObjectTypes';
import { WorldObject } from '../entities/objects/WorldObject';
import { HazardObject } from '../entities/objects/HazardObject';
import { BlockerObject } from '../entities/objects/BlockerObject';
import { MovableObject } from '../entities/objects/MovableObject';
import { InteractiveObject } from '../entities/objects/InteractiveObject';
import { CliffWateringCan } from '../entities/objects/CliffWateringCan';
import { BurningVine } from '../entities/objects/BurningVine';
import { SaveManager } from './SaveManager';

export class ObjectManager {
  private scene: Phaser.Scene;
  private objects: Map<string, WorldObject> = new Map();
  private container!: Phaser.GameObjects.Container;
  private actionRunner: ActionProcessor;
  private tileSize = 64;
  private tilesTextureKey = 'tiles';
  private spaceKey!: Phaser.Input.Keyboard.Key;
  private mapId: string = '';
  private players: Phaser.Physics.Arcade.Sprite[] = [];

  constructor(scene: Phaser.Scene, actionRunner: ActionProcessor) {
    this.scene = scene;
    this.actionRunner = actionRunner;
  }

  public async load(mapId: string, tilesTextureKey: string, tileSize: number): Promise<void> {
    this.unload();
    this.mapId = mapId;
    this.tileSize = tileSize;
    this.tilesTextureKey = tilesTextureKey;
    this.container = this.scene.add.container(0, 0);
    this.container.setDepth(900); // ensure above most map layers

    // key
    this.spaceKey = this.scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

    // fetch objects list
    let list: ObjectDef[] = [];
    try {
      const res = await fetch(`assets/maps/${mapId}/objects.json`, { cache: 'no-cache' });
      if (res.ok) {
        list = await res.json();
      }
    } catch {}

    // restore state
    const state = (SaveManager.loadGame() as any).objectsState?.[mapId] as ObjectsState | undefined;

    for (const def of list) {
      if (!def || !def.id) continue;
      // restore per object
      const s = state?.[def.id];
      if (s?.destroyed) continue;
      if (typeof s?.hp === 'number') def.hp = s.hp;
      if (typeof s?.posX === 'number') def.pos.x = s.posX;
      if (typeof s?.posY === 'number') def.pos.y = s.posY;

      const obj = this.createObject(def);
      obj.enablePhysics(this.tilesTextureKey);
      this.objects.set(def.id, obj);
    }
  }

  public attachPlayers(playerSprites: Phaser.Physics.Arcade.Sprite[]): void {
    this.players = playerSprites;
    // bind overlaps for hazard/interactive
    const objs = Array.from(this.objects.values());
    for (const obj of objs) {
      if (obj instanceof HazardObject || obj instanceof InteractiveObject) {
        for (const p of playerSprites) {
          if (obj instanceof HazardObject) {
            obj.bindOverlap(p, (enter) => {
              if (enter) {
                // handled inside object
              }
            });
          } else if (obj instanceof InteractiveObject) {
            // proper enter overlap wiring (one-time)
            obj.bindOverlap(p);
            // leave detection using Arcade Physics overlap check
            this.scene.physics.world.on('worldstep', () => {
              const inside = this.scene.physics.overlap(obj.sprite as any, p as any);
              if (!inside && (obj as any).getIsPlayerInside?.()) {
                (obj as any).onPlayerLeave?.();
              }
            });
          }
        }
      }
      if (obj instanceof BlockerObject || obj instanceof MovableObject) {
        for (const p of playerSprites) {
          this.scene.physics.add.collider(p, obj.sprite as any);
        }
      }
    }
  }

  private createObject(def: ObjectDef): WorldObject {
    // 커스텀 클래스 체크
    const customClass = (def as any).customClass;
    if (customClass) {
      const x = def.pos.x * this.tileSize;
      const y = def.pos.y * this.tileSize;
      
      switch (customClass) {
        case 'CliffWateringCan':
          return new CliffWateringCan(this.scene, x, y);
        case 'BurningVine':
          return new BurningVine(this.scene, x, y);
      }
    }
    
    // 기본 클래스
    switch (def.kind as ObjectKind) {
      case 'hazard':
        return new HazardObject(this.scene, def as any, this.tileSize, this.actionRunner);
      case 'blocker':
        return new BlockerObject(this.scene, def as any, this.tileSize, this.actionRunner);
      case 'movable':
        return new MovableObject(this.scene, def as any, this.tileSize, this.actionRunner);
      case 'interactive':
      default:
        return new InteractiveObject(this.scene, def as any, this.tileSize, this.actionRunner);
    }
  }

  public update(_time: number, delta: number): void {
    // SPACE interaction
    if (Phaser.Input.Keyboard.JustDown(this.spaceKey)) {
      // trigger nearest interactive inside
      const interactives = Array.from(this.objects.values()).filter(o => o instanceof InteractiveObject) as InteractiveObject[];
      for (const io of interactives) {
        io.tryInteractWith(this.players, this.scene.physics.world);
      }
    }

    for (const obj of this.objects.values()) {
      obj.update(delta);
    }

    // optional: leave detection for interactive (bounds overlap check)
    // skipped for brevity on this iteration
  }

  public saveState(): void {
    const data = SaveManager.loadGame();
    const perMap = ((data as any).objectsState || {}) as Record<string, ObjectsState>;
    const mapState: ObjectsState = {};
    this.objects.forEach((obj: any, id) => {
      mapState[id] = {
        id,
        hp: obj.def?.hp,
        destroyed: !obj.sprite || (obj.sprite as any).active === false,
        posX: (obj.sprite as any)?.x,
        posY: (obj.sprite as any)?.y
      };
    });
    perMap[this.mapId] = mapState;
    (data as any).objectsState = perMap;
    SaveManager.saveGame(data);
  }

  public getById<T extends WorldObject = WorldObject>(id: string): T | undefined {
    return this.objects.get(id) as T | undefined;
  }

  public unload(): void {
    if (this.container) {
      this.container.destroy();
    }
    this.objects.forEach((o) => (o as any).sprite?.destroy?.());
    this.objects.clear();
  }
}

