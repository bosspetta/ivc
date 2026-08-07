# Irregular Verbs Challenge

**Irregular Verbs Challenge** is a simple web application to help you learn and practice English irregular verbs.

## Local development and styles (SCSS)

1. Install the dependencies: `npm install`.
2. Start the local development server with `npm run dev` (available at `http://localhost:5173`, with hot reload).
3. Styles live in `src/scss` — global variables, mixins, reset, and layout, imported once from `main.scss` — and also alongside each component or page as their own `.scss` files (for example, `src/pages/Test/Test.scss`).
4. There's no need to compile SCSS separately: Vite transforms it automatically as soon as a component imports a `.scss` file, and reloads changes on save.
5. To generate the production build, use `npm run build`; the styles are compiled and minified together with the rest of the bundle in `dist/`.
6. To preview that build locally: `npm run preview`.

## About the pronunciation voices

The voices you hear for each verb tense (and for the examples) depend largely on the voices installed on your operating system. This app uses your browser's own speech synthesizer (the Web Speech API), so the more voices — and the better their quality — you have installed on your device, the more natural the pronunciation will sound.

Below is a quick guide to installing more natural voices ("Enhanced", "Premium", or neural voices) on each operating system. After installing them, restart your browser so it can detect them.

### Windows

1. Open Settings → Time & Language → Speech (or Settings → Accessibility → Narrator, depending on the version).
2. Under "Manage voices", click "Add voices".
3. Search for "English (United Kingdom)" and "English (United States)" and install the available voices.
4. On Windows 11, some voices are labeled "Natural": these are the highest-quality ones, generated with neural networks.
5. Restart your browser so it picks up the newly installed voices.

### macOS

1. Open System Settings → Accessibility → Spoken Content (on older versions: System Preferences → Accessibility → Speech).
2. Click the "System voice" dropdown and choose "Manage Voices...".
3. Look for English voices and download the ones marked "Enhanced" or "Premium" (for example, Serena or Zoe for British/American English): they use much more natural synthesis than the default compact voices.
4. Quit and reopen your browser after the download finishes.

### Linux

1. On Linux, system voices usually rely on speech-dispatcher together with an engine such as espeak-ng or Festival, which sound fairly robotic by default.
2. The easiest way to get a natural pronunciation is to use Google Chrome: when there's an internet connection, Chrome offers Google's "network" voices (for example, "Google UK English Female"), which sound much better.
3. If you prefer offline voices, you can install an alternative engine such as RHVoice from your distribution's package manager and set it as the default voice in speech-dispatcher.

### iOS / iPadOS

1. Open Settings → Accessibility → Spoken Content → Voices.
2. Choose "English" and select the accent you prefer (United Kingdom or United States).
3. Tap the voice you want and download the "Enhanced" or "Premium" quality (a download icon appears; it requires Wi-Fi and some storage space).

### Android

1. Open Settings → System → Languages & input → Text-to-speech output (the path may vary by manufacturer; on some devices it's under Settings → Accessibility).
2. Make sure the "Preferred engine" is "Google Text-to-speech Engine", which usually comes preinstalled.
3. Tap the gear icon next to the Google engine, go to "Install voice data", and download the highest-quality English voice pack available.
4. If no high-quality voices show up, update the "Google Text-to-speech" app from the Play Store.
