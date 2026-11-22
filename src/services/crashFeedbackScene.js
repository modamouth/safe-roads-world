import { stopCrashFeedback, triggerCrashFeedback } from './crashFeedback.ts';

export function bindCrashFeedback(scene) {
  const stop = () => { stopCrashFeedback(); scene.events.emit('crash-impact-lock', false); };
  const cleanup = () => {
    stopCrashFeedback();
    for (const event of ['pause', 'sleep']) scene.events.off(event, stop);
    scene.events.off('shutdown', cleanup); scene.events.off('destroy', cleanup);
  };
  for (const event of ['pause', 'sleep']) scene.events.on(event, stop);
  scene.events.once('shutdown', cleanup); scene.events.once('destroy', cleanup);
}

// Haptics are optional; the short input lock always accompanies the existing visuals.
export function crashImpact(scene, impactSpeedKmh) {
  if (scene.leaving || !scene.scene.isActive()) return;
  triggerCrashFeedback(impactSpeedKmh);
  scene.events.emit('crash-impact-lock', true);
  scene.time.delayedCall(600, () => scene.events.emit('crash-impact-lock', false));
}
