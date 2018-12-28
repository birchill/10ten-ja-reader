# Rikaichamp!

[![Greenkeeper badge](https://badges.greenkeeper.io/birtles/rikaichamp.svg)](https://greenkeeper.io/)

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
git clone https://github.com/birtles/rikaichamp.git
npm install
```

The install step above will build the add-on and put the output in
`dist-firefox`. To build again you can use:

```
npm run build
```

Or to build the Chrome version:

```
npm run build:chrome
```

Or to build and package:

```
npm run prepack
```

## Running

For manual testing you can use

```
npm start
```

## Testing

```
npm test
```

Unit tests only:

```
npm run test:unit
```

Browser-based tests only:

```
npm run test:browser
```
