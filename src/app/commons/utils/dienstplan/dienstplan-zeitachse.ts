// pur-system/src/app/commons/utils/dienstplan/dienstplan-zeitachse.ts

import { ZEITRASTER_MINUTEN } from '../../constants/zeit.constants';
import { getLokalzeitMinuten } from './schicht-lokalzeit';

// ===== Konstanten & Typen ===================

const MINUTEN_PRO_STUNDE = 60;
const MINUTEN_PRO_TAG = 24 * MINUTEN_PRO_STUNDE;

export interface IDienstplanZeitgrenze {
  readonly lokalzeit: string;
  readonly amFolgetag: boolean;
}

export interface IDienstplanZeitfenster {
  readonly beginn: IDienstplanZeitgrenze;
  readonly ende: IDienstplanZeitgrenze;
}

export interface IDienstplanZeitachsenIntervall extends IDienstplanZeitfenster {
  readonly id: string;
}

export interface IDienstplanZeitachsenMarke {
  readonly bezeichnung: string;
  readonly positionProzent: number;
}

export interface IDienstplanZeitachse {
  readonly beginnMinuten: number;
  readonly endeMinuten: number;
  readonly dauerMinuten: number;
  readonly rasterAnzahl: number;
  readonly stundenAnzahl: number;
  readonly marken: readonly IDienstplanZeitachsenMarke[];
}

export interface IDienstplanZeitachsenPosition {
  readonly id: string;
  readonly beginnRasterlinie: number;
  readonly endeRasterlinie: number;
  readonly spur: number;
}

// ===== Öffentliche Aktionen =================

/**
 * Erstellt eine auf volle Stunden gerundete gemeinsame Zeitachse für mehrere Zeitfenster.
 *
 * @param zeitfenster - Geöffnete Tagesfenster mit eindeutiger Folgetagszuordnung.
 * @returns Gemeinsame Zeitachse mit stündlichen Marken.
 */
export function createDienstplanZeitachse(
  zeitfenster: readonly IDienstplanZeitfenster[],
): IDienstplanZeitachse {
  const absoluteZeitfenster = zeitfenster.map((fenster) => {
    return {
      beginn: getAbsoluteMinuten(fenster.beginn),
      ende: getAbsoluteMinuten(fenster.ende),
    };
  });
  const gueltigeZeitfenster = absoluteZeitfenster.filter((fenster) => {
    return fenster.ende > fenster.beginn;
  });
  const beginnMinuten = gueltigeZeitfenster.length
    ? Math.floor(Math.min(...gueltigeZeitfenster.map((fenster) => fenster.beginn)) / 60) * 60
    : 0;
  const endeMinuten = gueltigeZeitfenster.length
    ? Math.ceil(Math.max(...gueltigeZeitfenster.map((fenster) => fenster.ende)) / 60) * 60
    : MINUTEN_PRO_TAG;
  const dauerMinuten = endeMinuten - beginnMinuten;
  const marken: IDienstplanZeitachsenMarke[] = [];
  for (let minuten = beginnMinuten; minuten <= endeMinuten; minuten += MINUTEN_PRO_STUNDE) {
    marken.push({
      bezeichnung: formatAbsoluteMinuten(minuten),
      positionProzent: ((minuten - beginnMinuten) / dauerMinuten) * 100,
    });
  }
  return {
    beginnMinuten,
    endeMinuten,
    dauerMinuten,
    rasterAnzahl: dauerMinuten / ZEITRASTER_MINUTEN,
    stundenAnzahl: dauerMinuten / MINUTEN_PRO_STUNDE,
    marken,
  };
}

/**
 * Positioniert Zeitintervalle auf einer gemeinsamen Achse und verteilt Überschneidungen auf getrennte Spuren.
 *
 * @param intervalle - Zeitintervalle eines Kalendertags.
 * @param zeitachse - Gemeinsame Zeitachse der Monatsdarstellung.
 * @returns Rasterlinien im 15-Minuten-Abstand und vertikale Spuren je Intervall.
 */
export function createDienstplanZeitachsenPositionen(
  intervalle: readonly IDienstplanZeitachsenIntervall[],
  zeitachse: IDienstplanZeitachse,
): readonly IDienstplanZeitachsenPosition[] {
  const absoluteIntervalle = intervalle
    .map((intervall, index) => {
      return {
        id: intervall.id,
        index,
        beginn: getAbsoluteMinuten(intervall.beginn),
        ende: getAbsoluteMinuten(intervall.ende),
      };
    })
    .sort((a, b) => a.beginn - b.beginn || a.ende - b.ende || a.index - b.index);
  const spurEnden: number[] = [];
  const positionen = absoluteIntervalle.map((intervall) => {
    if (
      intervall.ende <= intervall.beginn ||
      intervall.beginn < zeitachse.beginnMinuten ||
      intervall.ende > zeitachse.endeMinuten
    ) {
      throw new Error('Die Tagesschicht liegt außerhalb der gemeinsamen Zeitachse.');
    }
    let spur = spurEnden.findIndex((ende) => ende <= intervall.beginn);
    if (spur === -1) {
      spur = spurEnden.length;
      spurEnden.push(intervall.ende);
    } else {
      spurEnden[spur] = intervall.ende;
    }
    return {
      id: intervall.id,
      beginnRasterlinie: getRasterlinie(intervall.beginn - zeitachse.beginnMinuten),
      endeRasterlinie: getRasterlinie(intervall.ende - zeitachse.beginnMinuten),
      spur,
    };
  });
  return positionen.sort((a, b) => {
    const aIndex = intervalle.findIndex((intervall) => intervall.id === a.id);
    const bIndex = intervalle.findIndex((intervall) => intervall.id === b.id);
    return aIndex - bIndex;
  });
}

/**
 * Liefert die vor und nach einer Tagesöffnung geschlossenen Bereiche der gemeinsamen Zeitachse.
 *
 * @param zeitfenster - Wirksame Tagesöffnung oder `null` für einen vollständig geschlossenen Tag.
 * @param zeitachse - Gemeinsame Zeitachse der Monatsdarstellung.
 * @returns Bis zu zwei geschlossene Bereiche oder ein Bereich über die gesamte Achse.
 */
export function createGeschlosseneZeitachsenPositionen(
  zeitfenster: IDienstplanZeitfenster | null,
  zeitachse: IDienstplanZeitachse,
): readonly IDienstplanZeitachsenPosition[] {
  if (!zeitfenster) {
    return [createRasterposition('geschlossen', 0, zeitachse.dauerMinuten, 0)];
  }
  const beginn = getAbsoluteMinuten(zeitfenster.beginn);
  const ende = getAbsoluteMinuten(zeitfenster.ende);
  if (ende <= beginn || beginn < zeitachse.beginnMinuten || ende > zeitachse.endeMinuten) {
    throw new Error('Die Tagesöffnung liegt außerhalb der gemeinsamen Zeitachse.');
  }
  const positionen: IDienstplanZeitachsenPosition[] = [];
  if (beginn > zeitachse.beginnMinuten) {
    positionen.push(
      createRasterposition('geschlossen-vorher', 0, beginn - zeitachse.beginnMinuten, 0),
    );
  }
  if (ende < zeitachse.endeMinuten) {
    positionen.push(
      createRasterposition(
        'geschlossen-nachher',
        ende - zeitachse.beginnMinuten,
        zeitachse.dauerMinuten,
        0,
      ),
    );
  }
  return positionen;
}

// ===== Interne Helfer =======================

function createRasterposition(
  id: string,
  beginn: number,
  ende: number,
  spur: number,
): IDienstplanZeitachsenPosition {
  return {
    id,
    beginnRasterlinie: getRasterlinie(beginn),
    endeRasterlinie: getRasterlinie(ende),
    spur,
  };
}

function getRasterlinie(minutenVersatz: number): number {
  if (minutenVersatz % ZEITRASTER_MINUTEN !== 0) {
    throw new Error('Die Zeitgrenze liegt außerhalb des 15-Minuten-Rasters.');
  }
  return minutenVersatz / ZEITRASTER_MINUTEN + 1;
}

function getAbsoluteMinuten(zeitgrenze: IDienstplanZeitgrenze): number {
  const minuten = getLokalzeitMinuten(zeitgrenze.lokalzeit);
  if (minuten === null) {
    throw new Error(`Die Lokalzeit „${zeitgrenze.lokalzeit}“ ist ungültig.`);
  }
  return minuten + (zeitgrenze.amFolgetag ? MINUTEN_PRO_TAG : 0);
}

function formatAbsoluteMinuten(minuten: number): string {
  const minutenImTag = minuten % MINUTEN_PRO_TAG;
  const stunden = Math.floor(minutenImTag / MINUTEN_PRO_STUNDE);
  return `${String(stunden).padStart(2, '0')}:00`;
}
