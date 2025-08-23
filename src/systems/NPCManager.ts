import Phaser from 'phaser';
import { NPC } from '../entities/NPC';
import { Player } from '../entities/Player';
import { GlobalVariableManager } from './GlobalVariableManager';

export interface NPCConfig {
  npcId: string;
  dialogueId: string;
  x: number;
  y: number;
  spriteKey?: string;
}

export class NPCManager {
  private scene: Phaser.Scene;
  private npcs: Map<string, NPC> = new Map();
  private npcGroup: Phaser.Physics.Arcade.Group;
  private interactionGroup: Phaser.Physics.Arcade.Group;
  private player: Player;
  private overlapCollider: Phaser.Physics.Arcade.Collider | null = null;
  private worldStepHandler: (() => void) | null = null;

  constructor(scene: Phaser.Scene, player: Player) {
    this.scene = scene;
    this.player = player;

    // NPC 그룹 생성
    this.npcGroup = scene.physics.add.group();
    this.interactionGroup = scene.physics.add.group();

    this.setupCollisions();
  }

  private setupCollisions(): void {
    // 플레이어와 NPC 상호작용 영역 충돌 감지
    this.overlapCollider = this.scene.physics.add.overlap(
      this.player.sprite,
      this.interactionGroup,
      this.onPlayerEnterNPC.bind(this),
      undefined,
      this.scene
    );

    // 플레이어가 NPC 영역에서 나갈 때 감지 (매 프레임 체크)
    this.worldStepHandler = this.checkPlayerExitNPC.bind(this);
    this.scene.physics.world.on('worldstep', this.worldStepHandler);
  }

  // NPC 추가
  public addNPC(config: NPCConfig): NPC {
    const npc = new NPC(
      this.scene,
      config.x,
      config.y,
      config.npcId,
      config.dialogueId,
      config.spriteKey || 'npc'
    );

    this.npcs.set(config.npcId, npc);
    this.npcGroup.add(npc.sprite);
    this.interactionGroup.add(npc.interactionZone);

    console.log(`NPC 추가됨: ${config.npcId} at (${config.x}, ${config.y})`);
    return npc;
  }

  // NPC 제거
  public removeNPC(npcId: string): void {
    const npc = this.npcs.get(npcId);
    if (npc) {
      this.npcGroup.remove(npc.sprite);
      this.interactionGroup.remove(npc.interactionZone);
      npc.destroy();
      this.npcs.delete(npcId);
      console.log(`NPC 제거됨: ${npcId}`);
    }
  }

  // NPC 가져오기
  public getNPC(npcId: string): NPC | undefined {
    return this.npcs.get(npcId);
  }

  // 모든 NPC 가져오기
  public getAllNPCs(): NPC[] {
    return Array.from(this.npcs.values());
  }

  // 플레이어가 NPC 영역에 진입했을 때
  private onPlayerEnterNPC(
    _player: any,
    interactionZone: any
  ): void {
    // 덩굴 확장 중 상호작용 차단
    if (GlobalVariableManager.getInstance().get('collision')) return;
    const npc = (interactionZone as Phaser.Physics.Arcade.Sprite).getData('npc') as NPC;
    if (npc && !npc.isPlayerNearby) {
      npc.onPlayerEnter();
      console.log(`플레이어가 ${npc.npcId} 근처에 도착`);
    }
  }

  // 플레이어가 NPC 영역에서 나갔는지 매 프레임 체크
  private checkPlayerExitNPC(): void {
    const playerBounds = this.player.sprite.getBounds();

    this.npcs.forEach((npc) => {
      if (npc.isPlayerNearby) {
        const interactionBounds = npc.interactionZone.getBounds();
        
        // 플레이어가 상호작용 영역을 벗어났는지 확인
        if (!Phaser.Geom.Rectangle.Overlaps(playerBounds, interactionBounds)) {
          npc.onPlayerLeave();
          console.log(`플레이어가 ${npc.npcId}에서 멀어짐`);
        }
      }
    });
  }

  // 현재 상호작용 가능한 NPC 찾기
  public getCurrentInteractableNPC(): NPC | null {
    // 덩굴 확장 중 상호작용 불가
    if (GlobalVariableManager.getInstance().get('collision')) return null;
    for (const npc of this.npcs.values()) {
      if (npc.canStartDialogue()) {
        return npc;
      }
    }
    return null;
  }

  // 모든 NPC 업데이트
  public update(): void {
    this.npcs.forEach((npc) => {
      npc.update();
    });
  }

  // 모든 NPC 제거
  public destroy(): void {
    this.npcs.forEach((npc) => {
      npc.destroy();
    });
    this.npcs.clear();
    if (this.overlapCollider) {
      this.overlapCollider.destroy();
      this.overlapCollider = null;
    }
    if (this.worldStepHandler) {
      this.scene.physics.world.off('worldstep', this.worldStepHandler);
      this.worldStepHandler = null;
    }
    this.npcGroup.destroy(true);
    this.interactionGroup.destroy(true);
  }

  // 디버그: NPC 상태 출력
  public debugInfo(): void {
    console.log('=== NPC Manager Debug Info ===');
    console.log(`총 NPC 수: ${this.npcs.size}`);
    this.npcs.forEach((npc, id) => {
      console.log(`${id}: 위치(${npc.sprite.x}, ${npc.sprite.y}), 근처: ${npc.isPlayerNearby}`);
    });
  }
} 