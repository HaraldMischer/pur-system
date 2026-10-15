// pur-system/src/app/components/schichtplan/dienstplan-monatstabelle/dienstplan-monatstabelle.spec.ts

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Timestamp } from 'firebase/firestore';

import { DienstplanMonatstabelle, TSchichtplanRasterauswahl } from './dienstplan-monatstabelle';

describe('DienstplanMonatstabelle', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DienstplanMonatstabelle],
    }).compileComponents();
  });

  it('should render the month as a day and model-shift grid', () => {
    const fixture = createFixture();
    fixture.componentRef.setInput('schichten', [
      createSchicht('s-1', 'm-1'),
      createSchicht('s-2', 'm-2'),
    ]);
    fixture.componentRef.setInput('mitarbeiter', [
      createMitarbeiter('m-1', 'Mia', '#123456'),
      createMitarbeiter('m-2', 'Max'),
    ]);
    fixture.componentRef.setInput('darfSchreiben', true);
    const auswahl: TSchichtplanRasterauswahl[] = [];
    fixture.componentInstance.schichtAnlegen.subscribe((wert) => {
      auswahl.push(wert);
    });
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const spaltenkoepfe = Array.from(compiled.querySelectorAll('thead th')).map((element) => {
      return element.textContent?.replace(/\s+/g, ' ').trim();
    });
    const anlegenButtons = compiled.querySelectorAll<HTMLButtonElement>('.anlegen');
    const dritteTageszeile = compiled.querySelectorAll('tbody tr')[2];

    expect(compiled.querySelectorAll('tbody tr')).toHaveLength(28);
    expect(spaltenkoepfe).toEqual(['Tag', 'Früh 07:00–12:00 Uhr', 'Spät 16:30–01:00 Uhr']);
    expect(anlegenButtons).toHaveLength(56);
    anlegenButtons[5].click();
    expect(auswahl).toEqual([{ datum: '2026-02-03', modellschichtId: 'spaet' }]);
    expect(compiled.querySelector('.pur-table.pur-table--schichtplan')).not.toBeNull();
    expect(compiled.querySelector('table.pur-table__table')).not.toBeNull();
    expect(dritteTageszeile.querySelectorAll('.schicht')).toHaveLength(2);
    expect(dritteTageszeile.textContent).toContain('Muster, Mia');
    expect(dritteTageszeile.textContent).toContain('Muster, Max');
    expect(
      dritteTageszeile.querySelector<HTMLElement>('.mitarbeiter-farbe')?.style.backgroundColor,
    ).toBe('rgb(18, 52, 86)');
    expect(dritteTageszeile.textContent).toContain('16:30–01:00');
    expect(dritteTageszeile.textContent).toContain('Lohnzeit: 8 Std. 30 Min.');
    expect(compiled.textContent).toContain('Version 1');
    expect(compiled.textContent).toContain('Entwurf');
    expect(compiled.textContent).toContain('2. Revision');
  });

  it('should keep a published plan readonly', () => {
    const fixture = createFixture(true);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Veröffentlicht');
    expect(fixture.nativeElement.querySelector('.anlegen')).toBeNull();
    expect(fixture.nativeElement.querySelector('.schicht button')).toBeNull();
  });

  it('should render and emit deleting in the plan status row', () => {
    const fixture = createFixture();
    fixture.componentRef.setInput('dienstplanLoeschenAnzeigen', true);
    fixture.componentRef.setInput('dienstplanLoeschenHinweis', 'Leeren Dienstplan löschen.');
    const loeschen = vi.fn();
    fixture.componentInstance.dienstplanLoeschen.subscribe(loeschen);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const header = compiled.querySelector('.monatskopf');
    const button = header?.querySelector<HTMLButtonElement>('.kopf-aktion');
    expect(button?.disabled).toBe(false);
    expect(button?.title).toBe('Leeren Dienstplan löschen.');
    button?.click();
    expect(loeschen).toHaveBeenCalledOnce();
  });

  it('should disable deleting in the plan status row when requested', () => {
    const fixture = createFixture();
    fixture.componentRef.setInput('dienstplanLoeschenAnzeigen', true);
    fixture.componentRef.setInput('dienstplanLoeschenDeaktiviert', true);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const button = compiled.querySelector<HTMLButtonElement>('.kopf-aktion');
    expect(button?.disabled).toBe(true);
  });

  it('should emit only valid employee drops into writable cells', () => {
    const fixture = createFixture();
    fixture.componentRef.setInput('erlaubteMitarbeiterIds', ['m-1']);
    const ablagen: unknown[] = [];
    fixture.componentInstance.schichtAblegen.subscribe((ablage) => {
      ablagen.push(ablage);
    });
    fixture.detectChanges();

    fixture.componentInstance.handleMitarbeiterDrop(
      createDropEvent('m-1', '2026-02-03', 'frueh', []),
    );
    fixture.componentInstance.handleMitarbeiterDrop(
      createDropEvent('m-fremd', '2026-02-03', 'frueh', []),
    );
    fixture.componentInstance.handleMitarbeiterDrop(
      createDropEvent('m-1', '2026-02-03', 'frueh', ['m-1']),
    );

    expect(ablagen).toEqual([
      { mitarbeiterId: 'm-1', datum: '2026-02-03', modellschichtId: 'frueh' },
    ]);

    fixture.componentRef.setInput('schreibvorgang', true);
    fixture.detectChanges();
    fixture.componentInstance.handleMitarbeiterDrop(
      createDropEvent('m-1', '2026-02-04', 'frueh', []),
    );
    expect(ablagen).toHaveLength(1);
  });

  it('should block occupied single cells and keep multiple cells assignable', () => {
    const fixture = createFixture();
    fixture.componentRef.setInput('erlaubteMitarbeiterIds', ['m-2']);
    fixture.componentRef.setInput('schichten', [createSchicht('s-1', 'm-1')]);
    const ablagen: unknown[] = [];
    fixture.componentInstance.schichtAblegen.subscribe((ablage) => {
      ablagen.push(ablage);
    });
    fixture.detectChanges();

    fixture.componentInstance.handleMitarbeiterDrop(
      createDropEvent('m-2', '2026-02-03', 'frueh', ['m-1']),
    );
    fixture.componentInstance.handleMitarbeiterDrop(
      createDropEvent('m-2', '2026-02-03', 'spaet', ['m-1'], true),
    );

    expect(ablagen).toEqual([
      { mitarbeiterId: 'm-2', datum: '2026-02-03', modellschichtId: 'spaet' },
    ]);
    const compiled = fixture.nativeElement as HTMLElement;
    const belegteSpaetschicht = compiled.querySelector<HTMLButtonElement>(
      '[aria-label="Spät am Di., 03.02. anlegen"]',
    );
    expect(belegteSpaetschicht?.disabled).toBe(false);
  });

  it('should show a fallback when a referenced employee is unavailable', () => {
    const fixture = createFixture();
    fixture.componentRef.setInput('schichten', [createSchicht('s-1', 'm-fehlt')]);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Mitarbeiter nicht verfügbar');
  });

  function createFixture(veroeffentlicht = false): ComponentFixture<DienstplanMonatstabelle> {
    const fixture = TestBed.createComponent(DienstplanMonatstabelle);
    fixture.componentRef.setInput('dienstplan', {
      id: '2026-02',
      unternehmerId: 'u-1',
      firmaId: 'f-1',
      filialeId: 'b-1',
      zeitraumStart: '2026-02-01',
      zeitraumEnde: '2026-02-28',
      zeitzone: 'Europe/Berlin',
      schichtmodellId: 'modell-1',
      schichtmodellBezeichnung: 'Sommer',
      ...(veroeffentlicht ? { veroeffentlichteVersionId: 'v-1' } : { entwurfVersionId: 'v-1' }),
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
        status: veroeffentlicht ? 'veroeffentlicht' : 'entwurf',
        erstelltVonUid: 'uid-1',
        aktualisiertVonUid: 'uid-1',
      },
    ]);
    fixture.componentRef.setInput('modellschichten', [
      {
        id: 'spaet',
        dienstplanId: '2026-02',
        unternehmerId: 'u-1',
        firmaId: 'f-1',
        filialeId: 'b-1',
        bezeichnung: 'Spät',
        beginnLokalzeit: '16:30',
        endeLokalzeit: '01:00',
        endetAmFolgetag: true,
        standardpauseMinuten: 30,
        mehrfachbelegungErlaubt: true,
      },
      {
        id: 'frueh',
        dienstplanId: '2026-02',
        unternehmerId: 'u-1',
        firmaId: 'f-1',
        filialeId: 'b-1',
        bezeichnung: 'Früh',
        beginnLokalzeit: '07:00',
        endeLokalzeit: '12:00',
        endetAmFolgetag: false,
        standardpauseMinuten: 0,
        mehrfachbelegungErlaubt: false,
      },
    ]);
    fixture.componentRef.setInput('schichten', []);
    fixture.componentRef.setInput('mitarbeiter', []);
    fixture.componentRef.setInput('darfSchreiben', !veroeffentlicht);
    return fixture;
  }

  function createSchicht(id: string, mitarbeiterId: string) {
    return {
      id,
      dienstplanId: '2026-02',
      versionId: 'v-1',
      unternehmerId: 'u-1',
      firmaId: 'f-1',
      filialeId: 'b-1',
      mitarbeiterId,
      modellschichtId: 'spaet',
      beginn: Timestamp.fromDate(new Date('2026-02-03T16:30:00+01:00')),
      ende: Timestamp.fromDate(new Date('2026-02-04T01:00:00+01:00')),
      pauseMinuten: 30,
      erstelltVonUid: 'uid-1',
      aktualisiertVonUid: 'uid-1',
    };
  }

  function createMitarbeiter(id: string, vorname: string, farbkennung?: string) {
    return {
      id,
      unternehmerId: 'u-1',
      firmaId: 'f-1',
      person: {
        vorname,
        nachname: 'Muster',
        adresse: { strasse: '', hausnummer: '', postleitzahl: '', ort: '' },
        kontakt: {},
      },
      rollen: ['servicekraft'],
      filialIds: ['b-1'],
      aktiv: true,
      ...(farbkennung ? { farbkennung } : {}),
    };
  }

  function createDropEvent(
    mitarbeiterId: string,
    datum: string,
    modellschichtId: string,
    mitarbeiterIds: string[],
    mehrfachbelegungErlaubt = false,
  ): Parameters<DienstplanMonatstabelle['handleMitarbeiterDrop']>[0] {
    return {
      item: { data: mitarbeiterId },
      container: {
        data: { datum, modellschichtId, mitarbeiterIds, mehrfachbelegungErlaubt },
      },
    } as unknown as Parameters<DienstplanMonatstabelle['handleMitarbeiterDrop']>[0];
  }
});
