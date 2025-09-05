import tailwindcss from '@tailwindcss/postcss';

import { propertyToCustomProp } from './scripts/postcss-property-to-custom-prop.js';

/** @type {import('postcss-load-config').Config} */
const config = { plugins: [tailwindcss(), propertyToCustomProp()] };

export default config;
