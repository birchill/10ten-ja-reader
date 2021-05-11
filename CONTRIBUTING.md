Hi!

Thank you for offering to contribute! Here are a few tips that might help.

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
  more robust, more accurate lookups etc.) than adding half-baked features. When
  we add a feature, we like to do it properly.

- Options are a refuge for the indecisive 😅. It's tempting to hedge your bets
  and "just add an option" but we try to avoid that if possible. It makes the
  add-on harder to maintain and most users will never discover the option.
  Instead it's worth working out if there's a different approach that will work
  well for (nearly) everyone. So far we've been pretty successful at doing that.

# Development

## Checking out

```
git clone https://github.com/birtles/rikaichamp.git
yarn install
```

## Building

To build the Firefox version:

```
yarn build
```

The output should be in the `dist-firefox` folder.

To build the Chrome version:

```
yarn build:chrome
```

The output should be in the `dist-chrome` folder.

Or to build and package up a zip you can pass around:

```
yarn package
yarn package:chrome # Chrome version
```

## Running

For manual testing you can use:

```
yarn start # or yarn start:chrome
```

This will run the app using the webpack runner in Firefox (or Chrome) with automatic reloading.

```
yarn start --env firefox=nightly
```

Other options include `--env firefoxProfile=<path>`,
`--env keepProfileChanges`, and `--env profileCreateIfMissing`.

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
