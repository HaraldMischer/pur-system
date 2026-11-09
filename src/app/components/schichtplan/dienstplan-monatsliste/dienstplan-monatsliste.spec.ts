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

    expect(tag.wochentagBezeichnung).toBe('So.');
    expect(tag.datumBezeichnung).toBe('01.11.26');
    expect(tag.zellen.map((zelle) => zelle.tagesschicht.id)).toEqual(['tagesschicht-1']);
    expect(text).toContain('So. 01.11.26');
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

  it('should show only the configured preparation or follow-up time', () => {
    const ersteSchicht = createFixture(15, 0);
    ersteSchicht.detectChanges();
    const ersteSchichtText = (ersteSchicht.nativeElement as HTMLElement).textContent ?? '';

    expect(ersteSchichtText).toContain('+15 Min. Vorbereitung');
    expect(ersteSchichtText).not.toContain('Nachbereitung');

    const letzteSchicht = createFixture(0, 30);
    letzteSchicht.detectChanges();
    const letzteSchichtText = (letzteSchicht.nativeElement as HTMLElement).textContent ?? '';

    expect(letzteSchichtText).not.toContain('Vorbereitung');
    expect(letzteSchichtText).toContain('+30 Min. Nachbereitung');
  });

  it('should reject an additional employee for a single-occupancy day shift', () => {
    const fixture = createFixture();
    const ablehnung = vi.fn();
    const anlegen = vi.fn();
    fixture.componentRef.setInput('erlaubteMitarbeiterIds', ['m-2']);
    fixture.componentRef.setInput('schichten', [createSchicht()]);
    fixture.componentInstance.mehrfachbelegungAbgelehnt.subscribe(ablehnung);
    fixture.componentInstance.tagesschichtAblegen.subscribe(anlegen);
    fixture.detectChanges();

    fixture.componentInstance.handleTagesschichtDrop({
      item: { data: { art: 'mitarbeiter', mitarbeiterId: 'm-2' } },
      container: { data: fixture.componentInstance.tage()[0].zellen[0] },
    } as unknown as Parameters<DienstplanMonatsliste['handleTagesschichtDrop']>[0]);

    expect(ablehnung).toHaveBeenCalledWith({ schichtBezeichnung: '1. Schicht' });
    expect(anlegen).not.toHaveBeenCalled();
  });

  it('should keep the add action clickable but not open it for an occupied single shift', () => {
    const fixture = createFixture();
    const anlegen = vi.fn();
    fixture.componentRef.setInput('schichten', [createSchicht()]);
    fixture.componentInstance.tagesschichtAnlegen.subscribe(anlegen);
    fixture.detectChanges();

    const button = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>(
      '.monatsliste__zeitbereich-header button',
    );
    expect(button?.disabled).toBe(false);
    button?.click();

    expect(anlegen).not.toHaveBeenCalled();
  });

  function createFixture(
    vorbereitungsminuten = 0,
    nachbereitungsminuten = 0,
  ): ComponentFixture<DienstplanMonatsliste> {
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
        vorbereitungsminuten,
        nachbereitungsminuten,
      },
    ]);
    fixture.componentRef.setInput('darfSchreiben', true);
    return fixture;
  }

  function createSchicht() {
    return {
      id: 'schicht-1',
      dienstplanId: '2026-11',
      versionId: 'v-1',
      unternehmerId: 'u-1',
      firmaId: 'f-1',
      filialeId: 'b-1',
      datum: '2026-11-01',
      mitarbeiterId: 'm-1',
      tagesschichtId: 'tagesschicht-1',
      beginn: Timestamp.fromDate(new Date('2026-11-01T10:00:00+01:00')),
      ende: Timestamp.fromDate(new Date('2026-11-02T01:00:00+01:00')),
      erstelltVonUid: 'uid-1',
      aktualisiertVonUid: 'uid-1',
    };
  }
});
