// pur-system/src/app/commons/utils/filialeinstellung/oeffnungsregel-aufloesung.ts

import type {
  IFilialeinstellungAusnahmeEintrag,
  IFilialeinstellungSondertagEintrag,
  TDatumsregel,
  TOeffnungsregel,
  TWochenoeffnungszeiten,
  TWochentag,
} from '../../models/domain/filialeinstellung';
import type {
  IDienstplanGesetzlicherFeiertag,
  IDienstplanKalenderSondertag,
  TDienstplanOeffnungsregelQuelle,
} from '../../models/domain/dienstplan-kalendertag';
import { getGesetzlicherFeiertagDatum, getGesetzlicherFeiertagKatalogeintrag } from './feiertag';

// ===== Konstanten & Typen ===================

export interface IOeffnungsregelAufloesungsanfrage {
  datum: string;
  wochenregeln: TWochenoeffnungszeiten;
  sondertage: readonly IFilialeinstellungSondertagEintrag[];
  ausnahmen: readonly IFilialeinstellungAusnahmeEintrag[];
}

export interface IAufgeloesteOeffnungsregel {
  datum: string;
  wochentag: TWochentag;
  quelle: TDienstplanOeffnungsregelQuelle;
  oeffnungsregel: TOeffnungsregel;
  bezeichnung?: string;
  sondertagId?: string;
  ausnahmeId?: string;
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
 * Eine Datumsausnahme besitzt Vorrang vor einem aktiven Sondertag und der Wochenregel. Eine über Mitternacht reichende Regel
 * gehört vollständig zu dem Datum, an dem sie beginnt.
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
    return sondertag.aktiv && matchesDatumsregel(sondertag.datumsregel, datumsteile);
  });
  const aktiveSondertage = passendeSondertage.map((sondertag) => {
    return { id: sondertag.id, bezeichnung: sondertag.bezeichnung };
  });
  const passendeAusnahmen = anfrage.ausnahmen.filter((ausnahme) => {
    return ausnahme.datum === anfrage.datum;
  });
  if (passendeAusnahmen.length > 1) {
    throw new Error(`Für ${anfrage.datum} sind mehrere Datumsausnahmen vorhanden.`);
  }
  const ausnahme = passendeAusnahmen[0];
  if (ausnahme) {
    return {
      datum: anfrage.datum,
      wochentag,
      quelle: 'ausnahme',
      ausnahmeId: ausnahme.id,
      bezeichnung: ausnahme.bezeichnung,
      oeffnungsregel: ausnahme.oeffnungsregel,
      aktiveSondertage,
      ...(gesetzlicherFeiertag ? { gesetzlicherFeiertag } : {}),
    };
  }

  if (passendeSondertage.length > 1) {
    const bezeichnungen = passendeSondertage.map((sondertag) => {
      return sondertag.bezeichnung;
    });
    throw new Error(
      `Für ${anfrage.datum} sind mehrere aktive Sondertage konfiguriert: ${bezeichnungen.join(', ')}.`,
    );
  }
  const sondertag = passendeSondertage[0];
  if (sondertag) {
    return {
      datum: anfrage.datum,
      wochentag,
      quelle: 'sondertag',
      sondertagId: sondertag.id,
      bezeichnung: sondertag.bezeichnung,
      oeffnungsregel: sondertag.oeffnungsregel,
      aktiveSondertage,
      ...(gesetzlicherFeiertag ? { gesetzlicherFeiertag } : {}),
    };
  }

  const wochenregel = anfrage.wochenregeln[wochentag];
  if (!wochenregel) {
    throw new Error(`Für ${wochentag} ist keine Öffnungsregel konfiguriert.`);
  }
  return {
    datum: anfrage.datum,
    wochentag,
    quelle: 'wochentag',
    oeffnungsregel: wochenregel,
    aktiveSondertage,
    ...(gesetzlicherFeiertag ? { gesetzlicherFeiertag } : {}),
  };
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
