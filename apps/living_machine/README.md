# Living Machine HUD 0.1.1

A custom/fan-made BMW M340i G20 cockpit study. This is a separate application,
ID `living_machine`; Goku HUD remains `dragon_super` 0.4.6 with unchanged files.
The real owner-car photographs and `g20-id7-master-v2` are the design references.
BMW has not endorsed this software.

## What this prototype does

- ECO PRO: broad cyan wraparound speed/RPM gauges, flowing electric-blue energy ribbons, a reflective floor and the studio car.
- COMFORT: silver-white glass bezels, a night-city panorama and calm water reflections.
- SPORT+: red wraparound gauges, a long amber/red RPM light strip, converging red speed trails, actual gear display and optional simulated exhaust.
- All modes use the supplied visual board as the art direction; gauge numbers, ticks, live data and layers are code, not flattened AI-rendered text.
- The car is a fixed-view **2.5D studio sprite** rendered from the owner's three photos and the supplied concept, with bronze wheel sprites, the raised two-mount wing, floor reflection and subtle squat. It is not a real-time 3D/360-degree model or a pixel-identical photo.
- Wheels integrate vehicle speed and the visual tyre circumferences; revving at rest does not spin them. Gears 1–2 have no flames, gear 8 is quieter but responds to load. Pedal release fades FX. Invalid inputs disable FX.
- Mode transitions crossfade over 800 ms and gently interpolate vehicle size. Live text stays on top. The three colour/scene treatments share calibrated wrap paths in this visual revision.
- App-local DejaVu glyph atlases produce the bold italic digits. Shared kit/Goku fonts are untouched. The font licence and image-generation prompts are included.
- Normal builds use the committed `resources.pack`; Pillow is needed only when rebaking project assets/fonts.

## Start and stop

The app installs **Off**, **demo Off**, **simulated exhaust Off**.

1. Keep **Goku HUD > Mode > Off**. Keep other full-cluster apps Off as well.
2. Open Apps > Living Machine HUD. For the first parked-car check, leave Demo Off.
3. Mode > Instrument cluster enables the new panel design.
4. Drive mode design > Follow vehicle uses the FES mode. The three preview-design options deliberately choose a visual design; they do not change the vehicle's driving mode.
5. Mode > Off drops all four drawing layers and all three sampled assets. BMW's own cluster can return.

Vehicle animation, wheel motion, simulated exhaust, intensity, low-effect mode,
measurement overlay, diagnostic status and a labelled demo are separate settings.
The shift-light threshold is visual and configurable; verify its suitability for the car.

## Installation

Preferred: install through the existing MGU Store GitHub source.

1. Upload `apps/living_machine/` to the root of `tichagonmail-ux/idrive7-apps` on `main`.
2. In the car's Store, use that GitHub source on the `main` branch and choose **Check now**.
3. Choose **Living Machine HUD 0.1.1** and **Install**.

The live repository's `mgu-repo.json` already discovers `apps/*` automatically;
Living Machine is not excluded. No catalog or Goku file change is required.
The Store supplies the donor SDK and runs `python kit/tools/build.py living_machine`
on the head unit, then installs `dist/living_machine@0.1.1.tgz`.
All assets/fonts/shaders are in the committed `resources.pack`, so this build
needs no Pillow, rebaking, separate art files, network downloads or user SSH command.
This source upload contains no BMW SDK.
The renderer already required by the display still needs sampled-asset support;
that runtime capability must be checked on the actual head unit.

The supplied `OFFLINE-UPDATE` folder contains an SDK-free payload, the standard
MGU App Kit installer and `install-living-machine.sh`. On the rooted head unit,
copy these three files together and run `sh install-living-machine.sh` as root.
The script reuses an `oap-sdk` already installed on that same head unit, assembles
a normal `.mgu`, and calls the standard verifier/installer. It stops before
changing an app if no installed SDK is available. It does not download or export
BMW's SDK. The `.app-update.tgz` is a script payload, not a standalone `.mgu`.

The renderer must support protocol-v1 sampled RGBA assets, sampler binds,
effect shaders and uniform animation. Installed renderer support remains to be
checked on the owner's unit; refusal makes this app release its layers.
No renderer upgrade, coding, flashing or vehicle control is performed.

## Desktop preview and reproducible checks

Open `Living-Machine-0.1.1-preview.html` locally in a WebGL-capable desktop browser.
It is self-contained, with speed/RPM/pedal sliders, gear 1–8, all modes, animation
switches and an unavailable-data switch. It uses the same state model, layout
coordinates, shaders, wheel metadata and image assets as the native app. Browser
font rasterization can differ from the kit; the three exported 1920×720 PNGs are
rendered from the actual staged app layers through EGL/GLES2.

Developer commands:

    python3 kit/tools/living_machine_bake.py
    python3 kit/tools/build.py living_machine --preview-only
    node kit/tools/test_living_machine.js
    node kit/tools/export_living_animation.js
    python3 kit/tools/render_living_machine.py
    python3 kit/tools/make_living_preview.py
    python3 kit/tools/living_machine_animation.py
    python3 kit/tools/build_living_machine.py
    python3 kit/tools/test_living_package.py

`test_living_preview.js` is an optional Playwright/Chromium click test. Its
execution was blocked in this environment: process sockets were unavailable,
and the connected browser disallowed local file URLs. Browser click QA is
therefore **not claimed as passed**. Native runtime/model and actual GLSL
rendering were tested independently. See TEST-REPORT.md.

## Physical display and shared geometry

The panel coordinate plane is 1920×720; the opaque application cover is
1920×660 and y=660–719 is reserved for BMW. The curved edge uses the v2
photo-derived samples and a conservative design polygon, not an exact hardware
mask. Alpha-pixel checks cover the exported designs. Recheck physical clearance
and BMW popups while parked; do not infer hardware validation from generated
concept images or from a desktop render.

## Important prototype limits

The SOME/IP field names and raw scaling are audited against the existing kit
and checked with raw fixtures. They are not yet confirmed on this car. Each
channel expires after three seconds; getters are requested every second where
available. Change-only fields without getters can still expire and show `--`
during a steady value. No guessed gear, invented boost/efficiency figure or
live-mode simulated number is substituted. A missing drive mode falls back to
the Comfort design; confirm the FES getter on the car.

Goku protection is a read-only persisted-settings preflight and a one-second
recheck. Unreadable state blocks Living Machine. It is **not an atomic lock in
legacy Goku**: turning Goku on after this app starts can briefly contend before
Living Machine releases. Always keep only one full-cluster app enabled. It
never changes Goku settings or stops another process.

Popup yielding reuses the existing log watcher; an unreadable/incomplete log
cannot establish that every BMW Check Control warning will be visible. A crash
or disconnect is expected to release this client's scene through the renderer,
but crash recovery and all warning paths still need physical verification.

The studio car and night-city plate are AI-generated project assets. The car's
wing/wheel/quad-exhaust design was compared with the supplied board and three
owner photos; pixel-for-pixel identity is not claimed. Perspective wheel
animation is an approximation; detected red caliper pixels remain static.
Exhaust and squat are visual simulations. No brake-light state is inferred
without a brake signal. Peak head-unit FPS and concurrent-app GPU memory are
not measured yet.
