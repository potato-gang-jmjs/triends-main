import Phaser from 'phaser';
import { SCENES, GAME_WIDTH, GAME_HEIGHT } from '../utils/constants';
import { SaveManager } from '../systems/SaveManager';

export class MainMenuScene extends Phaser.Scene {
  constructor() {
    super({ key: SCENES.MAIN_MENU });
  }

  create(): void {
    // 배경
    const bg = this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'sky');
    bg.setDisplaySize(GAME_WIDTH, GAME_HEIGHT);
    
    // 타이틀
    const titleText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 3, 'POTATO GANG', {
      fontSize: '64px',
      fontFamily: 'monospace',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 8
    });
    titleText.setOrigin(0.5);
    
    // 부제목
    const subtitleText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 3 + 80, 'A Space Adventure', {
      fontSize: '24px',
      fontFamily: 'monospace',
      color: '#aaaaaa'
    });
    subtitleText.setOrigin(0.5);
    
    // 버튼 생성 유틸
    const makeButton = (y: number, label: string, onClick: () => void) => {
      const btn = this.add.text(GAME_WIDTH / 2, y, label, {
        fontSize: '32px',
        fontFamily: 'monospace',
        color: '#ffffff',
        backgroundColor: '#333333',
        padding: { x: 20, y: 10 }
      });
      btn.setOrigin(0.5);
      btn.setInteractive({ useHandCursor: true });
      btn.on('pointerover', () => btn.setStyle({ backgroundColor: '#555555' }));
      btn.on('pointerout', () => btn.setStyle({ backgroundColor: '#333333' }));
      btn.on('pointerdown', onClick);
      return btn;
    };

    // 메인 버튼들
    makeButton(GAME_HEIGHT / 2 + 60, 'NEW GAME', () => this.showNewGameSlots());
    makeButton(GAME_HEIGHT / 2 + 120, 'LOAD GAME', () => this.showLoadSlots());
    
    // 크레딧
    const creditText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 50, 'Made with Phaser 3', {
      fontSize: '16px',
      fontFamily: 'monospace',
      color: '#666666'
    });
    creditText.setOrigin(0.5);
  }

  private clearMenu(): void {
    this.children.removeAll();
  }

  private showNewGameSlots(): void {
    this.clearMenu();

    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 4, 'Select Slot (New Game)', {
      fontSize: '36px',
      fontFamily: 'monospace',
      color: '#ffffff',
      stroke: '#000',
      strokeThickness: 6
    }).setOrigin(0.5);

    const slots = SaveManager.listSlots();

    slots.forEach((slot, idx) => {
      const y = GAME_HEIGHT / 3 + idx * 120;
      const exists = slot.exists;
      const label = exists ? `SLOT ${slot.id}  (Overwrite?)` : `SLOT ${slot.id}  (Empty)`;
      const btn = this.add.text(GAME_WIDTH / 2, y, label, {
        fontSize: '28px',
        fontFamily: 'monospace',
        color: '#ffffff',
        backgroundColor: exists ? '#803333' : '#335533',
        padding: { x: 16, y: 8 }
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });

      btn.on('pointerover', () => btn.setStyle({ backgroundColor: exists ? '#a04444' : '#447744' }));
      btn.on('pointerout', () => btn.setStyle({ backgroundColor: exists ? '#803333' : '#335533' }));

      btn.on('pointerdown', () => {
        if (exists) {
          this.showConfirm(`Overwrite SLOT ${slot.id}?`, () => {
            SaveManager.setActiveSlot(slot.id);
            SaveManager.initializeSlot(slot.id);
            this.scene.start(SCENES.GAME);
          }, () => this.showNewGameSlots());
        } else {
          SaveManager.setActiveSlot(slot.id);
          SaveManager.initializeSlot(slot.id);
          this.scene.start(SCENES.GAME);
        }
      });

      if (slot.preview) {
        this.add.text(GAME_WIDTH / 2, y + 40,
          `Lv ${slot.preview.level}  HP ${slot.preview.health}/${slot.preview.maxHealth}  Pos(${Math.round(slot.preview.position.x)},${Math.round(slot.preview.position.y)})  ${slot.lastSaved ? new Date(slot.lastSaved).toLocaleString() : ''}`,
          { fontSize: '16px', color: '#cccccc', fontFamily: 'monospace' }
        ).setOrigin(0.5);
      }
    });

    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 80, 'Back', {
      fontSize: '24px', color: '#ffffff', fontFamily: 'monospace', backgroundColor: '#333', padding: { x: 14, y: 6 }
    }).setOrigin(0.5).setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.scene.start(SCENES.MAIN_MENU));
  }

  private showLoadSlots(): void {
    this.clearMenu();

    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 4, 'Load Game - Select Slot', {
      fontSize: '36px',
      fontFamily: 'monospace',
      color: '#ffffff',
      stroke: '#000',
      strokeThickness: 6
    }).setOrigin(0.5);

    const slots = SaveManager.listSlots();

    slots.forEach((slot, idx) => {
      const y = GAME_HEIGHT / 3 + idx * 140;
      const exists = slot.exists;
      const label = exists ? `SLOT ${slot.id}` : `SLOT ${slot.id}  (Empty)`;

      const btn = this.add.text(GAME_WIDTH / 2 - 120, y, label, {
        fontSize: '28px',
        fontFamily: 'monospace',
        color: '#ffffff',
        backgroundColor: exists ? '#333366' : '#333333',
        padding: { x: 16, y: 8 }
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });

      btn.on('pointerover', () => btn.setStyle({ backgroundColor: exists ? '#444488' : '#444444' }));
      btn.on('pointerout', () => btn.setStyle({ backgroundColor: exists ? '#333366' : '#333333' }));

      btn.on('pointerdown', () => {
        if (!exists) return;
        SaveManager.setActiveSlot(slot.id);
        this.scene.start(SCENES.GAME);
      });

      const del = this.add.text(GAME_WIDTH / 2 + 180, y, 'Delete', {
        fontSize: '22px',
        fontFamily: 'monospace',
        color: '#ffffff',
        backgroundColor: '#663333',
        padding: { x: 12, y: 6 }
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });
      del.on('pointerover', () => del.setStyle({ backgroundColor: '#884444' }));
      del.on('pointerout', () => del.setStyle({ backgroundColor: '#663333' }));
      del.on('pointerdown', () => {
        if (!exists) return;
        this.showConfirm(`Delete SLOT ${slot.id}?`, () => { SaveManager.clearSave(slot.id); this.showLoadSlots(); }, () => this.showLoadSlots());
      });

      if (slot.preview) {
        this.add.text(GAME_WIDTH / 2, y + 40,
          `Lv ${slot.preview.level}  HP ${slot.preview.health}/${slot.preview.maxHealth}  Pos(${Math.round(slot.preview.position.x)},${Math.round(slot.preview.position.y)})  ${slot.lastSaved ? new Date(slot.lastSaved).toLocaleString() : ''}`,
          { fontSize: '16px', color: '#cccccc', fontFamily: 'monospace' }
        ).setOrigin(0.5);
      }
    });

    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 80, 'Back', {
      fontSize: '24px', color: '#ffffff', fontFamily: 'monospace', backgroundColor: '#333', padding: { x: 14, y: 6 }
    }).setOrigin(0.5).setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.scene.start(SCENES.MAIN_MENU));
  }

  private showConfirm(message: string, onYes: () => void, onNo: () => void): void {
    const overlay = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.6).setDepth(1000);
    const box = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, 600, 200, 0x222222, 1).setStrokeStyle(4, 0xffffff).setDepth(1001);
    const text = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 40, message, { fontSize: '24px', color: '#ffffff', fontFamily: 'monospace' }).setOrigin(0.5).setDepth(1001);

    const makeBtn = (x: number, label: string, cb: () => void) => {
      const t = this.add.text(x, GAME_HEIGHT / 2 + 40, label, { fontSize: '24px', color: '#ffffff', fontFamily: 'monospace', backgroundColor: '#444', padding: { x: 16, y: 8 } }).setOrigin(0.5).setDepth(1001);
      t.setInteractive({ useHandCursor: true });
      t.on('pointerover', () => t.setStyle({ backgroundColor: '#666' }));
      t.on('pointerout', () => t.setStyle({ backgroundColor: '#444' }));
      t.on('pointerdown', () => { overlay.destroy(); box.destroy(); text.destroy(); t.destroy(); yes.destroy(); no.destroy(); cb(); });
      return t;
    };

    const yes = makeBtn(GAME_WIDTH / 2 - 100, 'Yes', onYes);
    const no = makeBtn(GAME_WIDTH / 2 + 100, 'No', onNo);
  }
} 