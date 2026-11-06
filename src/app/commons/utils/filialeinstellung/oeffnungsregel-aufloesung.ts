// pur-system/src/app/commons/utils/filialeinstellung/oeffnungsregel-aufloesung.ts

import type {
  IFilialeinstellungSondertagEintrag,
  IGeoeffneteOeffnungsregel,
  TSondertagsmodus,
  TDatumsregel,
  TOeffnungsregel,
  TWochenregeln,
  TWochentag,
} from '../../models/domain/filialeinstellung';
import type {
  IDienstplanGesetzlicherFeiertag,
  IDienstplanKalenderSondertag,
  TDienstplanOeffnungsregelQuelle,
} from '../../models/domain/dienstplan-kalendertag';
import {
  getBerechneterSondertagDatum,
  getGesetzlicherFeiertagDatum,
  getGesetzlicherFeiertagKatalogeintrag,
} from './feiertag';

// ===== Konstanten & Typen ===================

export interface IOeffnungsregelAufloesungsanfrage {
  datum: string;
  standardoeffnungsregel: IGeoeffneteOeffnungsregel;
  wochenregeln: TWochenregeln;
  sondertage: readonly IFilialeinstellungSondertagEintrag[];
}

export interface IAufgeloesteOeffnungsregel {
  datum: string;
  wochentag: TWochentag;
  quelle: TDienstplanOeffnungsregelQuelle;
  oeffnungsregel: TOeffnungsregel;
  bezeichnung?: string;
  sondertagId?: string;
  gesetzlicherFeiertag?: IDienstplanGesetzlicherFeiertag;
  aktiveSondertage: readonly IDienstplanKalenderSondertag[];
}

const WOCHENTAGE: readonly TWochentag[] = [
  'sonntag',
  'montag',
  'dienstag',
  'mittwoch',
  'donnerstag',
  'freitag',
  'samstag',
];

// ===== Öffentliche Aktionen =================

/**
 * Löst die für ein lokales Filialdatum wirksame Öffnungsregel auf.
 *
 * Ein aktiver benutzerdefinierter Sondertag besitzt Vorrang vor einem systemdefinierten Sondertag und der Wochenregel. Eine
 * über Mitternacht reichende Regel gehört vollständig zu dem Datum, an dem sie beginnt.
 *
 * @param anfrage - Datum und vollständige Filialeinstellungen.
 * @returns Wirksame Öffnungsregel mit nachvollziehbarer Quelle.
 * @throws Wenn das Datum ungültig, die Wochenregel unvollständig oder mehr als ein Sondertag wirksam ist.
 */
export function resolveOeffnungsregel(
  anfrage: IOeffnungsregelAufloesungsanfrage,
): IAufgeloesteOeffnungsregel {
  const datumsteile = parseDatum(anfrage.datum);
  const wochentag = getWochentag(datumsteile);
  const gesetzlicherFeiertag = resolveGesetzlicherFeiertag(anfrage.sondertage, datumsteile);
  const passendeSondertage = anfrage.sondertage.filter((sondertag) => {
    return (
      getSondertagsmodus(sondertag) !== 'standard' &&
      matchesDatumsregel(sondertag.datumsregel, datumsteile)
    );
  });
  const aktiveSondertage = passendeSondertage.map((sondertag) => {
    return { id: sondertag.id, bezeichnung: sondertag.bezeichnung };
  });
  const benutzerdefinierteSondertage = passendeSondertage.filter((sondertag) => {
    return sondertag.herkunft === 'benutzer';
  });
  if (benutzerdefinierteSondertage.length > 1) {
    const bezeichnungen = benutzerdefinierteSondertage.map((sondertag) => {
      return sondertag.bezeichnung;
    });
    throw new Error(
      `Für ${anfrage.datum} sind mehrere aktive benutzerdefinierte Sondertage konfiguriert: ${bezeichnungen.join(', ')}.`,
    );
  }
  const systemSondertage = passendeSondertage.filter((sondertag) => {
    return sondertag.herkunft === 'system';
  });
  if (benutzerdefinierteSondertage.length === 0 && systemSondertage.length > 1) {
    const bezeichnungen = systemSondertage.map((sondertag) => {
      return sondertag.bezeichnung;
    });
    throw new Error(
      `Für ${anfrage.datum} sind mehrere aktive systemdefinierte Sondertage konfiguriert: ${bezeichnungen.join(', ')}.`,
    );
  }
  const sondertag = benutzerdefinierteSondertage[0] ?? systemSondertage[0];
  if (sondertag) {
    const modus = getSondertagsmodus(sondertag);
    const verwendetSonntag = modus === 'wieSonntag';
    return {
      datum: anfrage.datum,
      wochentag,
      quelle: verwendetSonntag ? 'sonntag' : 'sondertag',
      sondertagId: sondertag.id,
      bezeichnung: sondertag.bezeichnung,
      oeffnungsregel: verwendetSonntag
        ? resolveWochenoeffnungsregel(
            anfrage.standardoeffnungsregel,
            anfrage.wochenregeln,
            'sonntag',
          )
        : sondertag.oeffnungsregel,
      aktiveSondertage,
      ...(gesetzlicherFeiertag ? { gesetzlicherFeiertag } : {}),
    };
  }

  if (gesetzlicherFeiertag) {
    return {
      datum: anfrage.datum,
      wochentag,
      quelle: 'wochentag',
      oeffnungsregel: { ...anfrage.standardoeffnungsregel },
      aktiveSondertage,
      gesetzlicherFeiertag,
    };
  }

  const wochenregel = resolveWochenoeffnungsregel(
    anfrage.standardoeffnungsregel,
    anfrage.wochenregeln,
    wochentag,
  );
  return {
    datum: anfrage.datum,
    wochentag,
    quelle: 'wochentag',
    oeffnungsregel: wochenregel,
    aktiveSondertage,
    ...(gesetzlicherFeiertag ? { gesetzlicherFeiertag } : {}),
  };
}

/**
 * Liefert den gespeicherten oder aus Altdaten abgeleiteten Modus eines Sondertags.
 *
 * @param sondertag - Gespeicherter Sondertag mit optionalem neuem Modusfeld.
 * @returns Expliziter oder aus Aktivstatus und Öffnungsregel abgeleiteter Modus.
 */
export function getSondertagsmodus(
  sondertag: Pick<IFilialeinstellungSondertagEintrag, 'aktiv' | 'modus' | 'oeffnungsregel'>,
): TSondertagsmodus {
  if (
    sondertag.modus === 'standard' ||
    sondertag.modus === 'wieSonntag' ||
    sondertag.modus === 'abweichend' ||
    sondertag.modus === 'geschlossen'
  ) {
    return sondertag.modus;
  }
  if (!sondertag.aktiv) return 'standard';
  return sondertag.oeffnungsregel.geoeffnet ? 'abweichend' : 'geschlossen';
}

/**
 * Löst die wirksame Öffnungsregel eines Wochentags aus Standard, Abweichung oder Schließung auf.
 *
 * @param standardoeffnungsregel - Aktuelle Standardöffnung der Filiale.
 * @param wochenregeln - Vollständige Konfiguration aller Wochentage.
 * @param wochentag - Aufzulösender Wochentag.
 * @returns Wirksame absolute Öffnungsregel des Wochentags.
 */
export function resolveWochenoeffnungsregel(
  standardoeffnungsregel: IGeoeffneteOeffnungsregel,
  wochenregeln: TWochenregeln,
  wochentag: TWochentag,
): TOeffnungsregel {
  const wochenregel = wochenregeln[wochentag];
  if (!wochenregel) {
    throw new Error(`Für ${wochentag} ist keine Öffnungsregel konfiguriert.`);
  }
  if (wochenregel.modus === 'standard') return { ...standardoeffnungsregel };
  if (wochenregel.modus === 'geschlossen') return { geoeffnet: false };
  return { ...wochenregel.oeffnungsregel };
}

// ===== Interne Helfer =======================

interface IDatumsteile {
  jahr: number;
  monat: number;
  tag: number;
}

function resolveGesetzlicherFeiertag(
  sondertage: readonly IFilialeinstellungSondertagEintrag[],
  datum: IDatumsteile,
): IDienstplanGesetzlicherFeiertag | undefined {
  const passendeFeiertage = sondertage.filter((sondertag) => {
    return (
      sondertag.datumsregel.typ === 'gesetzlicherFeiertag' &&
      matchesDatumsregel(sondertag.datumsregel, datum)
    );
  });
  if (passendeFeiertage.length > 1) {
    throw new Error(`Für ${createDatum(datum)} sind mehrere gesetzliche Feiertage vorhanden.`);
  }
  const feiertag = passendeFeiertage[0];
  if (!feiertag || feiertag.datumsregel.typ !== 'gesetzlicherFeiertag') return undefined;
  const katalogeintrag = getGesetzlicherFeiertagKatalogeintrag(
    feiertag.datumsregel.feiertagSchluessel,
  );
  return {
    schluessel: feiertag.datumsregel.feiertagSchluessel,
    bezeichnung: katalogeintrag.bezeichnung,
  };
}

function matchesDatumsregel(datumsregel: TDatumsregel, datum: IDatumsteile): boolean {
  if (datumsregel.typ === 'jaehrlichFestesDatum') {
    return datumsregel.monat === datum.monat && datumsregel.tag === datum.tag;
  }
  if (datumsregel.typ === 'berechneterSondertag') {
    return (
      getBerechneterSondertagDatum(datum.jahr, datumsregel.sondertagSchluessel) ===
      createDatum(datum)
    );
  }
  return (
    getGesetzlicherFeiertagDatum(datum.jahr, datumsregel.feiertagSchluessel) === createDatum(datum)
  );
}

function parseDatum(datum: string): IDatumsteile {
  const treffer = /^(\d{4})-(\d{2})-(\d{2})$/.exec(datum);
  if (!treffer) {
    throw new Error('Das Datum muss dem Format YYYY-MM-DD entsprechen.');
  }
  const datumsteile = {
    jahr: Number(treffer[1]),
    monat: Number(treffer[2]),
    tag: Number(treffer[3]),
  };
  const pruefdatum = new Date(Date.UTC(datumsteile.jahr, datumsteile.monat - 1, datumsteile.tag));
  if (
    pruefdatum.getUTCFullYear() !== datumsteile.jahr ||
    pruefdatum.getUTCMonth() + 1 !== datumsteile.monat ||
    pruefdatum.getUTCDate() !== datumsteile.tag
  ) {
    throw new Error('Das Datum muss ein gültiges Kalenderdatum sein.');
  }
  return datumsteile;
}

function getWochentag(datum: IDatumsteile): TWochentag {
  const wochentagIndex = new Date(Date.UTC(datum.jahr, datum.monat - 1, datum.tag)).getUTCDay();
  const wochentag = WOCHENTAGE[wochentagIndex];
  if (!wochentag) {
    throw new Error('Der Wochentag konnte nicht ermittelt werden.');
  }
  return wochentag;
}

function createDatum(datum: IDatumsteile): string {
  return `${String(datum.jahr).padStart(4, '0')}-${String(datum.monat).padStart(2, '0')}-${String(datum.tag).padStart(2, '0')}`;
}
