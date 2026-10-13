import Phaser from 'phaser';
import { GW, GH } from './config.js';
import Boot from './scenes/Boot.js';
import Title from './scenes/Title.js';
import MapScene from './scenes/Map.js';
import CityRunStub from './scenes/CityRunStub.js';
import LabMenu from './scenes/LabMenu.js';
import LabRunner from './lab/LabRunner.js';
import Passport from './scenes/Passport.js';

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: GW,
  height: GH,
  backgroundColor: '#0B1B2E',
  // EXPAND keeps the whole 540x960 design visible and fills any extra screen space (see ui.setupCam).
  scale: { mode: Phaser.Scale.EXPAND, autoCenter: Phaser.Scale.CENTER_BOTH },
  render: { antialias: true },
  scene: [Boot, Title, MapScene, CityRunStub, LabMenu, LabRunner, Passport]
});

// Dev builds expose the game for debugging and end-to-end tests; production builds don't.
if (import.meta.env.DEV) window.__srwGame = game;
