import Phaser from 'phaser';
import { gameConfig } from './config/gameConfig';
import './style.css';

// 게임 인스턴스 생성
const game = new Phaser.Game(gameConfig);

// 개발 모드에서 게임 인스턴스를 전역에 노출 (디버깅용)
if (import.meta.env.DEV) {
  (window as any).game = game;
}
