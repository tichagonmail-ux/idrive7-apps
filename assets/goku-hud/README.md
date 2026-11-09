# Goku HUD artwork source

`atlas.png` is the generated, transparent six-pose atlas used by Goku HUD 0.4.0. The top row is idle; the bottom row is charging. Columns are base / Super Saiyan / Super Saiyan God. Runtime transformations and GPU effects supply the animation.

Production prompt: Create one transparent, equal-cell 3-column by 2-row sprite atlas using the original Goku transformation trio as the identity/outfit reference. Columns: black hair, gold hair, red hair. Top row: calm full-body idle stance, arms down, mouth closed. Bottom row: full-body charging stance, clenched fists beside hips, elbows out, mouth open, knees slightly bent. Keep consistent body size and baseline, complete hair and boots, orange gi and dark blue undershirt/belt/wristbands/boots, polished clean anime line art. No aura, lightning, external shadow, background, panels, borders, writing or watermark; preserve real alpha.

Rebuild with `python3 kit/tools/bake_goku.py`. Deterministic slicing and resizing are build steps; the character's artwork comes from this atlas. The image was generated with the built-in image tool.
