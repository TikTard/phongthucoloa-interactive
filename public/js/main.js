import { W, H } from './config.js';
import { GameScene } from './game.js';
import { loadFonts } from './ui.js';

// fonts must be ready before Phaser renders any text
loadFonts().then(() => {
  window.game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    width: W,
    height: H,
    backgroundColor: '#1f2a22',
    pixelArt: true,
    roundPixels: true,
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    scene: [GameScene],
  });
});
