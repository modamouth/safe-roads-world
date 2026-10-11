import Phaser from 'phaser';
import { GW, GH } from './config.js';
import Boot from './scenes/Boot.js';
import Title from './scenes/Title.js';
import MapScene from './scenes/Map.js';
import CityRunStub from './scenes/CityRunStub.js';
import LabMenu from './scenes/LabMenu.js';
import Predict from './scenes/Predict.js';
import Drive from './scenes/Drive.js';
import Lab from './scenes/Lab.js';
import Reveal from './scenes/Reveal.js';
import Passport from './scenes/Passport.js';

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: GW,
  height: GH,
  backgroundColor: '#0B1B2E',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  render: { antialias: true },
  scene: [Boot, Title, MapScene, CityRunStub, LabMenu, Predict, Drive, Lab, Reveal, Passport]
});
