// ---------------------------------------------------------------------------
// Learning Lab progress, saved on the device (pure, no Phaser).
//
// Shape (JSON in storage under KEY):
//   topics:  { 'speed/main': { v, at, answers: { sceneId: value }, score, done } }
//   stamps:  { 'speed/main': timestamp, 'speed': timestamp }   topic and experience stamps
// `v` is the experience's content version. If content changes version, the
// resume point and answers for that topic are dropped; stamps are kept.
// ---------------------------------------------------------------------------

export const KEY = 'srw.lab.v1';

/** localStorage when available (it can throw in private modes), else memory. */
export function deviceStorage() {
  const mem = {};
  try {
    const ls = window.localStorage, probe = '__srw_probe';
    ls.setItem(probe, '1'); ls.removeItem(probe);
    return { get: k => ls.getItem(k), set: (k, v) => { try { ls.setItem(k, v); } catch (e) { mem[k] = v; } } };
  } catch (e) {
    return { get: k => (k in mem ? mem[k] : null), set: (k, v) => { mem[k] = v; } };
  }
}

export function createProgress(storage) {
  let data;
  try { data = JSON.parse(storage.get(KEY) || 'null'); } catch (e) { data = null; }
  if (!data || typeof data !== 'object') data = {};
  data.topics = data.topics || {};
  data.stamps = data.stamps || {};
  const save = () => storage.set(KEY, JSON.stringify(data));
  const tk = (slug, topic) => slug + '/' + topic;

  const api = {
    /** Topic record, reset if the content version changed. */
    topic(slug, topic, version) {
      const k = tk(slug, topic);
      let t = data.topics[k];
      if (!t || (version != null && t.v !== version)) {
        t = data.topics[k] = { v: version, at: 0, answers: {}, score: null, done: !!(t && t.done) };
      }
      return t;
    },
    setAt(slug, topic, version, at) { api.topic(slug, topic, version).at = at; save(); },
    answer(slug, topic, version, sceneId, value) { api.topic(slug, topic, version).answers[sceneId] = value; save(); },
    answerOf(slug, topic, version, sceneId) { return api.topic(slug, topic, version).answers[sceneId]; },
    setScore(slug, topic, version, score) { api.topic(slug, topic, version).score = score; save(); },
    topicDone: (slug, topic) => !!(data.topics[tk(slug, topic)] && data.topics[tk(slug, topic)].done),
    experienceDone: (slug, topicIds) => topicIds.every(id => api.topicDone(slug, id)),
    /**
     * Finish a topic: stamp it, and stamp the experience once every topic is done.
     * Returns which stamps were newly earned.
     */
    complete(slug, topic, version, topicIds, now) {
      const t = api.topic(slug, topic, version), k = tk(slug, topic), when = now || Date.now();
      t.done = true; t.at = 0;
      const topicStamp = !data.stamps[k];
      if (topicStamp) data.stamps[k] = when;
      const expStamp = !data.stamps[slug] && api.experienceDone(slug, topicIds);
      if (expStamp) data.stamps[slug] = when;
      save();
      return { topicStamp, experienceStamp: expStamp };
    },
    stamp: id => data.stamps[id] || null,
    stamps: () => Object.assign({}, data.stamps),
    /** Start a topic again from the first scene (keeps stamps). */
    restart(slug, topic, version) {
      const t = api.topic(slug, topic, version);
      t.at = 0; t.answers = {}; t.score = null; save();
    },
    raw: () => data
  };
  return api;
}
