Hi!

Thank you so much for offering to contribute! Here are a few tips that might help.

# Table of Contents

- [Things to keep in mind](#things-to-keep-in-mind)
- [Development](#development)
  - [Checking out](#checking-out)
  - [Building](#building)
  - [Running](#running)
  - [Testing](#testing)
  - [Releasing](#releasing)

# Things to keep in mind

- Quality over features. Your code doesn't need to be great (we'll work on it
  together) but we're generally more interested in fixing the basics (faster,
  more robust, more accurate lookups etc.) than adding half-baked features.
  When we add a feature, we like to do it properly.

- Options are a refuge for the indecisive 😅. It's tempting to hedge your bets
  and "just add an option" but we try to avoid that when possible. It makes the
  extension harder to maintain and most users will never discover the option.
  Instead it's worth working out if there's a different approach that will work
  well for (nearly) everyone. So far we've been pretty successful at doing that.

# Development

## Checking out

If you have the [`gh` CLI tool](https://cli.github.com/) installed,
you can fork and clone in one command:

```
gh repo fork birchill/10ten-ja-reader --clone=true
```

However, because we store snapshots of the dictionary data in the repository, it
might take a while so you might prefer a
[blobless clone](https://github.blog/2020-12-21-get-up-to-speed-with-partial-clone-and-shallow-clone/):

```
gh repo fork birchill/10ten-ja-reader
git clone --filter=blob:none birchill/10ten-ja-reader
```

Then install the dependencies:

```
pnpm install
```

## Building

To build the Firefox version:

```
pnpm build:firefox
```

The output should be in the `dist-firefox` folder.

Similarly you can use `pnpm build:chrome`, `pnpm build:edge`, `pnpm
build:thunderbird` to build the Chrome, Edge, and Thunderbird versions.
The output will be in the `dist-chrome`, `dist-edge`, `dist-thunderbird` folders
respectively.

To build and package up a zip:

```
pnpm package:firefox # or pnpm package:chrome, pnpm package:edge etc.
```

### Building on Safari

First run:

```
pnpm build:safari
```

Then open Xcode and choose the `.xcodeproj` under `xcode13`.
You will need to select the target platform (iOS vs Mac) to build.

## Running

For manual testing you can use:

```
pnpm start:firefox # or pnpm start:chrome
```

This will run the app using the rspack runner in Firefox (or Chrome) with
automatic reloading.

To run a specific version of Firefox:

```
pnpm start:firefox --env firefox=nightly
```

Other options include:

- `--env firefoxProfile=<path>`,
- `--env chromium=<path>`,
- `--env chromeProfile=<path>`,
- `--env keepProfileChanges`, and
- `--env profileCreateIfMissing`.

(I believe the latter two options only apply to Firefox.)

### Firefox for Android

Instructions are [here](https://extensionworkshop.com/documentation/develop/developing-extensions-for-firefox-for-android/).

Once you've set up `adb` correctly and got the device ID, you should be able to run:

```
pnpm web-ext run -t firefox-android --adb-device <device ID> --firefox-apk org.mozilla.fenix
```

That will use the version of `web-ext` installed by this project.

### Safari

As with the build instructions above, after running `pnpm build:safari` you
should be able to run using Xcode.

Note that Xcode will default to signing with Brian Birtles' ([@birtles](https://github.com/birtles)) team. Running on Simulator does not require a team set, but to run on a physical device, you may need to override the team name to your personal team—however, please don't commit the configuration files this will change to this repo. This is clunky, but unavoidable for open source projects with Xcode. An [Apple Developer Program](https://developer.apple.com/programs/enroll/) account may also be required.

If you already have 10ten Japanese Reader installed on your device, you may get signing errors when trying to test the development version. An uninstall and reinstall should fix these.

## Testing

```
pnpm test
```

Unit tests only:

```
pnpm test:unit
```

Browser-based tests only:

```
pnpm test:firefox
pnpm test:chromium
```

Running a single browser-based test in watch mode:

```
npx playwright-test tests/get-text.test.ts --browser firefox --watch
```

Unfortunately [`playwright-test`](https://github.com/hugomrdias/playwright-test)
doesn't currently seem to let you configure multiple browsers to run at once.

[`@web/test-runner`](https://modern-web.dev/docs/test-runner/overview/) does but
it is less diligent about updating the version of Playwright meaning you end up
testing old browsers.

## Releasing

Pre-release checks:

- If we've made changes to the build setup at all, it's good to run
  `pnpm zip-src` and verify that the generated zip file can actually be used to
  build the add-on for Firefox.

  e.g.

  ```
  pnpm zip-src
  mkdir ~/test-src
  cp dist-src/10ten-ja-reader-<version>-src.zip ~/test-src/test.zip
  cd ~/test-src
  unzip test.zip
  # Check it builds
  pnpm install
  pnpm build:firefox
  # Check it runs
  pnpm start:firefox
  # Clean up
  cd ..
  rm -rf ~/test-src
  ```

  Otherwise the submission will likely be rejected from AMO.

- It's also good to check that the release notes are being parsed correctly by
  running `pnpm tsx scripts/release-notes.js`.

We trigger releases by running the release workflow from
[Actions](https://github.com/birchill/10ten-ja-reader/actions/workflows/release.yml).

That will create a draft release that you need to publish before anything gets
uploaded.

If you need to test the release process locally, you can use:

```
pnpm release --dry-run -V
```

After publishing the release, it should automatically be uploaded to AMO
(Firefox) and the Edge Store but we need to manually upload it to the Chrome Web
Store and Thunderbird add-ons site.

### Releasing on Safari

Releasing for Safari needs to be done on a Mac.

First run:

```
# git pull & pnpm install etc.
#
# NOTE: Make sure we've updated version by publishing a release (see above)
# first.
pnpm build:safari
```

Then:

1. Open Xcode.
1. Select the target: Mac or iOS. You eventually need to do both.
   For iOS, you need to set the device to "Any iOS Device" in order to generate
   a suitable build.
1. Run Product → Archive.
1. Choose Distribute App.
1. App Store Connect.
1. Upload.

If you get `No Accounts with "App Store Connect" Access for team` at this point
restarting Xcode should fix it.

1. (Default options for the next couple of dialogs.)
1. Upload (again).

If that succeeds then it's time to update the App Store.

Note that it will take several minutes to process the uploaded build so there's
no hurry.

1. Go to https://appstoreconnect.apple.com/apps and choose 10ten Japanese Reader
1. Choose the MacOS/iOS app and copy the Promotional Text.
1. Press the blue + next to the macOS/iOS App and enter the new version number
1. Fill out the changes field / promotional text and save
   (If it ever fails to save because, e.g. you entered a disallowed character,
   you lose all your work so save regularly.)
1. Select the uploaded build. It can take a few minutes to be processed after
   which you'll need to reload the page to see it.
   You can check the status of processing the build from the TestFlight tab.

After that is done, you'll need to do the same for the iOS/MacOS build depending
on which one you did first.
