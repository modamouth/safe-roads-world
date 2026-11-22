# Crash vibration and fallback feedback

The project is Phaser + JavaScript. `src/services/CrashFeedbackService.ts` and `crashFeedback.ts` add strictly checked TypeScript without converting existing game files. `npm run typecheck` checks both the existing project and `tsconfig.feedback.json`. There are no Capacitor dependencies and none were added.

## Service and speeds

`CrashFeedbackService` exposes `trigger`, `stop`, `setEnabled`, and `isSupported`. Construction/import does not read browser globals. Missing, throwing and refusing Vibration API implementations fail silently. Requests use 80 ms for light, `[120, 60, 160]` for medium and `[250, 80, 350, 100, 450]` for heavy. The configurable cooldown defaults to 1,000 ms and is not reset by cancellation.

`getCrashSeverity(speedKmh)` selects light below 40 km/h, medium from 40 to below 70, and heavy at 70 or above. Existing illustrated damage levels remain tied to the lesson's content, independently of these vibration thresholds.

Actual contact hooks:

- `src/lab/art/crashLab.js`: barrier contact callback, after approach and before damage animation. Speed comes from the replay's `kmh`. It now also plays the existing synthesized crash sound once.
- `src/lab/art/ruralRoad.js`, `collideCow`: uses calculated residual `hitKmh`, captured before setting vehicle speed to zero. The existing impact guard prevents a second contact sequence.
- `src/lab/art/ruralRoad.js`, `collide`: uses the player's current simulation velocity `r.v * 3.6` (m/s to km/h). A per-run `crashed` guard is set before feedback.

Ordinary road bumps, non-contact stopping demonstrations, safe braking, and sensitive-content previews do not call these hooks. Existing sounds, shakes, impact lines/flashes, debris, vehicle damage and jolt effects are reused; reduced motion continues to suppress camera motion and flashes. Unsupported iPhone/iPad browsers retain these audiovisual effects. Haptics have their own explicit player preference.

`crashFeedbackScene.js` binds pause/sleep/shutdown/destroy cancellation. Replacing or destroying artwork and leaving LabRunner also cancel immediately. Browser blur, page hiding and page exit cancel active vibration. Replays do not resume vibration after a pause. A 600 ms impact lock disables the toggle-lab state controls and Continue during contact; choice scenes disable their choices during their sequence, and head-on playback now resolves only after this brief settling period. Back and sound/settings remain available.

## Player preference

On supported devices, the `⋯` button immediately beside the existing Sound shortcut opens **Sound & feedback**. The panel contains Sound and **Vibration / Haptics**. It pauses the current scene, blocks background input and uses a native accessible modal dialog with keyboard focus handling. Closing it resumes the scene; exiting while it is open cleans it up.

Haptics default on and persist under `safeRoadsWorld.settings.haptics` in localStorage (`"true"` or `"false"`). Storage failure does not block play. Unsupported browsers hide the feedback-settings shortcut and retain the existing Sound control. No vibration is requested until a trusted pointer, keyboard or click interaction has occurred, and the browser's user-activation restrictions still apply. The API returning true means a request was accepted, not proof of physical motor activity.

## Development check

With `npm run dev`, interact with the page first, then run in the console (wait at least 1,000 ms between calls):

```js
window.__srwCrashFeedback.trigger('light');
window.__srwCrashFeedback.trigger('medium');
window.__srwCrashFeedback.trigger('heavy');
window.__srwCrashFeedback.stop();
```

Use the settings panel to persist preference changes. The debug reference is removed in production and no visible debug control is shipped.

## Validation and physical-device check

`npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, and the targeted Playwright haptics/crash/navigation checks validate types, patterns, thresholds, cooldown, refusal/exception handling, disabled preference, storage failures, SSR safety, user activation, cancellation, scene cleanup, single-contact requests and fallback gameplay. Browser tests mock `navigator.vibrate`; they cannot confirm motor feel.

Still test on physical Android Chrome over HTTPS: light/medium/heavy feel, toggling off and refreshing, switching apps mid-pattern, and leaving/restarting a lesson. On iPhone/iPad Safari, check that the haptics setting is hidden and the existing audiovisual crash sequence and navigation work normally. If Sound is muted, visual feedback remains available.

## Files changed

Created: `src/services/CrashFeedbackService.ts`, `src/services/crashFeedback.ts`, `src/services/crashFeedbackScene.js`, `src/services/feedbackSettings.js`, `src/services/feedbackSettings.css`, `tsconfig.feedback.json`, `tests/crash-feedback.test.js`, `tests/haptics-settings.test.js`, `e2e/haptics.spec.js`, and this document.

Modified: `package.json` (strict checking command), `src/main.js` (startup/browser teardown and development-only console reference), `src/ui.js` (settings shortcut), `src/lab/LabRunner.js` (scene lifecycle/exit cancellation), `src/lab/renderers/toggleLab.js` (brief impact input lock), `src/lab/art/crashLab.js` (barrier feedback/sound/cancellation), and `src/lab/art/ruralRoad.js` (contact feedback/guards/cancellation/settling).
