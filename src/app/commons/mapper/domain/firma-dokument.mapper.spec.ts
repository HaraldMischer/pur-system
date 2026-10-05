// pur-system/src/app/commons/mapper/domain/firma-dokument.mapper.spec.ts

import { mapFirmaEintrag } from './firma-dokument.mapper';

describe('Firma-Dokument-Mapper', () => {
  it('should normalize a company document with optional data', () => {
    expect(
      mapFirmaEintrag('f-1', {
        anzeigename: ' Firma ',
        firmenname: ' Firma GmbH ',
        nummer: 3,
        aktiv: true,
        adresse: { strasse: ' Weg ', hausnummer: '', postleitzahl: '12345', ort: ' Ort ' },
        kontakt: { email: ' info@example.com ', telefon: '' },
      }),
    ).toEqual({
      id: 'f-1',
      anzeigename: 'Firma',
      firmenname: 'Firma GmbH',
      nummer: 3,
      aktiv: true,
      adresse: { strasse: 'Weg', postleitzahl: '12345', ort: 'Ort' },
      kontakt: { email: 'info@example.com' },
    });
  });

  it('should omit an empty address and use document id fallbacks', () => {
    expect(mapFirmaEintrag('f-1', { adresse: null, kontakt: null })).toEqual({
      id: 'f-1',
      anzeigename: 'f-1',
      firmenname: 'f-1',
      nummer: 0,
      aktiv: false,
      kontakt: {},
    });
  });
});
