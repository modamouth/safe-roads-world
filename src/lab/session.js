import { experience, isOpen } from './content.js';
import { progress } from './analytics.js';
import { SESSION_KEY, resolveSession } from './core/session.js';

export function rememberExperience(record) {
  try { window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(record)); } catch (e) { /* Storage may be unavailable. */ }
}
export function forgetExperience() {
  try { window.sessionStorage.removeItem(SESSION_KEY); } catch (e) { /* Storage may be unavailable. */ }
}
export function resumeExperience() {
  try {
    const record = JSON.parse(window.sessionStorage.getItem(SESSION_KEY) || 'null');
    const exp = record && experience(record.slug);
    if (!exp || !isOpen(exp)) { forgetExperience(); return null; }
    const knownTopic = exp.topics.some(topic => topic.id === record.topic);
    const skip = record.screen === 'scene' && knownTopic && !!progress.answerOf(exp.slug, record.topic, exp.version, '$skip');
    const data = resolveSession(record, exp, skip);
    if (!data) forgetExperience();
    return data;
  } catch (e) { forgetExperience(); return null; }
}
