# Goku HUD 0.4.0

BMW iDrive 7 / rooted MGU app. Installed identity remains `dragon_super`, so this updates Dragon Ball Super in place. Original EVAHUD / cluster-render copyright and licence notices remain in LICENSE and NOTICE.

| Drive mode | Goku | Energy |
| --- | --- | --- |
| ECO PRO | Base, black hair | Cyan |
| COMFORT | Super Saiyan, gold hair | Gold |
| SPORT | Super Saiyan God, red hair | Red with blue-white lightning |

Six transparent character poses provide idle and charging artwork for each form. Each stance uses a closed 12-keyframe compositor loop: slow breathing at idle, faster breathing and a small tremor when charging. These are GPU transforms of the six poses, rather than 72 separately redrawn pictures. Aura, sparks and lightning run as GLSL effects. Character pixels upload only when the mode or stance changes.

The charging stance starts at 25% pedal, holds above 15%, and returns to idle below that. Missing/invalid pedal data, stopped engine or a vehicle stream stale for three seconds releases the charging stance. Demo data ships Off. Missing live channels display `--`; IAT requests standard OBD PID 0F and remains unconfirmed on this car.

The default cluster design, **BMW gauges + Goku**, uses the native map slot under BMW content, preserving the original gauges and warning hierarchy. **Goku Performance** recreates a blue speed scale on the left and a red RPM scale on the right, with a larger Goku in the middle and a long symmetric pointed mode bar. Its drawing stops at y=640, above BMW’s bottom status strip, and uses the inherited popup-yield mechanism. The menu also offers Windshield HUD, Cluster + HUD and Off. Off releases all app layers. Actual warning placement and popup behavior on this M340i still require parked-car verification; desktop tests cannot establish that.

## Install/update

Preferred: refresh the existing `tichagonmail-ux/idrive7-apps` repository in MGU App Store, then update the app with ID `dragon_super` (now titled Goku HUD).

The downloadable offline update contains `install-goku.sh`, the regular MGU App Kit installer and an SDK-free update payload. Copy the extracted folder to the head unit, park the vehicle, then run `sh install-goku.sh` as root. It locates an existing `source/node_modules/oap-sdk` on that same head unit, copies it into a temporary install bundle, verifies the bundle and calls the regular installer. The SDK never leaves the car. If no installed SDK is found, it stops before changing the app. The regular installer retains its normal backups. This payload is not a standalone `.mgu` and must be used through the included script. Requires the separately installed cluster-render service (the upstream API used here is 0.4.0).

To stop drawing: Apps → Goku HUD → Mode → Off.

## Build and verify

Normal Store / SDK build: `python3 kit/tools/build.py dragon_super`.

Offline update payload without redistributing an SDK: `python3 kit/tools/build.py dragon_super --update-only`.

Desktop staging: `python3 kit/tools/build.py dragon_super --preview-only`, then `node kit/tools/test_dragon_super.js`.

The committed `hud.pack` is the complete runtime data and contains freely distributable DejaVu glyphs, all six poses in three target sizes, and the layouts. It contains no BMW SDK. To regenerate artwork data, install build-time `sharp` for Node.js (or expose it with CODEX_PRIMARY_RUNTIME_NODE_MODULES), then run `python3 kit/tools/bake_goku.py`. Normal Store builds use the committed pack and need neither sharp nor an image-generation service.

To produce visual checks: set `GOKU_CAPTURE=1` when running the app test, run `python3 kit/tools/render_goku_preview.py` (Mesa EGL/GLES2 and Pillow), then `node kit/tools/make_goku_preview.js` (sharp). The HTML is a standalone simulated preview, not an app installer. It uses the tested app’s exact image layers, GLSL and animation keys.

Verification covers every form, both cluster designs, both stances, pedal hysteresis, missing/stale signals, reconnect, all six custom alert types on both targets, the 8-layer/16 MiB renderer limits, the native bottom strip, BMW popup yielding, and Off. GLSL was compiled, linked and rendered with surfaceless EGL/GLES2. The offline installer was checked using an isolated SDK fixture; no real car was connected during this build. No ECU coding, flashing or control writes are performed by this app.
