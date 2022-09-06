== Updating the stylesheet ==

The stylesheet, `update.css`, is a generated file since we use the
[Tailwind typography
styles](https://github.com/tailwindlabs/tailwindcss-typography) to avoid having
to configure those styles ourselves.

Note that we set all this up before `tailwind-typography` v0.5 which apparently
makes it a lot easier to override styles so we can probably improve the way we
set up the styles a lot now.

For now though, `update.css` can be generated as follows.

1. Install the [`tailwindcss` CLI
   tool](https://tailwindcss.com/blog/standalone-cli).

2. From `docs/update` run
   `tailwindcss -i update-base.css -o update.css --no-autoprefixer`

3. That's it!

If you want to update the styles as you work you can add `--watch` to be above.
