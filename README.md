# React + Vite

## Desarrollo local y estilos (SCSS)

1. Instala las dependencias: `npm install`.
2. Levanta el servidor de desarrollo local con `npm run dev` (disponible en `http://localhost:5173`, con recarga en caliente).
3. Los estilos viven en `src/scss` — variables, mixins, reset y layout globales, importados una única vez desde `main.scss` — y también junto a cada componente o página como archivos `.scss` propios (por ejemplo, `src/pages/Test/Test.scss`).
4. No hace falta compilar el SCSS aparte: Vite lo transforma automáticamente en cuanto un componente importa un archivo `.scss`, y recarga los cambios al guardar.
5. Para generar la build de producción usa `npm run build`; los estilos se compilan y minifican junto con el resto del bundle en `dist/`.
6. Para previsualizar esa build en local: `npm run preview`.

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and Oxlint's TypeScript related rules in your project.
