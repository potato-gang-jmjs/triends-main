// Game dimensions
export const GAME_WIDTH = 1024;
export const GAME_HEIGHT = 1024;

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