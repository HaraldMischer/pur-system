// pur-system/src/app/commons/utils/dienstplan/schichtmodell-vorlagen.spec.ts

import type {
  IFilialeinstellungOeffnungszeitenDokument,
  IFilialeinstellungSondertagEintrag,
  IGeoeffneteOeffnungsregel,
} from '../../models/domain/filialeinstellung';
import { createSchichtmodellVorlagen } from './schichtmodell-vorlagen';

describe('Schichtmodell-Vorlagen', () => {
  const standardoeffnung = createOeffnung('08:00', '01:00', true);
  const oeffnungszeiten: IFilialeinstellungOeffnungszeitenDokument = {
    standardoeffnungsregel: standardoeffnung,
    wochenregeln: {
      montag: { modus: 'abweichend', oeffnungsregel: createOeffnung('14:00', '01:00', true) },
      dienstag: { modus: 'standard' },
      mittwoch: { modus: 'standard' },
      donnerstag: { modus: 'standard' },
      freitag: { modus: 'standard' },
      samstag: { modus: 'geschlossen' },
      sonntag: {
        modus: 'abweichend',
        oeffnungsregel: createOeffnung('10:00', '01:00', true),
      },
    },
    erstelltVonUid: 'uid-1',
    aktualisiertVonUid: 'uid-1',
  };

  it('ermittelt Basisvorlagen und alle geöffneten abweichenden Regeln', () => {
    const vorlagen = createSchichtmodellVorlagen(oeffnungszeiten, [
      createSondertag('allerheiligen', 'Allerheiligen', 'abweichend', true, 'system'),
      createSondertag('sonderoeffnung', 'Sonderöffnung', 'abweichend', true),
      createSondertag('inaktiv', 'Inaktiv', 'abweichend', true, 'benutzer', false),
      createSondertag('geschlossen', 'Geschlossen', 'geschlossen', false),
      createSondertag('wie-sonntag', 'Wie Sonntag', 'wieSonntag', true),
      createSondertag('standard', 'Standard', 'standard', true),
    ]);

    expect(vorlagen.map((vorlage) => vorlage.vorlage)).toEqual([
      'wochentag',
      'sonntag',
      'wochentag:montag',
      'sondertag:allerheiligen',
      'sondertag:sonderoeffnung',
    ]);
    expect(vorlagen.map((vorlage) => vorlage.bezeichnung)).toEqual([
      'Wochentagsvorlage',
      'Sonntagsvorlage',
      'Montag',
      'Allerheiligen',
      'Sonderöffnung',
    ]);
  });
});

function createOeffnung(
  beginnLokalzeit: string,
  endeLokalzeit: string,
  endetAmFolgetag: boolean,
): IGeoeffneteOeffnungsregel {
  return { geoeffnet: true, beginnLokalzeit, endeLokalzeit, endetAmFolgetag };
}

function createSondertag(
  id: string,
  bezeichnung: string,
  modus: 'abweichend' | 'geschlossen' | 'standard' | 'wieSonntag',
  geoeffnet: boolean,
  herkunft: 'system' | 'benutzer' = 'benutzer',
  aktiv = true,
): IFilialeinstellungSondertagEintrag {
  return {
    id,
    unternehmerId: 'u-1',
    firmaId: 'f-1',
    filialeId: 'b-1',
    bezeichnung,
    aktiv,
    modus,
    herkunft,
    datumsregel: { typ: 'jaehrlichFestesDatum', monat: 11, tag: 1 },
    oeffnungsregel: geoeffnet ? createOeffnung('18:00', '01:00', true) : { geoeffnet: false },
    erstelltVonUid: 'uid-1',
    aktualisiertVonUid: 'uid-1',
  };
}
