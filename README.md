# Rikai champ!

Port of rikaikun (which is a port of rikaichan (which is a port of rikaiXUL)) to
Web Extensions.

## Testing

TODO:

[ ] Get an assertion library and check that __tests__/rikaicontent.html passes
    when loaded directly in a browser.
[ ] Get the output to be reflected back when running from the command line
    including correctly reporting errors.
    [mocha-phantomjs-core](https://www.npmjs.com/package/mocha-phantomjs-core)
    looks promising but apparently they recently disabled slimerjs support so
    I may need to fork and fix it. Worst case: Just build up a similar runner
    script referring to `mocha-phantomjs-core` as I go.
[ ] Drop `__tests__/rikaicontent.js` at this point
[ ] Setup `package.json` to run these tests
    [ ] Get Jest to ignore them (might need a jest config JSON file)
    [ ] Stick an extra `MOZ_HEADLESS=1 slimerjs __tests__/rikaicontent.js`
        command in there.
[ ] Get all this to work on Travis
    [ ] Make travis install latest Firefox

### Debugging

For debugging something like the following should work:

`
./node_modules/.bin/slimerjs __tests__/rikaicontent.js  --debug=true -jsconsole
`

Regular running:

`
MOZ_HEADLESS=1 ./node_modules/.bin/slimerjs __tests__/rikaiContent.js 
`
