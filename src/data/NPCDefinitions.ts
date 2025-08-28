import { NPCDefinition } from '../types/MapTypes';

export const NPC_DEFINITIONS: Record<string, NPCDefinition> = {
  merchant_001: { npcId: 'merchant_001', dialogueId: 'merchant', spriteKey: 'merchant' },
  guard_001: { npcId: 'guard_001', dialogueId: 'guard', spriteKey: 'guard' },
  villager_001: { npcId: 'villager_001', dialogueId: 'villager', spriteKey: 'blue' },
  
  elder_001: { npcId: 'elder_001', dialogueId: 'elder', spriteKey: 'guard' },
  villager_water_001: { npcId: 'villager_water_001', dialogueId: 'villager-water', spriteKey: 'blue' },
  villager_water_002: { npcId: 'villager_water_002', dialogueId: 'villager-water', spriteKey: 'blue' },
  villager_water_003: { npcId: 'villager_water_003', dialogueId: 'villager-water', spriteKey: 'blue' },
  child_water_001: { npcId: 'child_water_001', dialogueId: 'child-water', spriteKey: 'blue' },
  child_water_002: { npcId: 'child_water_002', dialogueId: 'child-water', spriteKey: 'blue' },
  child_water_trapped_001: { npcId: 'child_water_trapped_001', dialogueId: 'child-water-trapped', spriteKey: 'blue' },
  guard_water_001: { npcId: 'guard_water_001', dialogueId: 'guard-water', spriteKey: 'guard' },
  whale_sprout_001: { npcId: 'whale_sprout_001', dialogueId: 'whale-sprout', spriteKey: 'merchant' }
};

