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

```
git clone https://github.com/birchill/10ten-ja-reader.git
yarn install
```

## Building

To build the Firefox version:

```
yarn build:firefox
```

The output should be in the `dist-firefox` folder.

Similarly you can use `yarn build:chrome` or `yarn build:edge` to build the
Chrome and Edge versions.
The output will be in the `dist-chrome` and `dist-edge` folders respectively.

To build and package up a zip:

```
yarn package:firefox # or yarn package:chrome, yarn package:edge
```

## Running

For manual testing you can use:

```
yarn start:firefox # or yarn start:chrome
```

This will run the app using the webpack runner in Firefox (or Chrome) with automatic reloading.

To use a specific version of Firefox:

```
yarn start:firefox --env firefox=nightly
```

Other options include:

- `--env firefoxProfile=<path>`,
- `--env chromium=<path>`,
- `--env chromeProfile=<path>`,
- `--env keepProfileChanges`, and
- `--env profileCreateIfMissing`.

(I believe the latter two options only apply to Firefox.)

## Testing

```
yarn test
```

Unit tests only:

```
yarn test:unit
```

Browser-based tests only:

```
yarn test:firefox
yarn test:chromium
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

```
yarn version --new-version 1.2.3
# or for a pre-release version (NOTE: The 'dash' is important!)
yarn version --new-version 1.2.3-pre1

# Then...
git push --follow-tags
```

If you want to bump the version _without_ triggering a new release use:

```
yarn version --new-version 1.2.3 --no-git-tag-version
```

After pushing to GitHub the release action will run and spit out a draft release.

### Releasing on Safari

Safari is quite a different beast and needs to be done on a Mac.

First run:

```
# git pull & yarn install etc.
#
# NOTE: Make sure we've run `yarn version --new-version ...` _somewhere_
# then pushed the result first.
yarn build:safari
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
restarting XCode should fix it.

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

For iOS you _might_ need to submit a demo video. We did for the initial
submission and were told we'd need to for every subsequent submission but on the
next submission no-one asked for it so 🤷‍♂️
