import { NPCDefinition } from '../types/MapTypes';

export const NPC_DEFINITIONS: Record<string, NPCDefinition> = {
  merchant_001: { npcId: 'merchant_001', dialogueId: 'merchant', spriteKey: 'merchant' },
  guard_001: { npcId: 'guard_001', dialogueId: 'guard', spriteKey: 'guard' },
  villager_001: { npcId: 'villager_001', dialogueId: 'villager', spriteKey: 'blue' },

  alien_001: { npcId: 'alien_001', dialogueId: 'alien_001', spriteKey: 'first_residents', frame: 0 },
  alien_002: { npcId: 'alien_002', dialogueId: 'alien_002', spriteKey: 'first_residents', frame: 1 },
  alien_003: { npcId: 'alien_003', dialogueId: 'alien_003', spriteKey: 'first_residents', frame: 2 },
};

