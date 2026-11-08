# Dragon Ball Super

Standalone iDrive 7 MGU app using cluster-render. Based on EVAHUD by DukeAPenguin, Bimmer-Lab and Robert Nisipeanu. Original copyright and licence notices are retained.

Eco Pro shows base Goku in cyan, Comfort shows Super Saiyan in gold, and Sport shows Super Saiyan God in red. Characters are transparent static images, switched by the car's drive-mode signal. The cluster uses a whole-panel layout with a left speed gauge, a right mirrored RPM gauge and Goku between them. The lower BMW status strip stays below the app drawing at y=640. Cluster popups use the upstream yielding mechanism. Positioning and popup behavior on M340i still need real-car verification.

The center-screen menu offers Off, Instrument cluster, Windshield HUD and Cluster + HUD. Vehicle warnings use English text with the original read-only alert rules. Select Off to release both displays.

Requires the separately installed cluster-render service. Upstream used 0.4.0 on a car. Actual compatibility and positioning on M340i remain to be verified. No ECU writes are performed.

Build with the repository's normal MGU App Kit builder and your extracted BMW SDK. The included hud.pack contains freely distributable DejaVu glyphs, the three character images and layouts. It contains no commercial Matisse fonts or BMW SDK.

The desktop verification covers all three modes on both targets, pixel uploads, all six alert types, layer and memory budgets, and the Off switch. These checks use a simulated head unit and do not establish real-car compatibility.
