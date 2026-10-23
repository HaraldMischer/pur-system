// pur-system/src/app/commons/utils/dienstplan/dienstplan-kalendertage.ts

import type {
  IDienstplanKalendertag,
  IDienstplanRasterzeit,
} from '../../models/domain/dienstplan-kalendertag';
import type {
  IFilialeinstellungAusnahmeEintrag,
  IFilialeinstellungSondertagEintrag,
  TOeffnungsregel,
  TWochenoeffnungszeiten,
} from '../../models/domain/filialeinstellung';
import type {
  IModellschichtDaten,
  IModellschichtZeitgrenze,
} from '../../models/domain/schichtmodell';
import { resolveOeffnungsregel } from '../filialeinstellung/oeffnungsregel-aufloesung';
import { createDienstplanZeitraum } from './dienstplan-zeitraum';

const MINUTEN_PRO_TAG = 24 * 60;
const MAX_DARSTELLBARE_MINUTEN = 2 * MINUTEN_PRO_TAG;

export interface IDienstplanKalendertageAnfrage {
  monat: string;
  wochenregeln: TWochenoeffnungszeiten;
  sondertage: readonly IFilialeinstellungSondertagEintrag[];
  ausnahmen: readonly IFilialeinstellungAusnahmeEintrag[];
  modellschichten?: readonly IDienstplanRasterModellschicht[];
}

export interface IDienstplanRasterModellschicht extends Pick<
  IModellschichtDaten,
  'reihenfolge' | 'beginn' | 'ende' | 'vorbereitungsminuten' | 'nachbereitungsminuten'
> {
  id: string;
}

/**
 * Löst alle Kalendertage eines Dienstplanmonats als unveränderliche Momentaufnahme auf.
 *
 * @param anfrage - Monat und vollständige Öffnungseinstellungen der Filiale.
 * @returns Chronologisch geordnete Tagesmomentaufnahmen des vollständigen Monats.
 */
export function createDienstplanKalendertage(
  anfrage: IDienstplanKalendertageAnfrage,
): readonly IDienstplanKalendertag[] {
  const zeitraum = createDienstplanZeitraum(anfrage.monat);
  assertModellschichten(anfrage.modellschichten ?? []);
  const letzterTag = Number(zeitraum.zeitraumEnde.slice(-2));
  return Array.from({ length: letzterTag }, (_, index) => {
    const datum = `${anfrage.monat}-${String(index + 1).padStart(2, '0')}`;
    const aufgeloest = resolveOeffnungsregel({
      datum,
      wochenregeln: anfrage.wochenregeln,
      sondertage: anfrage.sondertage,
      ausnahmen: anfrage.ausnahmen,
    });
    const rasterzeiten = createRasterzeiten(
      aufgeloest.oeffnungsregel,
      anfrage.modellschichten ?? [],
    );
    return {
      datum,
      wochentag: aufgeloest.wochentag,
      istSonntag: aufgeloest.wochentag === 'sonntag',
      aktiveSondertage: aufgeloest.aktiveSondertage,
      oeffnungsregelQuelle: aufgeloest.quelle,
      oeffnungsregel: { ...aufgeloest.oeffnungsregel },
      rasterzeiten,
      ...(aufgeloest.bezeichnung ? { bezeichnung: aufgeloest.bezeichnung } : {}),
      ...(aufgeloest.sondertagId ? { sondertagId: aufgeloest.sondertagId } : {}),
      ...(aufgeloest.ausnahmeId ? { ausnahmeId: aufgeloest.ausnahmeId } : {}),
      ...(aufgeloest.gesetzlicherFeiertag
        ? { gesetzlicherFeiertag: aufgeloest.gesetzlicherFeiertag }
        : {}),
    };
  });
}

function assertModellschichten(modellschichten: readonly IDienstplanRasterModellschicht[]): void {
  const modellschichtIds = new Set<string>();
  for (const modellschicht of modellschichten) {
    if (!modellschicht.id || modellschichtIds.has(modellschicht.id)) {
      throw new Error('Die Modellschicht-IDs des Schichtrasters müssen eindeutig sein.');
    }
    modellschichtIds.add(modellschicht.id);
  }
}

/**
 * Liefert die für einen Kalendertag gespeicherte Rasterzeit.
 *
 * @param kalendertag - Tagesmomentaufnahme des Monatsplans.
 * @param modellschichtId - Stabile Modellschicht-ID aus der Monatsplan-Momentaufnahme.
 * @returns Wirksame Rasterzeit der Modellschicht.
 * @throws Wenn der Kalendertag keine Rasterzeit für die Modellschicht enthält.
 */
export function getDienstplanRasterzeit(
  kalendertag: IDienstplanKalendertag,
  modellschichtId: string,
): IDienstplanRasterzeit {
  const rasterzeit = kalendertag.rasterzeiten.find((eintrag) => {
    return eintrag.modellschichtId === modellschichtId;
  });
  if (!rasterzeit) {
    throw new Error('Die Modellschicht ist an diesem Kalendertag nicht verfügbar.');
  }
  return rasterzeit;
}

function createRasterzeiten(
  oeffnungsregel: TOeffnungsregel,
  modellschichten: readonly IDienstplanRasterModellschicht[],
): readonly IDienstplanRasterzeit[] {
  if (!oeffnungsregel.geoeffnet) return [];
  const geordnet = modellschichten.slice().sort((a, b) => a.reihenfolge - b.reihenfolge);
  if (geordnet.length === 0) return [];
  const oeffnungsbeginn = parseLokalzeit(oeffnungsregel.beginnLokalzeit);
  const oeffnungsende =
    parseLokalzeit(oeffnungsregel.endeLokalzeit) +
    (oeffnungsregel.endetAmFolgetag ? MINUTEN_PRO_TAG : 0);
  const tagesbeginn =
    oeffnungsbeginn - getRandminuten(geordnet.at(0)?.vorbereitungsminuten, 'Vorbereitungsminuten');
  const tagesende =
    oeffnungsende + getRandminuten(geordnet.at(-1)?.nachbereitungsminuten, 'Nachbereitungsminuten');
  return geordnet.flatMap((modellschicht, index) => {
    const rasterzeit = createWirksameRasterzeit({
      modellschicht,
      istErste: index === 0,
      istLetzte: index === geordnet.length - 1,
      tagesbeginn,
      tagesende,
    });
    return rasterzeit ? [rasterzeit] : [];
  });
}

function createWirksameRasterzeit(anfrage: {
  modellschicht: IDienstplanRasterModellschicht;
  istErste: boolean;
  istLetzte: boolean;
  tagesbeginn: number;
  tagesende: number;
}): IDienstplanRasterzeit | null {
  const beginn = anfrage.istErste
    ? anfrage.tagesbeginn
    : parseZeitgrenze(anfrage.modellschicht.beginn, 'Beginn');
  const ende = anfrage.istLetzte
    ? anfrage.tagesende
    : parseZeitgrenze(anfrage.modellschicht.ende, 'Ende');
  const liegtImDarstellbarenZeitraum = beginn >= 0 && ende < MAX_DARSTELLBARE_MINUTEN;
  const liegtImTagesrahmen = beginn >= anfrage.tagesbeginn && ende <= anfrage.tagesende;
  if (!liegtImDarstellbarenZeitraum || !liegtImTagesrahmen || ende <= beginn) return null;
  return {
    modellschichtId: anfrage.modellschicht.id,
    beginnLokalzeit: formatLokalzeit(beginn),
    endeLokalzeit: formatLokalzeit(ende),
    beginntAmFolgetag: beginn >= MINUTEN_PRO_TAG,
    endetAmFolgetag: ende >= MINUTEN_PRO_TAG,
  };
}

function parseZeitgrenze(
  zeitgrenze: IModellschichtZeitgrenze | undefined,
  bezeichnung: string,
): number {
  if (!zeitgrenze) {
    throw new Error(`Die Modellschicht enthält keinen inneren ${bezeichnung}.`);
  }
  return (
    parseLokalzeit(zeitgrenze.lokalzeit) + (zeitgrenze.tag === 'folgetag' ? MINUTEN_PRO_TAG : 0)
  );
}

function getRandminuten(wert: number | undefined, bezeichnung: string): number {
  const minuten = wert ?? 0;
  if (!Number.isInteger(minuten) || minuten < 0) {
    throw new Error(`${bezeichnung} müssen als nicht negative ganze Zahl angegeben werden.`);
  }
  return minuten;
}

function parseLokalzeit(lokalzeit: string): number {
  const treffer = /^(\d{2}):(\d{2})$/.exec(lokalzeit);
  if (!treffer) throw new Error(`Die Lokalzeit ${lokalzeit} ist ungültig.`);
  const stunden = Number(treffer[1]);
  const minuten = Number(treffer[2]);
  if (stunden > 23 || minuten > 59) {
    throw new Error(`Die Lokalzeit ${lokalzeit} ist ungültig.`);
  }
  return stunden * 60 + minuten;
}

function formatLokalzeit(minutenSeitTagesbeginn: number): string {
  const minutenImTag = minutenSeitTagesbeginn % MINUTEN_PRO_TAG;
  const stunden = Math.floor(minutenImTag / 60);
  const minuten = minutenImTag % 60;
  return `${String(stunden).padStart(2, '0')}:${String(minuten).padStart(2, '0')}`;
}
