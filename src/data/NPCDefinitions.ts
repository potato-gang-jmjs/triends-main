import { NPCDefinition } from '../types/MapTypes';

export const NPC_DEFINITIONS: Record<string, NPCDefinition> = {
  merchant_001: { npcId: 'merchant_001', dialogueId: 'merchant', spriteKey: 'merchant' },
  guard_001: { npcId: 'guard_001', dialogueId: 'guard', spriteKey: 'guard' },
  alien_001: { npcId: 'alien_001', dialogueId: 'alien_001', spriteKey: 'first_residents', frame: 0 },
  alien_002: { npcId: 'alien_002', dialogueId: 'alien_002', spriteKey: 'first_residents', frame: 1 },
  alien_003: { npcId: 'alien_003', dialogueId: 'alien_003', spriteKey: 'first_residents', frame: 2 },
  villager_water_001: { npcId: 'villager_water_001', dialogueId: 'villager-water', spriteKey: 'water_residents', frame: 0 },
  villager_water_002: { npcId: 'villager_water_002', dialogueId: 'villager-water', spriteKey: 'water_residents', frame: 1 },
  villager_water_003: { npcId: 'villager_water_003', dialogueId: 'villager-water', spriteKey: 'water_residents', frame: 2 },
  child_water_001: { npcId: 'child_water_001', dialogueId: 'child-water', spriteKey: 'water_residents', frame: 3 },
  child_water_002: { npcId: 'child_water_002', dialogueId: 'child-water', spriteKey: 'water_residents', frame: 4 },
  child_water_trapped_001: { npcId: 'child_water_trapped_001', dialogueId: 'child-water-trapped', spriteKey: 'water_residents', frame: 3 },
  guard_water_001: { npcId: 'guard_water_001', dialogueId: 'guard-water', spriteKey: 'water_residents', frame: 5 },
  whale_sprout_001: { npcId: 'whale_sprout_001', dialogueId: 'whale-sprout', spriteKey: 'whale', frame: 0 },
  elder_001: { npcId: 'elder_001', dialogueId: 'elder', spriteKey: 'water_residents', frame: 6 }
};

