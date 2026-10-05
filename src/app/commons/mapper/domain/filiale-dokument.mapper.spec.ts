// pur-system/src/app/commons/mapper/domain/filiale-dokument.mapper.spec.ts

import { mapFilialeEintrag } from './filiale-dokument.mapper';

describe('Filiale-Dokument-Mapper', () => {
  it('should normalize a branch document with optional data', () => {
    expect(
      mapFilialeEintrag('b-1', {
        anzeigename: ' Filiale ',
        filialname: ' Spielhalle ',
        nummer: 4,
        aktiv: true,
        adresse: { strasse: ' Weg ', hausnummer: '1', postleitzahl: '', ort: ' Ort ' },
        kontakt: { mobil: ' 0170 123456 ', webseite: '' },
      }),
    ).toEqual({
      id: 'b-1',
      anzeigename: 'Filiale',
      filialname: 'Spielhalle',
      nummer: 4,
      aktiv: true,
      adresse: { strasse: 'Weg', hausnummer: '1', ort: 'Ort' },
      kontakt: { mobil: '0170 123456' },
    });
  });

  it('should omit an empty address and use document id fallbacks', () => {
    expect(mapFilialeEintrag('b-1', { adresse: [], kontakt: [] })).toEqual({
      id: 'b-1',
      anzeigename: 'b-1',
      filialname: 'b-1',
      nummer: 0,
      aktiv: false,
      kontakt: {},
    });
  });
});
