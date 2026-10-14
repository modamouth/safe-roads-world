# Experience reload recovery

The reported interruption occurred in the local Vite preview and reloaded the entire page. The previous preview used Vite's automatic reload, and `Boot.create()` always started `Title`. Editing source or public artwork therefore interrupted an active experience and returned the player home.

Local preview now uses manual refresh by default. Developers can explicitly enable live reload with `SRW_LIVE_RELOAD=1 npm run dev`.

An independent, per-tab session checkpoint records the active experience, content version, topic, screen and stable scene ID. Boot restores that lesson after a refresh or browser reload. Existing device progress and stamps stay in their original storage. The checkpoint is cleared when the player deliberately leaves the experience. Content version changes, deleted scenes or a changed sensitive-content choice safely return to the experience introduction rather than restoring an invalid numeric index. A refreshed activity starts its current lesson again; this does not preserve an animation's exact frame or an unsubmitted choice.

Accessibility mirror controls now recheck whether their game object is alive, visible and enabled at activation time. Queued clicks from destroyed or hidden screens cannot invoke old navigation callbacks.

Changed runtime files: `vite.config.js`, `src/scenes/Boot.js`, `src/lab/LabRunner.js`, `src/lab/session.js`, `src/lab/core/session.js`, `src/a11y.js`. Coverage is in `tests/lab-session.test.js` and `e2e/session.spec.js`.

Validation: lint and typecheck pass; all 10 unit tests pass; production build passes. Existing lint/content warnings remain unchanged. Four browser regression checks pass: lesson recovery across two reloads and advancement, preserved stamps and explicit exit; public-file updates without automatic reload; hidden/destroyed control activation guards; existing map resizing, keyboard signals and texture release.
