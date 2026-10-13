// ---------------------------------------------------------------------------
// Flow: which scenes a player sees for one topic, in order (pure, no Phaser).
//
// The universal order is prediction -> story -> labs/decisions -> reveal ->
// chart/takeaway -> always remember -> optional story -> resources, but each
// topic lists its own scenes and may leave steps out.
// ---------------------------------------------------------------------------

export const SCENE_TYPES = [
  'prediction', 'story', 'choice', 'toggle-lab', 'quiz-ladder', 'tap-hotspots', 'place-on-road',
  'pick-a-point', 'stepper', 'chart', 'reveal', 'always-remember', 'stories', 'resources'
];

export const topicOf = (exp, topicId) => exp.topics.find(t => t.id === topicId) || exp.topics[0];

/**
 * Scenes for a topic. With skipSensitive, scenes marked `sensitive` are left
 * out (the player chose to skip them on the content notice).
 */
export function buildFlow(exp, topicId, opts = {}) {
  const topic = topicOf(exp, topicId);
  return topic.scenes.filter(s => !(opts.skipSensitive && s.sensitive));
}

/** Does this topic (or its experience) need the content notice first? */
export const needsNotice = (exp, topicId) => !!(exp.contentNotice || topicOf(exp, topicId).contentNotice);

/** The topic after `topicId` that isn't finished yet, or null. */
export function nextTopic(exp, topicId, isDone) {
  const i = exp.topics.findIndex(t => t.id === topicId);
  const rest = exp.topics.slice(i + 1).concat(exp.topics.slice(0, Math.max(0, i)));
  return rest.find(t => !isDone(t.id)) || null;
}
