// Game dimensions (fit Spritefusion 64px tiles; 20x16 tiles visible)
export const GAME_WIDTH = 1280; // 64 * 20
export const GAME_HEIGHT = 1024; // 64 * 16

// Scene keys
export const SCENES = {
  BOOT: 'BootScene',
  PRELOAD: 'PreloadScene',
  MAIN_MENU: 'MainMenuScene',
  GAME: 'GameScene'
} as const;

// Player settings
export const PLAYER_SPEED = 200;
export const PLAYER_DIAGONAL_SPEED = 141; // √2 로 나눈 값

// Asset keys
export const ASSETS = {
  PLAYER: 'player',
  BACKGROUND: 'background',
  TILEMAP: 'tilemap'
} as const;

// Dialogue system constants
export const DIALOGUE_CONFIG = {
  BOX_WIDTH: 800,
  BOX_HEIGHT: 150,
  BOX_Y: GAME_HEIGHT - 300, // 더 위로 올려서 선택지 버튼 공간 확보
  TEXT_SPEED: 30, // 밀리초당 글자 수
  INTERACTION_RADIUS: 50,
  CHOICE_BUTTON_HEIGHT: 40,
  CHOICE_BUTTON_MARGIN: 10
} as const;

// Input keys
export const INPUT_KEYS = {
  INTERACT: 'SPACE',
  ESCAPE: 'ESC'
} as const;

// NPC Types
export const NPC_TYPES = {
  MERCHANT: 'merchant',
  GUARD: 'guard',
  VILLAGER: 'villager'
} as const; 