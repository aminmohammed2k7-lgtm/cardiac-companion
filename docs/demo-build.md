# Web demo build

The Android app's pages live in `www/`. They already run in a desktop
browser for development: where a Capacitor plugin is missing, the call
does nothing. `npm run build:web` makes a copy that any static host can
serve. It writes that copy to `dist/` and adds one extra file so the
browser's Back button follows the same steps as Android's back button.

## The live demo

https://cardiac-companion.vercel.app is built from this folder. Amin
turned Vercel deploys on for the competition demo on 13 October 2026, so
every push to `main` rebuilds the site. `vercel.json` says how:

| Setting | Value | Why |
|---|---|---|
| `installCommand` | `npm install --ignore-scripts` | No package script runs on Vercel's machines |
| `buildCommand` | `npm run build:web` | The same build as on your computer |
| `outputDirectory` | `dist` | Only the built pages are published, never the repository |
| `git.deploymentEnabled` | `true` | Deploy on push |

`tests/web-build.test.js` checks those four settings and fails if any
other setting is added, so a change to what the public site does comes
with a test. To pause the site again, set `deploymentEnabled` to `false`
and update that test in the same commit.

The site is a demo: records typed there stay in that browser's local
storage. Nothing is uploaded. The app is published for Android.

`dist/` is generated. It is not committed. Run the build again after
you change `www/`.

## Build

```
npm run build:web
```

That copies `www/` into `dist/` and then adds:

- `dist/js/platform/browser.js` — loaded only by the copy in `dist/`.
  The Android project syncs `www/`, so the phone app does not get this
  file. If the Capacitor App plugin is present, the file does nothing.
  Otherwise Back closes a panel, cancels the form on the tab in view,
  returns to Today, and from Today leaves the page when you opened the
  demo from another page. In a new tab there is nowhere to go, so the
  demo stays open and the next Back still walks the steps above.
  The system font size and the status-bar colour have no browser
  equivalent; those calls stay empty, which is what the app already
  does outside Android.
- `dist/favicon.png` — the launcher icon, so the tab is not a broken
  image request. `favicon.ico` is the same icon for browsers that ask
  for that name before they read the page.

Nothing is loaded from the network. There is no service worker, no
web-app manifest, and no Capacitor script. Camera pulse uses the
browser's own camera only on a secure page (`https`, or
`http://localhost`), and its "not a medical device" line is shown
beside the button. If the camera is missing or refused, the page shows
its usual message and the pulse is typed instead.

## Preview on this computer

Open the folder over HTTP. Opening `dist/index.html` as a file
(`file://`) is not a fair check: some browsers block storage and fonts
there.

From the project folder:

```
npm run build:web
npm run preview:web
```

Then open http://127.0.0.1:8080/

The preview listens on this computer only. If 8080 is taken:

```
PORT=8081 npm run preview:web
```

The same folder can be served without that script:

```
python3 -m http.server 8080 --directory dist --bind 127.0.0.1
```

What to look at: the welcome screen offers "Try the sample record",
Today shows both dates, the language switch (EN, አማ, OR) redraws the
page, Settings opens and Back closes it, and a medicine you add is
still there after a reload. Records stay in this browser's local
storage for that address. Nothing is uploaded. Clearing the site's data
deletes them; the in-app backup file is the copy to keep.

Reminders from the page ring only while the tab is open. "Add reminders
to my calendar" still downloads a calendar file.
