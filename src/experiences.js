// ---------------------------------------------------------------------------
// Learning Lab registry for menus (LabMenu and the Mission Map's Lab card),
// built from the content files in content/learning-lab/. The Lab is one
// Mission holding these experiences; each runs in the LabRunner engine.
//   status  'playable' (opens in LabRunner) | 'locked' (shows "Coming soon";
//           release builds lock every experience that isn't approved)
// ---------------------------------------------------------------------------
import { allExperiences, isOpen } from './lab/content.js';
import { progress } from './lab/analytics.js';

export const EXPERIENCES = allExperiences().map(e => ({
  id: e.slug, label: e.label, title: e.title, icon: e.icon, minutes: e.minutes,
  status: isOpen(e) ? 'playable' : 'locked',
  topics: e.topics.map(tp => tp.id)
}));

export const experienceById = id => EXPERIENCES.find(e => e.id === id);

/** Topics finished / total for one experience. */
export function experienceProgress(e) {
  const done = e.topics.filter(tp => progress.topicDone(e.id, tp)).length;
  return { done, of: e.topics.length, complete: done === e.topics.length };
}

/** Experiences fully finished, for the Lab mission's progress. */
export const labProgress = () => ({ done: EXPERIENCES.filter(e => experienceProgress(e).complete).length, of: EXPERIENCES.length });
