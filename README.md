# Rikaichamp!

Look up Japanese words with the hover of a mouse.

Rikaichamp is a port of rikaikun, which is a port of rikaichan, which is a port
of rikaiXUL. It aims to be simple, reliable, fast, and up-to-date.

It includes simple installation, an up-to-date dictionary, many many bug fixes
over its predecessors (e.g. it correctly recognizes the causative passive),
automated tests and type-checking, and modern API usage (no sync XHR, XPath
etc.).

Twitter: [@rikaichamp](https://twitter.com/rikaichamp)

## Development

```
git clone --recursive https://github.com/birtles/rikaichamp.git
npm install
```

## Running

For manual testing you can use

```
npm start
```

## Testing

`
npm test
`

If you have trouble running the SlimerJS tests using the above, you can just run
the unit tests and browser tests separately:

```
./node_modules/.bin/jest
firefox __tests__/content.html
```

### Debugging SlimerJS test runs

For debugging SlimerJS something like the following should work:

```
SLIMERJSLAUNCHER=/opt/firefox/firefox ./node_modules/.bin/slimerjs utils/slimerjs-test-runner.js __tests__/content.html --debug=true
```

That's assuming that you have a nightly build at `/opt/firefox/firefox`. If
you're lucky, SlimerJS might just pick up the right version without using
`SLIMERJSLAUNCHER`. The UA string is printed at the beginning of the test run so
you can check which version is being used.

Regular running:

```
MOZ_HEADLESS=1 SLIMERJSLAUNCHER=/opt/firefox/firefox ./node_modules/.bin/slimerjs utils/slimerjs-test-runner.js __tests__/content.html
```
