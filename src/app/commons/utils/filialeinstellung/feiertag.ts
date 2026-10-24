// pur-system/src/app/commons/utils/filialeinstellung/feiertag.ts

import type {
  IGeschlosseneOeffnungsregel,
  IGeoeffneteOeffnungsregel,
  IFilialeinstellungSondertagVorlage,
  TBundeslandCode,
  TGesetzlicherFeiertagSchluessel,
} from '../../models/domain/filialeinstellung';

// ===== Konstanten & Typen ===================

export interface IGesetzlicherFeiertagKatalogeintrag {
  schluessel: TGesetzlicherFeiertagSchluessel;
  bezeichnung: string;
  datumsart: 'fest' | 'berechnet';
  automatischeBundeslaender: readonly TBundeslandCode[];
  lokalBegrenzteBundeslaender: readonly TBundeslandCode[];
}

export interface IAufgeloesterGesetzlicherFeiertag {
  schluessel: TGesetzlicherFeiertagSchluessel;
  bezeichnung: string;
  datum: string;
}

const ALLE_BUNDESLAENDER: readonly TBundeslandCode[] = [
  'DE-BB',
  'DE-BE',
  'DE-BW',
  'DE-BY',
  'DE-HB',
  'DE-HE',
  'DE-HH',
  'DE-MV',
  'DE-NI',
  'DE-NW',
  'DE-RP',
  'DE-SH',
  'DE-SL',
  'DE-SN',
  'DE-ST',
  'DE-TH',
];

const KEINE_BUNDESLAENDER: readonly TBundeslandCode[] = [];

export const GESETZLICHE_FEIERTAGE_KATALOG: readonly IGesetzlicherFeiertagKatalogeintrag[] = [
  createKatalogeintrag('neujahr', 'Neujahr', ALLE_BUNDESLAENDER),
  createKatalogeintrag('heiligeDreiKoenige', 'Heilige Drei Könige', ['DE-BW', 'DE-BY', 'DE-ST']),
  createKatalogeintrag('internationalerFrauentag', 'Internationaler Frauentag', ['DE-BE', 'DE-MV']),
  createKatalogeintrag('karfreitag', 'Karfreitag', ALLE_BUNDESLAENDER, 'berechnet'),
  createKatalogeintrag('ostersonntag', 'Ostersonntag', ['DE-BB'], 'berechnet'),
  createKatalogeintrag('ostermontag', 'Ostermontag', ALLE_BUNDESLAENDER, 'berechnet'),
  createKatalogeintrag('tagDerArbeit', 'Tag der Arbeit', ALLE_BUNDESLAENDER),
  createKatalogeintrag(
    'christiHimmelfahrt',
    'Christi Himmelfahrt',
    ALLE_BUNDESLAENDER,
    'berechnet',
  ),
  createKatalogeintrag('pfingstsonntag', 'Pfingstsonntag', ['DE-BB'], 'berechnet'),
  createKatalogeintrag('pfingstmontag', 'Pfingstmontag', ALLE_BUNDESLAENDER, 'berechnet'),
  createKatalogeintrag(
    'fronleichnam',
    'Fronleichnam',
    ['DE-BW', 'DE-BY', 'DE-HE', 'DE-NW', 'DE-RP', 'DE-SL'],
    'berechnet',
    ['DE-SN', 'DE-TH'],
  ),
  createKatalogeintrag(
    'augsburgerFriedensfest',
    'Augsburger Friedensfest',
    KEINE_BUNDESLAENDER,
    'fest',
    ['DE-BY'],
  ),
  createKatalogeintrag('mariaHimmelfahrt', 'Mariä Himmelfahrt', ['DE-SL'], 'fest', ['DE-BY']),
  createKatalogeintrag('weltkindertag', 'Weltkindertag', ['DE-TH']),
  createKatalogeintrag('tagDerDeutschenEinheit', 'Tag der Deutschen Einheit', ALLE_BUNDESLAENDER),
  createKatalogeintrag('reformationstag', 'Reformationstag', [
    'DE-BB',
    'DE-HB',
    'DE-HH',
    'DE-MV',
    'DE-NI',
    'DE-SH',
    'DE-SN',
    'DE-ST',
    'DE-TH',
  ]),
  createKatalogeintrag('allerheiligen', 'Allerheiligen', [
    'DE-BW',
    'DE-BY',
    'DE-NW',
    'DE-RP',
    'DE-SL',
  ]),
  createKatalogeintrag('bussUndBettag', 'Buß- und Bettag', ['DE-SN'], 'berechnet'),
  createKatalogeintrag('ersterWeihnachtstag', '1. Weihnachtstag', ALLE_BUNDESLAENDER),
  createKatalogeintrag('zweiterWeihnachtstag', '2. Weihnachtstag', ALLE_BUNDESLAENDER),
  createKatalogeintrag('aufstand17Juni2028', '75. Jahrestag des Aufstands vom 17. Juni 1953', [
    'DE-BE',
  ]),
];

const KATALOG_NACH_SCHLUESSEL = new Map(
  GESETZLICHE_FEIERTAGE_KATALOG.map((eintrag) => {
    return [eintrag.schluessel, eintrag] as const;
  }),
);

// ===== Öffentliche Aktionen =================

/**
 * Löst alle landesweit geltenden gesetzlichen Feiertage eines Bundeslands für ein Jahr auf.
 *
 * Lokal oder kommunal begrenzte Feiertage werden nicht automatisch berücksichtigt.
 *
 * @param jahr - Vollständiges gregorianisches Kalenderjahr.
 * @param bundesland - Deutscher ISO-3166-2-Code.
 * @returns Chronologisch sortierte gesetzliche Feiertage.
 */
export function getGesetzlicheFeiertage(
  jahr: number,
  bundesland: TBundeslandCode,
): readonly IAufgeloesterGesetzlicherFeiertag[] {
  validateJahr(jahr);
  return GESETZLICHE_FEIERTAGE_KATALOG.filter((eintrag) => {
    return eintrag.automatischeBundeslaender.includes(bundesland);
  })
    .map((eintrag) => {
      const datum = getGesetzlicherFeiertagDatum(jahr, eintrag.schluessel);
      return datum
        ? {
            schluessel: eintrag.schluessel,
            bezeichnung: eintrag.bezeichnung,
            datum,
          }
        : null;
    })
    .filter((eintrag): eintrag is IAufgeloesterGesetzlicherFeiertag => {
      return eintrag !== null;
    })
    .sort((links, rechts) => {
      return links.datum.localeCompare(rechts.datum);
    });
}

/**
 * Berechnet das Datum eines bekannten gesetzlichen Feiertagsschlüssels.
 *
 * @param jahr - Vollständiges gregorianisches Kalenderjahr.
 * @param schluessel - Zentral definierter Feiertagsschlüssel.
 * @returns Lokales Datum im Format `YYYY-MM-DD` oder `null`, wenn ein einmaliger Feiertag nicht im Jahr liegt.
 */
export function getGesetzlicherFeiertagDatum(
  jahr: number,
  schluessel: TGesetzlicherFeiertagSchluessel,
): string | null {
  validateJahr(jahr);
  switch (schluessel) {
    case 'neujahr':
      return createDatum(jahr, 1, 1);
    case 'heiligeDreiKoenige':
      return createDatum(jahr, 1, 6);
    case 'internationalerFrauentag':
      return createDatum(jahr, 3, 8);
    case 'karfreitag':
      return addTage(getOstersonntag(jahr), -2);
    case 'ostersonntag':
      return getOstersonntag(jahr);
    case 'ostermontag':
      return addTage(getOstersonntag(jahr), 1);
    case 'tagDerArbeit':
      return createDatum(jahr, 5, 1);
    case 'christiHimmelfahrt':
      return addTage(getOstersonntag(jahr), 39);
    case 'pfingstsonntag':
      return addTage(getOstersonntag(jahr), 49);
    case 'pfingstmontag':
      return addTage(getOstersonntag(jahr), 50);
    case 'fronleichnam':
      return addTage(getOstersonntag(jahr), 60);
    case 'augsburgerFriedensfest':
      return createDatum(jahr, 8, 8);
    case 'mariaHimmelfahrt':
      return createDatum(jahr, 8, 15);
    case 'weltkindertag':
      return createDatum(jahr, 9, 20);
    case 'tagDerDeutschenEinheit':
      return createDatum(jahr, 10, 3);
    case 'reformationstag':
      return createDatum(jahr, 10, 31);
    case 'allerheiligen':
      return createDatum(jahr, 11, 1);
    case 'bussUndBettag':
      return getBussUndBettag(jahr);
    case 'ersterWeihnachtstag':
      return createDatum(jahr, 12, 25);
    case 'zweiterWeihnachtstag':
      return createDatum(jahr, 12, 26);
    case 'aufstand17Juni2028':
      return jahr === 2028 ? createDatum(jahr, 6, 17) : null;
  }
}

/**
 * Erstellt die initial inaktiven Sondertage einer Filiale.
 *
 * @param bundesland - Bundesland der Filiale.
 * @param oeffnungsrahmen - Aus dem Schließzeitraum abgeleitete zeitliche Vorbelegung.
 * @returns Gesetzliche Feiertage des Bundeslands sowie Heiligabend und Silvester.
 */
export function createInitialeSondertage(
  bundesland: TBundeslandCode,
  oeffnungsrahmen: IGeoeffneteOeffnungsregel,
): readonly IFilialeinstellungSondertagVorlage[] {
  const gesetzlicheFeiertage = GESETZLICHE_FEIERTAGE_KATALOG.filter((eintrag) => {
    return eintrag.automatischeBundeslaender.includes(bundesland);
  }).map((eintrag) => {
    return {
      id: eintrag.schluessel,
      bezeichnung: eintrag.bezeichnung,
      aktiv: false,
      herkunft: 'system' as const,
      datumsregel: {
        typ: 'gesetzlicherFeiertag' as const,
        feiertagSchluessel: eintrag.schluessel,
      },
      oeffnungsregel: createGeschlosseneOeffnungsregel(oeffnungsrahmen),
    };
  });
  return [
    ...gesetzlicheFeiertage,
    createFesterSondertag('heiligabend', 'Heiligabend', 12, 24, oeffnungsrahmen),
    createFesterSondertag('silvester', 'Silvester', 12, 31, oeffnungsrahmen),
  ];
}

/**
 * Gleicht systemdefinierte Sondertage nach einem Bundeslandwechsel ab.
 *
 * Gemeinsame gesetzliche Feiertage behalten ihre angepassten Öffnungsregeln. Nicht mehr landesweit geltende gesetzliche
 * Feiertage werden entfernt, neu geltende inaktiv ergänzt. Benutzerdefinierte Sondertage bleiben unverändert.
 *
 * @param vorhandeneSondertage - Bisherige Sondertagsvorlagen der Filiale.
 * @param bundesland - Neu ausgewähltes Bundesland.
 * @param oeffnungsrahmen - Zeitliche Vorbelegung für neu hinzukommende Systemtage.
 * @returns Abgeglichene Sondertagsvorlagen.
 */
export function reconcileInitialeSondertage(
  vorhandeneSondertage: readonly IFilialeinstellungSondertagVorlage[],
  bundesland: TBundeslandCode,
  oeffnungsrahmen: IGeoeffneteOeffnungsregel,
): readonly IFilialeinstellungSondertagVorlage[] {
  const initialeSondertage = createInitialeSondertage(bundesland, oeffnungsrahmen);
  const vorhandeneNachId = new Map(
    vorhandeneSondertage.map((sondertag) => {
      return [sondertag.id, sondertag] as const;
    }),
  );
  const abgeglicheneSystemtage = initialeSondertage.map((sondertag) => {
    return vorhandeneNachId.get(sondertag.id) ?? sondertag;
  });
  const benutzerdefinierteSondertage = vorhandeneSondertage.filter((sondertag) => {
    return sondertag.herkunft === 'benutzer';
  });
  return [...abgeglicheneSystemtage, ...benutzerdefinierteSondertage];
}

/**
 * Liefert den zentralen Katalogeintrag eines Feiertagsschlüssels.
 *
 * @param schluessel - Zentral definierter Feiertagsschlüssel.
 * @returns Unveränderlicher Katalogeintrag.
 */
export function getGesetzlicherFeiertagKatalogeintrag(
  schluessel: TGesetzlicherFeiertagSchluessel,
): IGesetzlicherFeiertagKatalogeintrag {
  const eintrag = KATALOG_NACH_SCHLUESSEL.get(schluessel);
  if (!eintrag) {
    throw new Error(`Der gesetzliche Feiertag ${schluessel} ist nicht im Katalog enthalten.`);
  }
  return eintrag;
}

// ===== Interne Helfer =======================

function createKatalogeintrag(
  schluessel: TGesetzlicherFeiertagSchluessel,
  bezeichnung: string,
  automatischeBundeslaender: readonly TBundeslandCode[],
  datumsart: 'fest' | 'berechnet' = 'fest',
  lokalBegrenzteBundeslaender: readonly TBundeslandCode[] = KEINE_BUNDESLAENDER,
): IGesetzlicherFeiertagKatalogeintrag {
  return {
    schluessel,
    bezeichnung,
    datumsart,
    automatischeBundeslaender,
    lokalBegrenzteBundeslaender,
  };
}

function createFesterSondertag(
  id: string,
  bezeichnung: string,
  monat: number,
  tag: number,
  oeffnungsrahmen: IGeoeffneteOeffnungsregel,
): IFilialeinstellungSondertagVorlage {
  return {
    id,
    bezeichnung,
    aktiv: false,
    herkunft: 'system',
    datumsregel: {
      typ: 'jaehrlichFestesDatum',
      monat,
      tag,
    },
    oeffnungsregel: createGeschlosseneOeffnungsregel(oeffnungsrahmen),
  };
}

function createGeschlosseneOeffnungsregel(
  oeffnungsrahmen: IGeoeffneteOeffnungsregel,
): IGeschlosseneOeffnungsregel {
  return {
    geoeffnet: false,
    beginnLokalzeit: oeffnungsrahmen.beginnLokalzeit,
    endeLokalzeit: oeffnungsrahmen.endeLokalzeit,
    endetAmFolgetag: oeffnungsrahmen.endetAmFolgetag,
  };
}

function getOstersonntag(jahr: number): string {
  const a = jahr % 19;
  const b = Math.floor(jahr / 100);
  const c = jahr % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const monat = Math.floor((h + l - 7 * m + 114) / 31);
  const tag = ((h + l - 7 * m + 114) % 31) + 1;
  return createDatum(jahr, monat, tag);
}

function getBussUndBettag(jahr: number): string {
  const datum = new Date(Date.UTC(jahr, 10, 22));
  while (datum.getUTCDay() !== 3) {
    datum.setUTCDate(datum.getUTCDate() - 1);
  }
  return formatDatum(datum);
}

function addTage(datum: string, tage: number): string {
  const [jahr, monat, tag] = datum.split('-').map(Number);
  const ergebnis = new Date(Date.UTC(jahr, monat - 1, tag + tage));
  return formatDatum(ergebnis);
}

function createDatum(jahr: number, monat: number, tag: number): string {
  return `${String(jahr).padStart(4, '0')}-${String(monat).padStart(2, '0')}-${String(tag).padStart(2, '0')}`;
}

function formatDatum(datum: Date): string {
  return createDatum(datum.getUTCFullYear(), datum.getUTCMonth() + 1, datum.getUTCDate());
}

function validateJahr(jahr: number): void {
  if (!Number.isInteger(jahr) || jahr < 1583 || jahr > 9999) {
    throw new Error('Das Feiertagsjahr muss eine ganze Zahl zwischen 1583 und 9999 sein.');
  }
}
