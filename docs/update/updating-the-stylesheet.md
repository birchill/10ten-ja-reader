== Updating the stylesheet ==

The stylesheet, `update.css`, is a generated file since we use the
[Tailwind typography
styles](https://github.com/tailwindlabs/tailwindcss-typography) to avoid having
to configure those styles ourselves.

Honestly, the `tailwindcss-typography` styles are helpful but they seem to work
in a way that is completely different from the rest of Tailwind and are really
hard to tweak as a result so at some point we should just start manually editing
`update.css` and drop the tailwind dependency.

For now though, `update.css` can be generated as follows.

1. Make sure the `tailwindcss` and `@tailwindcss/typography` packages are
   installed either by installing them globally or temporarily adding them to the
   project.

2. From `docs/update` run
   `NODE_ENV=production npx tailwindcss -i update-base.css -o update.css --no-autoprefixer`

   (The `NODE_ENV=production` part is particularly important since that will ensure we drop the unused styles.)

3. That's it!

If you want to update the styles as you work you can use:

```
npx tailwindcss -i update-base.css -o update.css --no-autoprefixer --watch
```

(In this case `NODE_ENV=production` is optional and will possibly slow you down.)
