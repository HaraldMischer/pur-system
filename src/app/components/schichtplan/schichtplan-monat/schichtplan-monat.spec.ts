// pur-system/src/app/components/schichtplan/schichtplan-monat/schichtplan-monat.spec.ts

import { TestBed } from '@angular/core/testing';
import { Timestamp } from 'firebase/firestore';

import { SchichtplanMonat } from './schichtplan-monat';

describe('SchichtplanMonat', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [SchichtplanMonat] }).compileComponents();
  });

  it('should render every calendar day and the shifts of the active draft', () => {
    const fixture = TestBed.createComponent(SchichtplanMonat);
    fixture.componentRef.setInput('dienstplan', {
      id: '2026-02',
      unternehmerId: 'u-1',
      firmaId: 'f-1',
      filialeId: 'b-1',
      zeitraumStart: '2026-02-01',
      zeitraumEnde: '2026-02-28',
      zeitzone: 'Europe/Berlin',
      entwurfVersionId: 'v-1',
      naechsteVersionsnummer: 2,
      erstelltVonUid: 'uid-1',
      aktualisiertVonUid: 'uid-1',
    });
    fixture.componentRef.setInput('versionen', [
      {
        id: 'v-1',
        dienstplanId: '2026-02',
        unternehmerId: 'u-1',
        firmaId: 'f-1',
        filialeId: 'b-1',
        nummer: 1,
        revision: 2,
        status: 'entwurf',
        erstelltVonUid: 'uid-1',
        aktualisiertVonUid: 'uid-1',
      },
    ]);
    fixture.componentRef.setInput('schichten', [
      {
        id: 's-1',
        dienstplanId: '2026-02',
        versionId: 'v-1',
        unternehmerId: 'u-1',
        firmaId: 'f-1',
        filialeId: 'b-1',
        mitarbeiterId: 'm-1',
        schichtvorlageId: 'sv-1',
        schichtvorlageBezeichnung: 'Spätschicht',
        beginn: Timestamp.fromDate(new Date('2026-02-03T22:00:00+01:00')),
        ende: Timestamp.fromDate(new Date('2026-02-04T06:30:00+01:00')),
        pauseMinuten: 30,
        erstelltVonUid: 'uid-1',
        aktualisiertVonUid: 'uid-1',
      },
    ]);
    fixture.componentRef.setInput('mitarbeiter', [
      {
        id: 'm-1',
        unternehmerId: 'u-1',
        firmaId: 'f-1',
        person: {
          vorname: 'Mia',
          nachname: 'Muster',
          adresse: { strasse: '', hausnummer: '', postleitzahl: '', ort: '' },
          kontakt: {},
        },
        rollen: ['servicekraft'],
        filialIds: [],
        aktiv: false,
        farbkennung: '#123456',
      },
    ]);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelectorAll('.schichtplan-monat__tag')).toHaveLength(28);
    expect(compiled.textContent).toContain('Muster, Mia');
    expect(
      compiled.querySelector<HTMLElement>('.schichtplan-monat__mitarbeiter-farbe')?.style
        .backgroundColor,
    ).toBe('rgb(18, 52, 86)');
    expect(compiled.textContent).toContain('Spätschicht');
    expect(compiled.textContent).toContain('22:00–06:30 (Folgetag)');
    expect(compiled.textContent).toContain('Arbeitszeit: 8 Std.');
    expect(compiled.textContent).toContain('Entwurf');
  });

  it('should use the loaded published version when the draft is not available', () => {
    const fixture = TestBed.createComponent(SchichtplanMonat);
    fixture.componentRef.setInput('dienstplan', {
      id: '2026-02',
      unternehmerId: 'u-1',
      firmaId: 'f-1',
      filialeId: 'b-1',
      zeitraumStart: '2026-02-01',
      zeitraumEnde: '2026-02-28',
      zeitzone: 'Europe/Berlin',
      entwurfVersionId: 'v-2',
      veroeffentlichteVersionId: 'v-1',
      naechsteVersionsnummer: 3,
      erstelltVonUid: 'uid-1',
      aktualisiertVonUid: 'uid-1',
    });
    fixture.componentRef.setInput('versionen', [
      {
        id: 'v-1',
        dienstplanId: '2026-02',
        unternehmerId: 'u-1',
        firmaId: 'f-1',
        filialeId: 'b-1',
        nummer: 1,
        revision: 3,
        status: 'veroeffentlicht',
        erstelltVonUid: 'uid-1',
        aktualisiertVonUid: 'uid-1',
      },
    ]);
    fixture.componentRef.setInput('schichten', []);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Veröffentlicht');
  });

  it('should show a fallback when a referenced employee is unavailable', () => {
    const fixture = TestBed.createComponent(SchichtplanMonat);
    fixture.componentRef.setInput('dienstplan', {
      id: '2026-02',
      unternehmerId: 'u-1',
      firmaId: 'f-1',
      filialeId: 'b-1',
      zeitraumStart: '2026-02-01',
      zeitraumEnde: '2026-02-28',
      zeitzone: 'Europe/Berlin',
      entwurfVersionId: 'v-1',
      naechsteVersionsnummer: 2,
      erstelltVonUid: 'uid-1',
      aktualisiertVonUid: 'uid-1',
    });
    fixture.componentRef.setInput('versionen', [
      {
        id: 'v-1',
        dienstplanId: '2026-02',
        unternehmerId: 'u-1',
        firmaId: 'f-1',
        filialeId: 'b-1',
        nummer: 1,
        revision: 2,
        status: 'entwurf',
        erstelltVonUid: 'uid-1',
        aktualisiertVonUid: 'uid-1',
      },
    ]);
    fixture.componentRef.setInput('schichten', [
      {
        id: 's-1',
        dienstplanId: '2026-02',
        versionId: 'v-1',
        unternehmerId: 'u-1',
        firmaId: 'f-1',
        filialeId: 'b-1',
        mitarbeiterId: 'm-fehlt',
        schichtvorlageId: 'sv-1',
        schichtvorlageBezeichnung: 'Spätschicht',
        beginn: Timestamp.fromDate(new Date('2026-02-03T22:00:00+01:00')),
        ende: Timestamp.fromDate(new Date('2026-02-04T06:30:00+01:00')),
        pauseMinuten: 30,
        erstelltVonUid: 'uid-1',
        aktualisiertVonUid: 'uid-1',
      },
    ]);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Mitarbeiter nicht verfügbar');
  });
});
