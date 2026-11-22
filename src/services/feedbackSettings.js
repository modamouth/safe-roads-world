import { crashFeedback, hapticsEnabled, setHapticsEnabled, stopCrashFeedback } from './crashFeedback.ts';
import { Sfx } from '../sfx.js';
import './feedbackSettings.css';

// Native modal semantics keep keyboard/screen-reader focus within settings.
export function openFeedbackSettings(scene) {
  if (document.querySelector('#feedback-settings')) return;
  const dialog = document.createElement('dialog');
  dialog.id = 'feedback-settings'; dialog.setAttribute('aria-labelledby', 'feedback-settings-title');
  const title = document.createElement('h2'); title.id = 'feedback-settings-title'; title.textContent = 'Sound & feedback';
  dialog.append(title);
  const checkbox = (text, checked, change) => {
    const label = document.createElement('label'), input = document.createElement('input');
    input.type = 'checkbox'; input.checked = checked;
    input.addEventListener('change', () => change(input.checked));
    label.append(input, document.createTextNode(text)); dialog.append(label);
  };
  checkbox('Sound', !Sfx.muted, value => Sfx.setMuted(!value));
  if (crashFeedback.isSupported()) checkbox('Vibration / Haptics', hapticsEnabled(), setHapticsEnabled);
  const close = document.createElement('button'); close.textContent = 'Done';
  close.addEventListener('click', () => dialog.close()); dialog.append(close);
  const inputEnabled = scene.input.enabled;
  const wasActive = scene.scene.isActive();
  let disposed = false;
  const dispose = (resume = false) => {
    if (disposed) return; disposed = true;
    stopCrashFeedback(); dialog.remove();
    scene.input.enabled = inputEnabled;
    scene.events.off('shutdown', shutdown); scene.events.off('destroy', shutdown);
    if (resume && wasActive && scene.scene.isPaused()) {
      scene.scene.resume();
    }
  };
  const shutdown = () => dispose();
  scene.events.once('shutdown', shutdown); scene.events.once('destroy', shutdown);
  dialog.addEventListener('close', () => dispose(true));
  document.body.append(dialog); dialog.showModal();
  stopCrashFeedback();
  scene.input.enabled = false;
  if (wasActive) scene.scene.pause();
}
