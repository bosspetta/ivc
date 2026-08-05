# Irregular Verbs Challenge

**Irregular Verbs Challenge** is a simple web application to help you learn and practice English irregular verbs.

## Local development and styles (SCSS)

1. Install the dependencies: `npm install`.
2. Start the local development server with `npm run dev` (available at `http://localhost:5173`, with hot reload).
3. Styles live in `src/scss` — global variables, mixins, reset, and layout, imported once from `main.scss` — and also alongside each component or page as their own `.scss` files (for example, `src/pages/Test/Test.scss`).
4. There's no need to compile SCSS separately: Vite transforms it automatically as soon as a component imports a `.scss` file, and reloads changes on save.
5. To generate the production build, use `npm run build`; the styles are compiled and minified together with the rest of the bundle in `dist/`.
6. To preview that build locally: `npm run preview`.
