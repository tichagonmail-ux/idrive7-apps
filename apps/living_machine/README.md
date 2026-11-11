# Living Machine HUD 0.1.3

Reconstructed memory-fix release based on the saved 0.1.2 upload source.
The original local commit efcf308 was unavailable; this archive does not claim
to reproduce that missing commit or its earlier 4.88 MiB figure.
App ID remains living_machine. No Goku HUD files or shared runtime are included.

## Changes

- Original 1920 x 660 drawing area and BMW status strip remain unchanged.
- Text rectangles retain their original resolution and fonts. They are stored
  in one 800 x 324 atlas instead of a transparent full-screen image. A shader
  places them at their original screen positions. Text changes still use dirty rectangles.
- The two car variants share one body plate plus lossless wheel-area patches.
  Normal-quality versions reconstruct both original 800 x 400 plates exactly.
- On renderer memory-allocation refusal, all layers are dropped before one
  retry with smaller car/city/wheel textures. Text resolution stays unchanged.
  A second allocation failure stops and releases every layer. Retry by switching
  Mode Off, then Instrument cluster. Other renderer errors stop immediately.
- The 0.1.2 installed-app permission fix and signal adapter are retained.
- Defaults remain Off, demo Off and simulated exhaust Off.

## Install through the existing Store source

1. Extract Living-Machine-0.1.3-GitHub-upload.zip.
2. Open UPLOAD-TO-REPO. Upload the apps folder into the root of
   tichagonmail-ux/idrive7-apps, branch main. Preserve its folder structure.
3. The repository should contain apps/living_machine/app.json with version 0.1.3.
4. On the car: Store > Check now > Living Machine HUD 0.1.3 > Update.
5. Keep Goku and other full-cluster apps Off. Enable Instrument cluster while parked.
6. Mode Off releases the drawing layers and sampled assets.

The Store uses the existing repository build system and the head unit's own SDK.
This is source for Store installation, not an APK or a standalone installer.
No BMW SDK or renderer upgrade is included. Full Store installation and operation
on the physical vehicle have not been tested in this reconstruction.

## Checks completed for this archive

- Actual application controller and renderer-client layer lifecycle exercised
  across ECO, COMFORT and SPORT using a memory-budget simulator.
- With a simulated shared 16 MiB ceiling, other-app usage of 8, 12 and 13 MiB
  passes; at 14 MiB the app drops all its layers and stops.
- Conservative two-copy pixel-storage estimate: normal 5.703 MiB;
  low-memory 2.908 MiB. These are estimates, not measured head-unit RAM/GPU usage.
  JavaScript objects, fonts, driver/shader overhead and other runtime allocations
  are outside this pixel-storage estimate.
- Original and new text pixels compared exactly in all three modes.
- Normal car variants compared losslessly with the original packed resources.
- All six scene/text shaders compile and link with desktop Mesa GLES.
- Non-memory refusal stops; Off releases all assets after dependent layers.

Developer test: node tools/test_living_013.js (requires a disposable copy of the
repository kit/runtime staged at apps/living_machine/kit, including locale.json).
Do not commit that staged kit directory. TEST-RESULT-0.1.3.json records simulator results.

## Remaining physical checks

Confirm Store installation, renderer sampled-asset support, warning-popup yielding,
actual vehicle signals, clearances and frame rate while parked. Low-memory image
textures have reduced detail; the canvas size and text pixels stay the same.
BMW has not endorsed this fan-made application. Vehicle animation is a fixed-view
2.5D visual treatment, not a 3D camera or vehicle-control function.
