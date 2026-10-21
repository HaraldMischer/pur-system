// pur-system/src/app/components/schichtplan/dienstplan-monatstabelle/dienstplan-monatstabelle.spec.ts

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Timestamp } from 'firebase/firestore';

import { IDienstplanKalendertag } from '../../../commons/models/domain/dienstplan-kalendertag';
import { DienstplanMonatstabelle } from './dienstplan-monatstabelle';

describe('DienstplanMonatstabelle', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DienstplanMonatstabelle],
    }).compileComponents();
  });

  it('should derive the month as days with model-shift cells', () => {
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
    fixture.detectChanges();

    const component = fixture.componentInstance;
    const tage = component.tage();

    expect(tage).toHaveLength(28);
    expect(tage[2].datum).toBe('2026-02-03');
    expect(tage[2].zellen).toHaveLength(2);
    expect(tage[2].zellen[1].schichten.map((schicht) => schicht.id)).toEqual(['s-1', 's-2']);
    expect(component.getMitarbeiterAnzeigename('m-1')).toBe('Muster, Mia');
    expect(component.getMitarbeiterAnzeigename('m-2')).toBe('Muster, Max');
    expect(component.getMitarbeiterFarbkennung('m-1')).toBe('#123456');
    expect(component.formatSchichtzeit(tage[2].zellen[1].schichten[0])).toBe('16:30–01:00');
    expect(component.formatLohnzeit(tage[2].zellen[1].schichten[0])).toBe('8 Std. 30 Min.');
    expect(component.statusBezeichnung()).toBe('Entwurf');
    expect(fixture.nativeElement.textContent).toContain('18:00–23:00 Uhr');
  });

  it('should keep a published plan readonly', () => {
    const fixture = createFixture(true);
    fixture.detectChanges();

    expect(fixture.componentInstance.statusBezeichnung()).toBe('Veröffentlicht');
    expect(fixture.componentInstance.kannSchichtenAblegen()).toBe(false);
  });

  it('should render and emit deleting in the plan status row', () => {
    const fixture = createFixture();
    fixture.componentRef.setInput('dienstplanLoeschenAnzeigen', true);
    fixture.componentRef.setInput('dienstplanLoeschenHinweis', 'Leeren Dienstplan löschen.');
    const loeschen = vi.fn();
    fixture.componentInstance.dienstplanLoeschen.subscribe(loeschen);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const button = [...compiled.querySelectorAll<HTMLButtonElement>('button')].find((element) => {
      return element.textContent?.includes('Dienstplan löschen');
    });
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
    const button = [...compiled.querySelectorAll<HTMLButtonElement>('button')].find((element) => {
      return element.textContent?.includes('Dienstplan löschen');
    });
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
      kalendertage: createKalendertage(),
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
      datum: '2026-02-03',
      mitarbeiterId,
      modellschichtId: 'spaet',
      beginn: Timestamp.fromDate(new Date('2026-02-03T16:30:00+01:00')),
      ende: Timestamp.fromDate(new Date('2026-02-04T01:00:00+01:00')),
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

  function createKalendertage(): IDienstplanKalendertag[] {
    return Array.from({ length: 28 }, (_, index) => {
      const datum = `2026-02-${String(index + 1).padStart(2, '0')}`;
      return {
        datum,
        wochentag: 'montag',
        istSonntag: false,
        aktiveSondertage: [],
        oeffnungsregelQuelle: 'wochentag',
        oeffnungsregel: {
          geoeffnet: true,
          beginnLokalzeit: '08:00',
          endeLokalzeit: '18:00',
          endetAmFolgetag: false,
        },
        rasterzeiten: [
          {
            modellschichtId: 'frueh',
            beginnLokalzeit: '07:00',
            endeLokalzeit: '12:00',
            endetAmFolgetag: false,
          },
          {
            modellschichtId: 'spaet',
            beginnLokalzeit: datum === '2026-02-03' ? '18:00' : '16:30',
            endeLokalzeit: datum === '2026-02-03' ? '23:00' : '01:00',
            endetAmFolgetag: datum !== '2026-02-03',
          },
        ],
      };
    });
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
