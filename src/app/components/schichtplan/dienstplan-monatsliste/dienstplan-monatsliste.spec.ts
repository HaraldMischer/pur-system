// pur-system/src/app/components/schichtplan/dienstplan-monatsliste/dienstplan-monatsliste.spec.ts

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Timestamp } from 'firebase/firestore';

import { DienstplanMonatsliste } from './dienstplan-monatsliste';

describe('DienstplanMonatsliste', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DienstplanMonatsliste],
    }).compileComponents();
  });

  it('should show weekday, formatted date, calendar properties and the day-specific shifts', () => {
    const fixture = createFixture();
    fixture.detectChanges();

    const tag = fixture.componentInstance.tage()[0];
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';

    expect(tag.wochentagBezeichnung).toBe('Sonntag');
    expect(tag.datumBezeichnung).toBe('01.11.2026');
    expect(tag.zellen.map((zelle) => zelle.tagesschicht.id)).toEqual(['tagesschicht-1']);
    expect(text).toContain('Sonntag');
    expect(text).toContain('01.11.2026');
    expect(text).toContain('10:00–01:00 Uhr');
    expect(text).toContain('Allerheiligen · Sonderöffnung');
  });

  it('should emit creating for the selected day shift', () => {
    const fixture = createFixture();
    const anlegen = vi.fn();
    fixture.componentInstance.tagesschichtAnlegen.subscribe(anlegen);
    fixture.detectChanges();

    (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('button')?.click();

    expect(anlegen).toHaveBeenCalledWith({
      datum: '2026-11-01',
      tagesschichtId: 'tagesschicht-1',
    });
  });

  function createFixture(): ComponentFixture<DienstplanMonatsliste> {
    const fixture = TestBed.createComponent(DienstplanMonatsliste);
    fixture.componentRef.setInput('dienstplan', {
      id: '2026-11',
      unternehmerId: 'u-1',
      firmaId: 'f-1',
      filialeId: 'b-1',
      zeitraumStart: '2026-11-01',
      zeitraumEnde: '2026-11-30',
      zeitzone: 'Europe/Berlin',
      planungsart: 'schichttagesmodell',
      kalendertage: [
        {
          datum: '2026-11-01',
          wochentag: 'sonntag',
          istSonntag: true,
          bezeichnung: 'Sonderöffnung',
          gesetzlicherFeiertag: {
            schluessel: 'allerheiligen',
            bezeichnung: 'Allerheiligen',
          },
          aktiveSondertage: [{ id: 'sonderoeffnung', bezeichnung: 'Sonderöffnung' }],
          oeffnungsregelQuelle: 'sondertag',
          oeffnungsregel: {
            geoeffnet: true,
            beginnLokalzeit: '10:00',
            endeLokalzeit: '01:00',
            endetAmFolgetag: true,
          },
          rasterzeiten: [],
        },
      ],
      schichtmodellId: 'modell-1',
      schichtmodellBezeichnung: 'Tagesmodell',
      entwurfVersionId: 'v-1',
      naechsteVersionsnummer: 2,
      erstelltVonUid: 'uid-1',
      aktualisiertVonUid: 'uid-1',
    });
    fixture.componentRef.setInput('aktiveVersion', {
      id: 'v-1',
      dienstplanId: '2026-11',
      unternehmerId: 'u-1',
      firmaId: 'f-1',
      filialeId: 'b-1',
      nummer: 1,
      revision: 0,
      status: 'entwurf',
      erstelltVonUid: 'uid-1',
      aktualisiertVonUid: 'uid-1',
    });
    fixture.componentRef.setInput('schichten', []);
    fixture.componentRef.setInput('tagesschichten', [
      {
        id: 'tagesschicht-1',
        dienstplanId: '2026-11',
        unternehmerId: 'u-1',
        firmaId: 'f-1',
        filialeId: 'b-1',
        datum: '2026-11-01',
        herkunft: 'sonntag',
        vorlagenschichtId: 'vorlage-1',
        bezeichnung: '1. Schicht',
        reihenfolge: 1,
        kernbeginnLokalzeit: '10:00',
        kernendeLokalzeit: '01:00',
        kernbeginnAmFolgetag: false,
        kernendeAmFolgetag: true,
        beginn: Timestamp.fromDate(new Date('2026-11-01T10:00:00+01:00')),
        ende: Timestamp.fromDate(new Date('2026-11-02T01:00:00+01:00')),
        mehrfachbelegungErlaubt: false,
        vorbereitungsminuten: 0,
        nachbereitungsminuten: 0,
      },
    ]);
    fixture.componentRef.setInput('darfSchreiben', true);
    return fixture;
  }
});
