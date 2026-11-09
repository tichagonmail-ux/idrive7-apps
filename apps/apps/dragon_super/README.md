# Goku HUD 0.4.4

BMW iDrive 7 / rooted MGU app. Installed identity remains `dragon_super`, so this updates Dragon Ball Super in place. Original EVAHUD / cluster-render copyright and licence notices remain in LICENSE and NOTICE.

| Drive mode | Goku | Energy |
| --- | --- | --- |
| ECO PRO | Base, black hair | Cyan |
| COMFORT | Super Saiyan, gold hair | Gold |
| SPORT | Super Saiyan God, red hair | Red with blue-white lightning |

Six transparent character poses provide idle and charging artwork for each form. Each stance uses a closed 12-keyframe compositor loop: slow breathing at idle, faster breathing and a small tremor when charging. These are GPU transforms of the six poses, rather than 72 separately redrawn pictures. Aura, sparks and lightning run as GLSL effects. Character pixels upload only when the mode or stance changes.

The charging stance starts at 25% pedal, holds above 15%, and returns to idle below that. Missing/invalid pedal data, stopped engine or a vehicle stream stale for three seconds releases the charging stance. Demo data ships Off. Missing live channels display `--`; IAT requests standard OBD PID 0F and remains unconfirmed on this car.

The default cluster design, **Goku Performance (full cluster)**, uses the same whole-cluster `panel` target as the EVA full designs: a green dragon around the blue speed scale and a red scale guard around the RPM scale, with a larger Goku in the middle and a long symmetric pointed mode bar. Versions 0.4.1 and later reset the saved 0.4.0 centre-only default once, so existing installations receive the full design. Later manual selections remain saved. **BMW gauges + Goku (centre)** is the optional native `map` slot design under BMW content; it intentionally leaves the original side gauges in place. The full design's cover stops at y=660 of the 1920×720 panel, leaving the lower native status area, and uses the inherited popup-yield mechanism. The menu also offers Windshield HUD, Cluster + HUD and Off. Off releases all app layers. The y=660 cover comes from the earlier photograph measurement; physical bezel clearance, native fuel/status visibility and BMW warning/popup behavior still require parked-car verification.

## 0.4.4: actual dragon artwork and the lower cover fix

Both guards now come from `assets/goku-hud/dragon-guards.png`. The green head, horns, whiskers and body are inside the speed gauge's own 600×535 rectangle; the opposite gauge contains the red scales. The old green/red dotted decorations have been removed. Rails, ticks, labels and current-value pointers still use one value path. The artwork is alpha-composited into the existing gauge image, so it adds no renderer layers and does not erase when speed, RPM or gear changes. All parts of the display canvas have non-overlapping rectangles.

The unpushed 0.4.3 experiment is included: the opaque background reaches y=660, while the mode strip stays at y=604 and the shader uses panel coordinates. Cluster fit affects only the upper content, so shrinking the dragons no longer pulls up the lower cover or shortens its strip. The default is still 95%; 90% and 100% remain available. No settings are reset again for this artwork update.

The layout generator now preserves the version in `app.json`, so rebaking cannot silently restore 0.4.2. `hud.pack`, the simulated HTML and `preview.png` are generated from these same production assets and painter. Tests cover the actual green/red multicolour pixels, head clearance, transparent surroundings, changing values, fit settings, fixed lower strip, existing animation/alert regressions and the renderer's 8-layer/16 MiB limits. This release has desktop validation; it has not been installed or verified on the car.

## 0.4.2: gauge alignment, fitted bounds and custom alerts

Gauge labels, major ticks and the current-value pointer now share a horizontal value anchor. Labels are centred using actual font ink bounds, decorative caps no longer cross endpoint labels, and progress is clipped to the exact current value. Run `node kit/tools/test_dragon_gauges.js` after staging to verify 42 major dial cases at two sizes plus 63 km/h and 1139 RPM between ticks.

The earlier 0.4.2 release used a 1920×640 cover; 0.4.4 extends it as described above. Upper content is fitted to 95% by default (48 px horizontal and 16 px vertical inset). **Cluster fit** offers 90%, 95% and 100%. Image source dimensions stay unchanged; only display rectangles are fitted and bilinearly sampled. Curved physical masks still need checking on the actual car.

**Custom full-screen alerts** ships Off and the update resets the previous enabled default once. **Preview an alert** is reset Off too. These are this app's computed warnings, not BMW Check Control; the native warning/popup integration is unchanged. The photographed `AIR / FUEL ALERT` came from this custom alert path. The earlier engine could trip on a single AFR sample, then display a recovered 14.5 during its 2-second clear hold. AFR now requires 1.5 seconds continuously outside its configured limits, clears pending confirmation on missing/stale readings, and holds the last out-of-range value during recovery. This does not establish whether the original out-of-range sample represented a real vehicle condition. The thresholds/channels remain unverified for this M340i, so custom alerts should only be enabled deliberately after validation.

## Install/update

Preferred: refresh the existing `tichagonmail-ux/idrive7-apps` repository in MGU App Store, then update the app with ID `dragon_super` (now titled Goku HUD).

The downloadable offline update contains `install-goku.sh`, the regular MGU App Kit installer and an SDK-free update payload. Copy the extracted folder to the head unit, park the vehicle, then run `sh install-goku.sh` as root. It locates an existing `source/node_modules/oap-sdk` on that same head unit, copies it into a temporary install bundle, verifies the bundle and calls the regular installer. The SDK never leaves the car. If no installed SDK is found, it stops before changing the app. The regular installer retains its normal backups. This payload is not a standalone `.mgu` and must be used through the included script. Requires the separately installed cluster-render service (the upstream API used here is 0.4.0).

To stop drawing: Apps → Goku HUD → Mode → Off.

## Build and verify

Normal Store / SDK build: `python3 kit/tools/build.py dragon_super`.

Offline update payload without redistributing an SDK: `python3 kit/tools/build.py dragon_super --update-only`.

Desktop staging: `python3 kit/tools/build.py dragon_super --preview-only`, then `node kit/tools/test_dragon_super.js`.

The committed `hud.pack` is the complete runtime data and contains DejaVu glyphs, all six poses in three target sizes, both dragon guards and the layouts. It contains no BMW SDK. To regenerate artwork data, install build-time `sharp` for Node.js (or expose it with CODEX_PRIMARY_RUNTIME_NODE_MODULES), then run `python3 kit/tools/bake_goku.py`. Normal Store builds use the committed pack and need neither sharp nor an image-generation service.

To produce visual checks: set `GOKU_CAPTURE=1` when running the app test, run `python3 kit/tools/render_goku_preview.py` (Mesa EGL/GLES2 and Pillow), then `node kit/tools/make_goku_preview.js` (sharp). The HTML is a standalone simulated preview, not an app installer. It uses the tested app’s exact image layers, GLSL and animation keys.

Verification covers the 90/95/100% fit, unchanged full background/source resolution, custom-alert defaults migration, AFR transient/recovered-14.5/stale-pending regressions, the 0.4.0-to-full-panel saved-settings migration, subsequent manual selections, real FES notification handlers, target dimensions, both side gauges, every form, both cluster designs, both stances, pedal hysteresis, missing/stale signals, reconnect, all six custom alert types on both targets, the 8-layer/16 MiB renderer limits, the native bottom strip, BMW popup yielding, and Off. GLSL was compiled, linked and rendered with surfaceless EGL/GLES2. The offline installer was checked using an isolated SDK fixture; no real car was connected during this build. No ECU coding, flashing or control writes are performed by this app.
