// ---------------------------------------------------------------------------
// Learning Lab analytics. Every event goes through the game's track() hook
// (config.js), named 'lab.<event>' with the experience, topic, scene and
// content version, so results can be tied to the exact content a player saw.
//
// Events: topic_started, topic_resumed, notice_choice, scene_started,
// scene_answered, answer_correct, answer_incorrect, scene_completed,
// topic_completed, experience_completed, link_opened.
// ---------------------------------------------------------------------------
import { track } from '../config.js';
import { createProgress, deviceStorage } from './core/progress.js';

export function labEvent(name, where, data) {
  track('lab.' + name, Object.assign({
    experience: where.exp && where.exp.slug,
    version: where.exp && where.exp.version,
    topic: where.topic && where.topic.id,
    scene: where.sc && where.sc.id,
    sceneType: where.sc && where.sc.type
  }, data || {}));
}

// Saved progress for the whole game session (and across visits on this device).
export const progress = createProgress(deviceStorage());

/** Session points for the Mission Map: 10 per Learning Lab topic stamp. */
export const labPoints = () => Object.keys(progress.stamps()).filter(k => k.includes('/')).length * 10;
