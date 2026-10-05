// pur-system/src/app/commons/mapper/domain/firma-dokument.mapper.ts

import { IFirmaEintrag } from '../../models/domain/firma';
import {
  asRecord,
  getOptionalString,
  getString,
} from '../../utils/firestore/firestore-dokumentwerte';

/**
 * Bildet unveränderte Firestore-Daten als fachlichen Firmeneintrag ab.
 *
 * @param id - Dokument-ID der Firma.
 * @param daten - Unveränderte Firestore-Daten der Firma.
 * @returns Der normalisierte fachliche Firmeneintrag.
 */
export function mapFirmaEintrag(id: string, daten: Record<string, unknown>): IFirmaEintrag {
  const nummer = daten['nummer'];
  const adresse = asRecord(daten['adresse']);
  const kontakt = asRecord(daten['kontakt']);
  const email = getOptionalString(kontakt['email']);
  const telefon = getOptionalString(kontakt['telefon']);
  const mobil = getOptionalString(kontakt['mobil']);
  const webseite = getOptionalString(kontakt['webseite']);
  const strasse = getOptionalString(adresse['strasse']);
  const hausnummer = getOptionalString(adresse['hausnummer']);
  const postleitzahl = getOptionalString(adresse['postleitzahl']);
  const ort = getOptionalString(adresse['ort']);
  const hatAdresse = Boolean(strasse || hausnummer || postleitzahl || ort);

  return {
    id,
    anzeigename: getString(daten['anzeigename'], id),
    firmenname: getString(daten['firmenname'], id),
    nummer: Number.isInteger(nummer) && Number(nummer) > 0 ? Number(nummer) : 0,
    aktiv: daten['aktiv'] === true,
    ...(hatAdresse
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
