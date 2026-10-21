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
import type { IBesondereRasterzeit } from '../../models/domain/schichtmodell';
import { resolveOeffnungsregel } from '../filialeinstellung/oeffnungsregel-aufloesung';
import { createDienstplanZeitraum } from './dienstplan-zeitraum';

export interface IDienstplanKalendertageAnfrage {
  monat: string;
  wochenregeln: TWochenoeffnungszeiten;
  sondertage: readonly IFilialeinstellungSondertagEintrag[];
  ausnahmen: readonly IFilialeinstellungAusnahmeEintrag[];
  modellschichten?: readonly IDienstplanRasterModellschicht[];
  besondereRasterzeiten?: readonly IBesondereRasterzeit[];
}

export interface IDienstplanRasterModellschicht {
  id: string;
  beginnLokalzeit: string;
  endeLokalzeit: string;
  endetAmFolgetag: boolean;
  vorbereitungsminuten?: number;
  nachbereitungsminuten?: number;
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
  assertRasterzeitUeberschreibungen(anfrage);
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
      datum,
      aufgeloest.quelle === 'sondertag' ? aufgeloest.sondertagId : undefined,
      aufgeloest.oeffnungsregel,
      anfrage.modellschichten ?? [],
      anfrage.besondereRasterzeiten ?? [],
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

function assertRasterzeitUeberschreibungen(anfrage: IDienstplanKalendertageAnfrage): void {
  const modellschichtIds = new Set<string>();
  for (const modellschicht of anfrage.modellschichten ?? []) {
    if (!modellschicht.id || modellschichtIds.has(modellschicht.id)) {
      throw new Error('Die Modellschicht-IDs des Schichtrasters müssen eindeutig sein.');
    }
    modellschichtIds.add(modellschicht.id);
  }

  const besondereSchluessel = new Set<string>();
  for (const rasterzeit of anfrage.besondereRasterzeiten ?? []) {
    assertRasterzeit(rasterzeit, modellschichtIds);
    const schluessel = JSON.stringify([rasterzeit.sondertagId, rasterzeit.modellschichtId]);
    if (!rasterzeit.sondertagId || besondereSchluessel.has(schluessel)) {
      throw new Error('Die besondere Rasterzeit ist nicht eindeutig oder fachlich ungültig.');
    }
    besondereSchluessel.add(schluessel);
  }
}

function assertRasterzeit(
  rasterzeit: IDienstplanRasterzeit,
  modellschichtIds: ReadonlySet<string>,
): void {
  if (!modellschichtIds.has(rasterzeit.modellschichtId)) {
    throw new Error(
      `Die Rasterzeit verweist auf die unbekannte Modellschicht ${rasterzeit.modellschichtId}.`,
    );
  }
  const beginn = parseLokalzeit(rasterzeit.beginnLokalzeit);
  const ende = parseLokalzeit(rasterzeit.endeLokalzeit);
  if (beginn === ende || rasterzeit.endetAmFolgetag !== ende < beginn) {
    throw new Error('Die Rasterzeit enthält keine gültige Zeitfolge.');
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
    throw new Error('Die Rasterzeit wurde im Kalendertag nicht gefunden.');
  }
  return rasterzeit;
}

function createRasterzeiten(
  datum: string,
  sondertagId: string | undefined,
  oeffnungsregel: TOeffnungsregel,
  modellschichten: readonly IDienstplanRasterModellschicht[],
  besondereRasterzeiten: readonly IBesondereRasterzeit[],
): readonly IDienstplanRasterzeit[] {
  if (!oeffnungsregel.geoeffnet) return [];
  return modellschichten.map((modellschicht, index) => {
    const sondertagUeberschreibung = sondertagId
      ? besondereRasterzeiten.find((rasterzeit) => {
          return (
            rasterzeit.sondertagId === sondertagId &&
            rasterzeit.modellschichtId === modellschicht.id
          );
        })
      : undefined;
    const grundzeit = sondertagUeberschreibung ?? modellschicht;
    return createWirksameRasterzeit({
      datum,
      modellschicht,
      grundzeit,
      oeffnungsregel,
      istErste: index === 0,
      istLetzte: index === modellschichten.length - 1,
    });
  });
}

function createWirksameRasterzeit(anfrage: {
  datum: string;
  modellschicht: IDienstplanRasterModellschicht;
  grundzeit: Pick<IDienstplanRasterzeit, 'beginnLokalzeit' | 'endeLokalzeit' | 'endetAmFolgetag'>;
  oeffnungsregel: Extract<TOeffnungsregel, { geoeffnet: true }>;
  istErste: boolean;
  istLetzte: boolean;
}): IDienstplanRasterzeit {
  const grundbeginn = parseLokalzeit(anfrage.grundzeit.beginnLokalzeit);
  const grundende =
    parseLokalzeit(anfrage.grundzeit.endeLokalzeit) +
    (anfrage.grundzeit.endetAmFolgetag ? 24 * 60 : 0);
  const oeffnungsbeginn = parseLokalzeit(anfrage.oeffnungsregel.beginnLokalzeit);
  const oeffnungsende =
    parseLokalzeit(anfrage.oeffnungsregel.endeLokalzeit) +
    (anfrage.oeffnungsregel.endetAmFolgetag ? 24 * 60 : 0);
  const vorbereitungsminuten = getRandminuten(
    anfrage.modellschicht.vorbereitungsminuten,
    'Vorbereitungsminuten',
  );
  const nachbereitungsminuten = getRandminuten(
    anfrage.modellschicht.nachbereitungsminuten,
    'Nachbereitungsminuten',
  );
  const beginn = anfrage.istErste ? oeffnungsbeginn - vorbereitungsminuten : grundbeginn;
  const ende = anfrage.istLetzte ? oeffnungsende + nachbereitungsminuten : grundende;
  if (beginn < 0 || ende >= 2 * 24 * 60) {
    throw new Error(
      `Die Vor- oder Nachbereitungszeit der Modellschicht ${anfrage.modellschicht.id} kann am ${anfrage.datum} nicht abgebildet werden.`,
    );
  }
  if (ende <= beginn) {
    throw new Error(
      `Die Modellschicht ${anfrage.modellschicht.id} hat am ${anfrage.datum} nach der Anpassung an die Öffnungszeiten keine positive Dauer.`,
    );
  }
  return {
    modellschichtId: anfrage.modellschicht.id,
    beginnLokalzeit: formatLokalzeit(beginn),
    endeLokalzeit: formatLokalzeit(ende),
    endetAmFolgetag: ende >= 24 * 60,
  };
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
  const minutenImTag = minutenSeitTagesbeginn % (24 * 60);
  const stunden = Math.floor(minutenImTag / 60);
  const minuten = minutenImTag % 60;
  return `${String(stunden).padStart(2, '0')}:${String(minuten).padStart(2, '0')}`;
}
