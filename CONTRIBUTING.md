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
yarn test:browser
```

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
yarn build:safari
```

Then:

1. Open Xcode (_not_ Xcode Beta since you can't publish to the App Store from a
   beta version of Xcode).
1. Open the project corresponding to the current version of Xcode.
1. Update the Package and bundle version.

   Go to the Info tab of the _app_ target, and update the following fields:

   - Bundle version string (short): `<major>.<minor>`

   Go to the Build Settings tab of the _app_ target, and bump the project version.

   Go to the Info tab of the _extension_ target, and update the following fields:

   - Bundle version string (short): `<major>.<minor>`
   - Bundle version: Project version from above

   There is almost certainly a better way of doing this but for now this seems
   to work for me.

1. Run Product → Archive.
1. Choose Distribute App.
1. App Store Connect.
1. Upload.
1. (Default options for the next couple of dialogs.)
1. Upload (again).

If that succeeds (and most often it doesn't because some version is out of line), then it's time to update the App Store.

1. Go to https://appstoreconnect.apple.com/apps and choose 10ten Japanese Reader
1. Press the blue + next to macOS App and enter the new version number
1. Fill out the changes field / promotional text
1. Select the uploaded build (can take a few minutes to be processed)
