# Rikaichamp!

Port of rikaikun (which is a port of rikaichan, which is a port of rikaiXUL) to
Web Extensions.

## Development

`
git clone --recursive https://github.com/birtles/rikaichamp.git
npm install
`

## Running

For manual testing you can use

`
npm install -g web-ext
web-ext run --bc --start-url https://www.asahi.com/ -p default
`

The `--bc` just brings up the browser console immediately so you can check for
any warnings produced at startup.

The `-p default` is so you can use your regular browsing profile which is useful
if you want to test, for example, Twitter or Facebook.

## Testing

`
npm test
`

If you have trouble running the SlimerJS tests using the above, you can just run
the unit tests and browser tests separately:

`
./node_modules/.bin/jest
firefox __tests__/rikaicontent.html
`

### Debugging SlimerJS test runs

For debugging SlimerJS something like the following should work:

`
SLIMERJSLAUNCHER=/opt/firefox/firefox ./node_modules/.bin/slimerjs utils/slimerjs-test-runner.js __tests__/rikaicontent.html --debug=true
`

That's assuming that you have a nightly build at `/opt/firefox/firefox`. If
you're lucky, SlimerJS might just pick up the right version without using
`SLIMERJSLAUNCHER`. The UA string is printed at the beginning of the test run so
you can check which version is being used.

Regular running:

`
MOZ_HEADLESS=1 SLIMERJSLAUNCHER=/opt/firefox/firefox ./node_modules/.bin/slimerjs utils/slimerjs-test-runner.js __tests__/rikaicontent.html
`
