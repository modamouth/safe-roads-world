import Phaser from 'phaser';
import { GW, GH } from './config.js';
import Boot from './scenes/Boot.js';
import Title from './scenes/Title.js';
import MapScene from './scenes/Map.js';
import CityRunStub from './scenes/CityRunStub.js';
import LabMenu from './scenes/LabMenu.js';
import ExperienceIntro from './scenes/ExperienceIntro.js';
import Prediction from './scenes/Prediction.js';
import PerspectiveStub from './scenes/PerspectiveStub.js';
import StopDistance from './scenes/StopDistance.js';
import StopReveal from './scenes/StopReveal.js';
import WalkCross from './scenes/WalkCross.js';
import WalkReveal from './scenes/WalkReveal.js';
import TruckBlindSpots from './scenes/TruckBlindSpots.js';
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
  // EXPAND keeps the whole 540x960 design visible and fills any extra screen space (see ui.setupCam).
  scale: { mode: Phaser.Scale.EXPAND, autoCenter: Phaser.Scale.CENTER_BOTH },
  render: { antialias: true },
  scene: [Boot, Title, MapScene, CityRunStub, LabMenu, ExperienceIntro, Prediction, PerspectiveStub, StopDistance, StopReveal, WalkCross, WalkReveal, TruckBlindSpots, Predict, Drive, Lab, Reveal, Passport]
});
