## Version 0.2.1

Removed the native bottom button bar entirely. Page navigation and Setup are top tabs, using the same shared frame and renderer routing as Live Data. Edit controls appear only within journal pages and fit on one row. Live view has no edit controls. Full layout and automatic GPU mode reset once on update.

Actual full-screen presentation and tab interaction require the compatible running GPU renderer. GPU OFF indicates the app is using the native image fallback; removing the toolbar does not itself start or repair the renderer. This version is not verified on the physical car.

## Version 0.2.0

The first page now uses the shared Live Data gauge library: segmented RPM bar, tachometer, speed, oil and coolant temperatures. Its three subscribed fields are read-only; scaling and invalid-value handling reuse Live Data signals.js, copied as vehicle-signals.js. Values older than five seconds display --; there is no synthetic fallback. No diagnostic requests or ECU writes.

The full layout is the default, with the kit's compact 48px toolbar when its compatible renderer is running. Existing layout preferences reset once to this new default; standard HMI layout remains the fallback. Tabs use the same shared frame as Live Data. Journal labels use pre-shaped Noto Sans Thai phrases; native toolbar and tab labels stay short ASCII for renderer compatibility. Font notices are bundled in NOTICE.

The vehicle drawing remains an illustration, not a photograph of the owner's car.

# Robert Garage 0.1.0

Personal M340i garage log for iDrive 7. Four pages: Garage, Service, Fuel, History.

## Controls

- **Page** cycles through pages. **Item** selects a service type or a history page.
- **Field** chooses the value being edited. **Step** cycles 1, 10, 100, 1000 and 0.1.
- **Minus / Plus** edit that value. Odometer and service interval change in whole km.
- **Save** twice within five seconds records the entry (or saves the manual odometer on Garage).
- **Undo last** twice within five seconds removes the most recent record, keeping the odometer.

Initial odometer is 76,952 km, from the owner's supplied dashboard photo. Adjust and save it before recording a fill or service. No old maintenance records are assumed. Values are entered manually; the app does not subscribe to or write vehicle signals, code modules or reset CBS. No automatic trip/fuel consumption calculation in this prototype. Dates use the head unit clock (ISO/UTC).

Intervals are personal reminder targets, not official BMW maintenance recommendations. Edit an interval before saving a service. Costs use THB and fuel uses litres. Garage artwork is a generic drawn silhouette, not a photo or an exact BMW model.

Data: `robert-garage.json` in this app's private data directory. Up to 500 records, atomic saves, malformed saved data is preserved and writes blocked. Keep the installed app to retain its journal; uninstalling can remove app data. Back up the JSON before removing it. This app's journal is separate from LiveData.

## Build and validation

Store builds from the repository branch with its existing SDK. Offline: `python kit/tools/build.py robert_garage --preview-only`, then `node kit/tools/preview.js dist/robert_garage preview/garage wait=3`. Host tests: `node tests/robert_garage.test.js`. This prototype needs validation on the vehicle; host preview does not prove head-unit compatibility.
