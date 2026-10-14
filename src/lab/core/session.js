import { buildFlow } from './flow.js';

export const SESSION_KEY = 'srw.lab.active.v1';

// Store stable scene IDs, since content edits and the sensitive-content choice
// can change numeric positions in a topic.
export function resolveSession(record, exp, skipSensitive = false) {
  if (!record || !exp || record.slug !== exp.slug) return null;
  const intro = { slug: exp.slug, screen: 'intro' };
  if (record.version !== exp.version) return intro;
  if (record.screen === 'intro') return intro;
  const topic = exp.topics.find(t => t.id === record.topic);
  if (!topic) return intro;
  if (record.screen === 'notice' || record.screen === 'complete') return { slug: exp.slug, screen: record.screen, topic: topic.id };
  if (record.screen !== 'scene') return null;
  const flow = buildFlow(exp, topic.id, { skipSensitive });
  const at = flow.findIndex(s => s.id === record.sceneId);
  return at < 0 ? intro : { slug: exp.slug, screen: 'scene', topic: topic.id, at };
}
