// Scene type -> renderer. A renderer is (ctx, sceneData) => void | Promise.
// To add a scene type, see docs/learning-lab/ENGINE.md.
import prediction from './prediction.js';
import story from './story.js';
import choice from './choice.js';
import toggleLab from './toggleLab.js';
import quizLadder from './quizLadder.js';
import tapHotspots from './tapHotspots.js';
import placeOnRoad from './placeOnRoad.js';
import pickAPoint from './pickAPoint.js';
import stepper from './stepper.js';
import chart from './chart.js';
import reveal from './reveal.js';
import alwaysRemember from './alwaysRemember.js';
import stories from './stories.js';
import resources from './resources.js';

export const RENDERERS = {
  prediction, story, choice, 'toggle-lab': toggleLab, 'quiz-ladder': quizLadder, 'tap-hotspots': tapHotspots,
  'place-on-road': placeOnRoad, 'pick-a-point': pickAPoint, stepper, chart, reveal, 'always-remember': alwaysRemember,
  stories, resources
};
