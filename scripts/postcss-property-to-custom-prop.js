/*
 * Tailwind 4 uses @property but these don't work inside shadow DOM
 *
 * See: https://github.com/tailwindlabs/tailwindcss/issues/15005
 *
 * This script converts @property rules to custom properties on :root, :host
 *
 * Courtesy of https://github.com/tailwindlabs/tailwindcss/discussions/16772#discussioncomment-12309978
 */
export function propertyToCustomProp() {
  return {
    postcssPlugin: 'postcss-property-to-custom-prop',
    prepare() {
      // Store all the properties we find
      const properties = [];

      return {
        AtRule: {
          property: (rule) => {
            // Extract the property name and initial value
            const propertyName = rule.params.match(/--[\w-]+/)?.[0];
            let initialValue = '';

            rule.walkDecls('initial-value', (decl) => {
              initialValue = decl.value;
            });

            if (propertyName && initialValue) {
              // Store the property
              properties.push({ name: propertyName, value: initialValue });

              // Remove the original @property rule
              rule.remove();
            }
          },
        },

        OnceExit(root, { Rule, Declaration }) {
          // If we found properties, add them to :root, :host
          if (properties.length > 0) {
            // Create the :root, :host rule using the Rule constructor from helpers
            const rootRule = new Rule({ selector: ':root, :host' });

            // Add all properties as declarations
            properties.forEach((prop) => {
              // Create a new declaration for each property
              const decl = new Declaration({
                prop: prop.name,
                value: prop.value,
              });
              rootRule.append(decl);
            });

            // Add the rule to the beginning of the CSS
            root.prepend(rootRule);
          }
        },
      };
    },
  };
}
