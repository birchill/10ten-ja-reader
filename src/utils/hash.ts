export function getHash(input: Readonly<string>): string {
  // Based on https://stackoverflow.com/questions/7616461/generate-a-hash-from-string-in-javascript
  //
  // I really have no idea if it's right. All we really use it for is to detect
  // if we need to replace the stylesheet data or not.
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;

  for (let i = 0, ch; i < input.length; i++) {
    ch = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }

  h1 =
    Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^
    Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 =
    Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^
    Math.imul(h1 ^ (h1 >>> 13), 3266489909);

  const asNum = 4294967296 * (2097151 & h2) + (h1 >>> 0);

  return ('0000000000000' + asNum.toString(16)).substr(-14);
}
