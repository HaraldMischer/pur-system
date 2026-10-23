// pur-system/src/app/commons/validators/schichtmodell.validator.ts

import { MAX_RANDMINUTEN } from '../constants/schichtmodell.constants';
import {
  IModellschichtSchreibdaten,
  IModellschichtZeitgrenze,
} from '../models/domain/schichtmodell';

const MINUTEN_PRO_TAG = 24 * 60;
const LOKALZEIT_PATTERN = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

/**
 * Prüft die vollständige Struktur geordneter Modellschichten.
 *
 * @param modellschichten - Zu prüfende Modellschichten in fachlicher Reihenfolge.
 * @throws Bei einer unvollständigen oder widersprüchlichen Modellstruktur.
 */
export function assertGueltigeModellschichten(
  modellschichten: readonly IModellschichtSchreibdaten[],
): void {
  if (modellschichten.length === 0) {
    throw new Error('Ein Schichtmodell benötigt mindestens eine Modellschicht.');
  }

  const geordnet = modellschichten.slice().sort((a, b) => a.reihenfolge - b.reihenfolge);
  const ids = new Set<string>();
  const letzterIndex = geordnet.length - 1;
  geordnet.forEach((modellschicht, index) => {
    if (!Number.isInteger(modellschicht.reihenfolge) || modellschicht.reihenfolge !== index) {
      throw new Error('Die Reihenfolge der Modellschichten ist nicht eindeutig oder lückenlos.');
    }
    if (modellschicht.id) {
      if (ids.has(modellschicht.id)) {
        throw new Error('Die Modellschicht-IDs müssen innerhalb eines Modells eindeutig sein.');
      }
      ids.add(modellschicht.id);
    }
    if (!modellschicht.bezeichnung.trim()) {
      throw new Error('Die Modellschicht enthält keine gültige Bezeichnung.');
    }
    if (typeof modellschicht.mehrfachbelegungErlaubt !== 'boolean') {
      throw new Error('Die Mehrfachbelegung der Modellschicht ist ungültig.');
    }

    const istErste = index === 0;
    const istLetzte = index === letzterIndex;
    if (istErste === Boolean(modellschicht.beginn)) {
      throw new Error(
        istErste
          ? 'Die erste Modellschicht darf keinen festen Beginn enthalten.'
          : 'Die Modellschicht benötigt einen festen Beginn.',
      );
    }
    if (istLetzte === Boolean(modellschicht.ende)) {
      throw new Error(
        istLetzte
          ? 'Die letzte Modellschicht darf kein festes Ende enthalten.'
          : 'Die Modellschicht benötigt ein festes Ende.',
      );
    }
    if (modellschicht.beginn) assertZeitgrenze(modellschicht.beginn);
    if (modellschicht.ende) assertZeitgrenze(modellschicht.ende);
    if (
      modellschicht.beginn &&
      modellschicht.ende &&
      getZeitgrenzeMinuten(modellschicht.ende) <= getZeitgrenzeMinuten(modellschicht.beginn)
    ) {
      throw new Error('Die Modellschicht benötigt eine positive Dauer.');
    }

    const vorbereitungsminuten = assertRandminuten(
      modellschicht.vorbereitungsminuten,
      'Vorbereitungsminuten',
    );
    const nachbereitungsminuten = assertRandminuten(
      modellschicht.nachbereitungsminuten,
      'Nachbereitungsminuten',
    );
    if ((!istErste && vorbereitungsminuten !== 0) || (!istLetzte && nachbereitungsminuten !== 0)) {
      throw new Error(
        'Vorbereitungsminuten sind nur an der ersten und Nachbereitungsminuten nur an der letzten Modellschicht erlaubt.',
      );
    }
  });
}

/**
 * Ermittelt, ob zwischen zwei aufeinanderfolgenden Modellschichten eine zeitliche Lücke besteht.
 *
 * @param modellschichten - Gültige Modellschichten in beliebiger Eingabereihenfolge.
 * @returns true, wenn mindestens eine innere Schichtgrenze eine Lücke bildet.
 */
export function hatModellschichtLuecken(
  modellschichten: readonly IModellschichtSchreibdaten[],
): boolean {
  const geordnet = modellschichten.slice().sort((a, b) => a.reihenfolge - b.reihenfolge);
  return geordnet.slice(0, -1).some((modellschicht, index) => {
    const naechsteModellschicht = geordnet[index + 1];
    if (!modellschicht.ende || !naechsteModellschicht.beginn) return false;
    return (
      getZeitgrenzeMinuten(modellschicht.ende) < getZeitgrenzeMinuten(naechsteModellschicht.beginn)
    );
  });
}

function assertZeitgrenze(zeitgrenze: IModellschichtZeitgrenze): void {
  if (
    !LOKALZEIT_PATTERN.test(zeitgrenze.lokalzeit) ||
    (zeitgrenze.tag !== 'starttag' && zeitgrenze.tag !== 'folgetag')
  ) {
    throw new Error('Die Modellschicht enthält keine gültige Zeitgrenze.');
  }
}

function assertRandminuten(wert: number | undefined, bezeichnung: string): number {
  const minuten = wert ?? 0;
  if (!Number.isInteger(minuten) || minuten < 0 || minuten > MAX_RANDMINUTEN) {
    throw new Error(bezeichnung + ' müssen als ganze Zahl von 0 bis 999 angegeben werden.');
  }
  return minuten;
}

function getZeitgrenzeMinuten(zeitgrenze: IModellschichtZeitgrenze): number {
  const [stunden, minuten] = zeitgrenze.lokalzeit.split(':').map(Number);
  return stunden * 60 + minuten + (zeitgrenze.tag === 'folgetag' ? MINUTEN_PRO_TAG : 0);
}
