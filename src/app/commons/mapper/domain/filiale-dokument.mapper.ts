// pur-system/src/app/commons/mapper/domain/filiale-dokument.mapper.ts

import { IFilialeEintrag } from '../../models/domain/filiale';
import {
  asRecord,
  getOptionalString,
  getString,
} from '../../utils/firestore/firestore-dokumentwerte';

/**
 * Bildet unveränderte Firestore-Daten als fachlichen Filialeintrag ab.
 *
 * @param id - Dokument-ID der Filiale.
 * @param daten - Unveränderte Firestore-Daten der Filiale.
 * @returns Der normalisierte fachliche Filialeintrag.
 */
export function mapFilialeEintrag(id: string, daten: Record<string, unknown>): IFilialeEintrag {
  const nummer = daten['nummer'];
  const adresse = asRecord(daten['adresse']);
  const strasse = getOptionalString(adresse['strasse']);
  const hausnummer = getOptionalString(adresse['hausnummer']);
  const postleitzahl = getOptionalString(adresse['postleitzahl']);
  const ort = getOptionalString(adresse['ort']);
  const kontakt = asRecord(daten['kontakt']);
  const email = getOptionalString(kontakt['email']);
  const telefon = getOptionalString(kontakt['telefon']);
  const mobil = getOptionalString(kontakt['mobil']);
  const webseite = getOptionalString(kontakt['webseite']);

  return {
    id,
    anzeigename: getString(daten['anzeigename'], id),
    filialname: getString(daten['filialname'], id),
    nummer: Number.isInteger(nummer) && Number(nummer) > 0 ? Number(nummer) : 0,
    aktiv: daten['aktiv'] === true,
    ...(strasse || hausnummer || postleitzahl || ort
      ? {
          adresse: {
            ...(strasse ? { strasse } : {}),
            ...(hausnummer ? { hausnummer } : {}),
            ...(postleitzahl ? { postleitzahl } : {}),
            ...(ort ? { ort } : {}),
          },
        }
      : {}),
    kontakt: {
      ...(email ? { email } : {}),
      ...(telefon ? { telefon } : {}),
      ...(mobil ? { mobil } : {}),
      ...(webseite ? { webseite } : {}),
    },
  };
}
