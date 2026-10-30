# Publication verification

Completed 30 October 2026 (Europe/Copenhagen).

## Release

- Code release: `8b2aa4d083873f3a9b65f5ab81a5eecad252c468`.
- All 16 release files matched the local Git blob hashes after upload.
- [GitHub tests](https://github.com/Ehsan-Ch/talking-robot-lab/actions/runs/40961929338): successful on Node 22 and Node 24.
- [Pages deployment](https://github.com/Ehsan-Ch/talking-robot-lab/actions/runs/40961987598): successful for the same release.
- 19 automated tests passed locally, including all free start/goal cell pairs and speech lifecycle mocks.

## Observed browser behavior

The [public lab](https://ehsan-ch.github.io/talking-robot-lab/) loaded successfully. “Go to desk” planned 11 steps, navigated around the central wall and arrived at zero-based `(7,2)`, facing south. The downloaded public JSON contained 16 ordered events, 11 movement steps, one arrival and an empty remaining route. Its final pose matched the displayed column 8, row 3.

Local browser checks additionally confirmed blocked relative movement rejection, refusal to replace an active route, status responses and immediate cancellation. A stopped-session export contained 23 events, 12 movement steps, final pose `(7,1)` facing north, and no remaining route. The spoken-reply toggle and installed voice choices were visible and usable.

The mobile layout was inspected at 390 × 844 pixels; document client width and scroll width were both 375 pixels, with no horizontal overflow. Desktop layout and the planned route were visually inspected. These are smoke checks, not exhaustive cross-browser certification.

## Limits of verification

Live microphone recognition and audible speech quality were not verified. No microphone permission was granted during testing. Recognition permissions, errors, transcript callbacks, cancellation, stale callbacks and output failures were tested with injected mocks. Actual voices and recognition availability depend on the browser/OS and its speech service.

Milo is a constrained-command simulation, not a general conversational model or a physical robot controller. No claims about real-world navigation or hardware safety are made.
