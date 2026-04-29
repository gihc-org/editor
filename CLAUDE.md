# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Kontekst

En CodeMirror 6-baseret Rust-editor designet til at køre som en lokal webserver i **Termux på Android**. Brugeren tilgår editoren via Chrome på `localhost:3000` og kan tilføje den til startskærmen som en PWA. Primær motivation: copy/paste i vim/nano i Termux er besværligt — browseren håndterer det naturligt.

## Kommandoer

```bash
# Efter npm install (kun første gang)
npm run build           # Bundler src/editor.js → public/editor.bundle.js via esbuild
npm start               # Starter Express-serveren på localhost:3000

# Ændr rodmappen (default: os.homedir())
EDITOR_ROOT=/path/to/dir npm start

# Skift port
PORT=8080 npm start
```

`npm run build` skal køres igen efter hver ændring i `src/editor.js`.

### Global CLI (npm link)

```bash
# Én gang efter clone/install:
npm link

# Herefter fra en hvilken som helst mappe:
rust-editor              # åbner editoren med den aktuelle mappe som rod
rust-editor /sti/til/mappe   # eller angiv en sti direkte
```

Indgangspunktet er `bin/editor.js`, som sætter `EDITOR_ROOT` til `process.cwd()` (eller argv[2]) og starter `server.js`.

## Arkitektur

```
server.js          Node.js/Express — filsystem-API + statiske filer
src/editor.js      CodeMirror-kildekode (ES-moduler, bundlet med esbuild)
public/
  index.html       HTML-shell med PWA-metatags
  style.css        Mobil-first mørkt tema (matcher oneDark)
  manifest.json    PWA-manifest
  editor.bundle.js Genereret — commit ikke denne
```

**Data flow:** Browseren henter/gemmer filer via REST (`GET /api/file`, `POST /api/file`, `GET /api/dir`). Al filsystemlogik ligger i `server.js`; al editor-UI og -state lever i `src/editor.js`.

**Sikkerhed:** `safePath()` i `server.js` afviser stier der traverserer uden for `BASE_DIR`. Serveren lytter kun på `127.0.0.1`.

**Fil-paths:** Alle stier i API'et er relative til `BASE_DIR`. Klienten sender og modtager relative stier; `server.js` resolver dem til absolutte stier internt.

## CodeMirror-opsætning

Extensions i `initEditor()`: `basicSetup`, `rust()`, `oneDark`, `EditorView.lineWrapping`, `indentWithTab`. Ved skift af fil ødelægges og genoprettes `EditorView`-instansen frem for at opdatere state.

## Planlagte næste skridt

- **PWA:** Gøre appen fuldt installerbar som PWA — kræver en service worker (`public/sw.js`) der cacher app-shell så den virker uden at serveren er startet. `manifest.json` og PWA-metatags er allerede på plads.
- LSP-integration med `rust-analyzer` (kører allerede i Termux) via WebSocket
- Faner til flere åbne filer
- Terminal-panel (spawn shell i Termux via child_process)
