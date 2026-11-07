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
