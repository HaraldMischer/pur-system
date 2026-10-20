// pur-system/scripts/sync-pwa-theme-colors.mjs

import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { PWA_THEME_COLORS } from '../config/pwa-theme-colors.mjs';

const projektRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const indexDateien = [
  ['office', 'src/index.html'],
  ['master', 'src/index.master.html'],
  ['filiale', 'src/index.filiale.html'],
  ['mitarbeiter', 'src/index.mitarbeiter.html'],
];
const manifestDateien = [
  ['office', 'public/manifest.webmanifest'],
  ['master', 'public/manifests/pur-master/manifest.webmanifest'],
  ['filiale', 'public/manifests/pur-filiale/manifest.webmanifest'],
  ['mitarbeiter', 'public/manifests/pur-mitarbeiter/manifest.webmanifest'],
];
const themeColorPattern = /<meta name="theme-color" content="[^"]+"\s*\/?>/u;
const hexColorPattern = /^#[\dA-Fa-f]{6}$/u;

function getThemeColor(variant) {
  const themeColor = PWA_THEME_COLORS[variant];

  if (!themeColor || !hexColorPattern.test(themeColor)) {
    throw new Error(`Für die PWA-Variante ${variant} ist keine gültige Theme-Farbe konfiguriert.`);
  }

  return themeColor;
}

async function syncIndexThemeColor(variant, dateipfad) {
  const absoluterPfad = resolve(projektRoot, dateipfad);
  const inhalt = await readFile(absoluterPfad, 'utf8');

  if (!themeColorPattern.test(inhalt)) {
    throw new Error(`In ${dateipfad} wurde kein Theme-Color-Meta-Tag gefunden.`);
  }

  const themeColor = getThemeColor(variant);
  const aktualisierterInhalt = inhalt.replace(
    themeColorPattern,
    `<meta name="theme-color" content="${themeColor}" />`,
  );

  if (aktualisierterInhalt !== inhalt) {
    await writeFile(absoluterPfad, aktualisierterInhalt, 'utf8');
  }
}

async function syncManifestThemeColor(variant, dateipfad) {
  const absoluterPfad = resolve(projektRoot, dateipfad);
  const inhalt = await readFile(absoluterPfad, 'utf8');
  const manifest = JSON.parse(inhalt);
  const themeColor = getThemeColor(variant);

  if (manifest.theme_color !== themeColor) {
    manifest.theme_color = themeColor;
    await writeFile(absoluterPfad, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  }
}

for (const [variant, dateipfad] of indexDateien) {
  await syncIndexThemeColor(variant, dateipfad);
}

for (const [variant, dateipfad] of manifestDateien) {
  await syncManifestThemeColor(variant, dateipfad);
}
