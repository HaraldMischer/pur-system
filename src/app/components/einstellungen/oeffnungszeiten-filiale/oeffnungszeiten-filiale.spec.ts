// pur-system/src/app/components/einstellungen/oeffnungszeiten-filiale/oeffnungszeiten-filiale.spec.ts

import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';

import { IFilialeEintrag } from '../../../commons/models/domain/filiale';
import {
  FilialeinstellungStore,
  TFilialeinstellungKontext,
} from '../../../stores/domain/filialeinstellung.store';
import { DatumsausnahmeBearbeitenDialog } from '../datumsausnahme-bearbeiten-dialog/datumsausnahme-bearbeiten-dialog';
import { SondertagBearbeitenDialog } from '../sondertag-bearbeiten-dialog/sondertag-bearbeiten-dialog';
import { OeffnungszeitenFiliale } from './oeffnungszeiten-filiale';

const PFAD = { unternehmerId: 'u-1', firmaId: 'f-1', filialeId: 'b-1' } as const;
const FILIALE: IFilialeEintrag = {
  id: 'b-1',
  nummer: 1,
  aktiv: true,
  anzeigename: 'Bochum 1',
  filialname: 'Bochum 1',
  kontakt: {},
};

describe('OeffnungszeitenFiliale', () => {
  const kontext = signal<TFilialeinstellungKontext>({
    ...PFAD,
    rohdaten: null,
    bestand: null,
    download: false,
    isLoaded: true,
    inProgress: false,
    error: null,
  });
  const loadFilialeinstellung = vi.fn().mockResolvedValue(undefined);
  const initializeFilialeinstellung = vi.fn().mockResolvedValue(undefined);
  const open = vi.fn();

  beforeEach(async () => {
    vi.clearAllMocks();
    kontext.set({
      ...PFAD,
      rohdaten: null,
      bestand: null,
      download: false,
      isLoaded: true,
      inProgress: false,
      error: null,
    });
    await TestBed.configureTestingModule({
      imports: [OeffnungszeitenFiliale],
      providers: [
        {
          provide: FilialeinstellungStore,
          useValue: {
            getFilialeinstellungKontext: vi.fn(() => kontext()),
            loadFilialeinstellung,
            initializeFilialeinstellung,
            saveGrundlagen: vi.fn(),
          },
        },
        { provide: MatDialog, useValue: { open } },
      ],
    }).compileComponents();
  });

  it('should render all seven weekdays', async () => {
    const fixture = TestBed.createComponent(OeffnungszeitenFiliale);
    fixture.componentRef.setInput('filiale', FILIALE);
    fixture.componentRef.setInput('pfad', PFAD);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelectorAll('.wochentage div.pur-list__row')).toHaveLength(7);
    expect(fixture.nativeElement.querySelector('.pur-page-section')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('mat-card')).toBeNull();
    expect(fixture.nativeElement.querySelector('h2')?.textContent).toContain('Bochum 1');
    expect(fixture.nativeElement.querySelector('h3')?.textContent).toContain('Wochentage');
    expect(
      fixture.nativeElement.querySelectorAll('p.wochentag.pur-text.pur-text--label'),
    ).toHaveLength(7);
    expect(fixture.nativeElement.querySelector('mat-select')).toBeNull();
    expect(fixture.componentInstance.form.contains('bundesland')).toBe(false);
    expect(fixture.componentInstance.form.contains('zeitzone')).toBe(false);
  });

  it('should derive an overnight rule while initializing the branch', async () => {
    const fixture = TestBed.createComponent(OeffnungszeitenFiliale);
    fixture.componentRef.setInput('filiale', FILIALE);
    fixture.componentRef.setInput('pfad', PFAD);
    fixture.detectChanges();
    await fixture.whenStable();
    const component = fixture.componentInstance;
    component.form.controls.montag.setValue({
      geoeffnet: true,
      beginnLokalzeit: '07:00',
      endeLokalzeit: '01:00',
    });

    await component.saveGrundlagen();

    const gespeicherteGrundlagen = initializeFilialeinstellung.mock.calls[0][1];
    expect(gespeicherteGrundlagen).toEqual(
      expect.objectContaining({
        bundesland: 'DE-NW',
        wochenregeln: expect.objectContaining({
          montag: {
            geoeffnet: true,
            beginnLokalzeit: '07:00',
            endeLokalzeit: '01:00',
            endetAmFolgetag: true,
          },
          sonntag: {
            geoeffnet: false,
            beginnLokalzeit: '08:00',
            endeLokalzeit: '18:00',
            endetAmFolgetag: false,
          },
        }),
      }),
    );
    expect(gespeicherteGrundlagen).not.toHaveProperty('zeitzone');
  });

  it('should keep all time fields visible and disable only those of closed weekdays', async () => {
    const fixture = TestBed.createComponent(OeffnungszeitenFiliale);
    fixture.componentRef.setInput('filiale', FILIALE);
    fixture.componentRef.setInput('pfad', PFAD);
    fixture.detectChanges();
    await fixture.whenStable();
    const component = fixture.componentInstance;

    expect(fixture.nativeElement.querySelectorAll('app-lokalzeit-eingabe')).toHaveLength(14);
    expect(fixture.nativeElement.querySelectorAll('input[type="text"]')).toHaveLength(14);
    expect(component.form.controls.montag.controls.beginnLokalzeit.disabled).toBe(true);
    expect(component.form.controls.montag.controls.endeLokalzeit.disabled).toBe(true);

    component.form.controls.montag.controls.geoeffnet.setValue(true);

    expect(component.form.controls.montag.controls.beginnLokalzeit.enabled).toBe(true);
    expect(component.form.controls.montag.controls.endeLokalzeit.enabled).toBe(true);

    kontext.update((wert) => {
      return { ...wert, inProgress: true };
    });
    fixture.detectChanges();
    expect(component.form.disabled).toBe(true);

    kontext.update((wert) => {
      return { ...wert, inProgress: false };
    });
    fixture.detectChanges();
    expect(component.form.controls.montag.controls.beginnLokalzeit.enabled).toBe(true);
    expect(component.form.controls.dienstag.controls.beginnLokalzeit.disabled).toBe(true);
  });

  it('should open separate dialogs for annual special days and concrete date exceptions', () => {
    const fixture = TestBed.createComponent(OeffnungszeitenFiliale);
    fixture.componentRef.setInput('filiale', FILIALE);
    fixture.componentRef.setInput('pfad', PFAD);

    fixture.componentInstance.openSondertagAnlegen();
    fixture.componentInstance.openDatumsausnahmeAnlegen();

    expect(open).toHaveBeenNthCalledWith(1, SondertagBearbeitenDialog, {
      panelClass: ['pur-dialog__panel'],
      data: { pfad: PFAD },
    });
    expect(open).toHaveBeenNthCalledWith(2, DatumsausnahmeBearbeitenDialog, {
      panelClass: ['pur-dialog__panel'],
      data: { pfad: PFAD },
    });
  });

  it('should render store errors with the global message error style', async () => {
    kontext.update((wert) => {
      return {
        ...wert,
        error: {
          meldung: 'Die Filialeinstellungen konnten nicht gespeichert werden.',
          ursache: 'Die Öffnungsregel enthält keine gültige Zeitfolge.',
        },
      };
    });
    const fixture = TestBed.createComponent(OeffnungszeitenFiliale);
    fixture.componentRef.setInput('filiale', FILIALE);
    fixture.componentRef.setInput('pfad', PFAD);
    fixture.detectChanges();
    await fixture.whenStable();

    const meldung = fixture.nativeElement.querySelector(
      '.pur-message--error[role="alert"]',
    ) as HTMLElement | null;
    expect(meldung?.textContent).toContain(
      'Die Filialeinstellungen konnten nicht gespeichert werden.',
    );
    expect(meldung?.textContent).toContain('Die Öffnungsregel enthält keine gültige Zeitfolge.');
  });

  it('should not restart loading when the store reports a load error', async () => {
    loadFilialeinstellung.mockImplementationOnce(async () => {
      kontext.update((wert) => {
        return {
          ...wert,
          download: false,
          isLoaded: false,
          error: { meldung: 'Laden fehlgeschlagen.', ursache: null },
        };
      });
      throw new Error('Laden fehlgeschlagen.');
    });
    const fixture = TestBed.createComponent(OeffnungszeitenFiliale);
    fixture.componentRef.setInput('filiale', FILIALE);
    fixture.componentRef.setInput('pfad', PFAD);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(loadFilialeinstellung).toHaveBeenCalledOnce();
    const meldung = fixture.nativeElement.querySelector(
      '.pur-message--error[role="alert"]',
    ) as HTMLElement | null;
    expect(meldung?.textContent).toContain('Laden fehlgeschlagen.');
  });

  it('should mark inactive special days with the global list modifier', async () => {
    kontext.update((wert) => {
      return {
        ...wert,
        bestand: {
          allgemein: {
            bundesland: 'DE-NW',
            erstelltVonUid: 'uid-1',
            aktualisiertVonUid: 'uid-1',
          },
          oeffnungszeiten: {
            wochenregeln: {
              montag: {
                geoeffnet: false,
                beginnLokalzeit: '07:00',
                endeLokalzeit: '01:00',
                endetAmFolgetag: true,
              },
              dienstag: { geoeffnet: false },
              mittwoch: { geoeffnet: false },
              donnerstag: { geoeffnet: false },
              freitag: { geoeffnet: false },
              samstag: { geoeffnet: false },
              sonntag: { geoeffnet: false },
            },
            erstelltVonUid: 'uid-1',
            aktualisiertVonUid: 'uid-1',
          },
          sondertage: [
            {
              ...PFAD,
              id: 'tag-der-arbeit',
              bezeichnung: 'Tag der Arbeit',
              aktiv: false,
              herkunft: 'system',
              datumsregel: {
                typ: 'gesetzlicherFeiertag',
                feiertagSchluessel: 'tagDerArbeit',
              },
              oeffnungsregel: { geoeffnet: false },
              erstelltVonUid: 'uid-1',
              aktualisiertVonUid: 'uid-1',
            },
            {
              ...PFAD,
              id: 'erster-weihnachtstag',
              bezeichnung: '1. Weihnachtstag',
              aktiv: true,
              herkunft: 'system',
              datumsregel: {
                typ: 'gesetzlicherFeiertag',
                feiertagSchluessel: 'ersterWeihnachtstag',
              },
              oeffnungsregel: {
                geoeffnet: true,
                beginnLokalzeit: '08:00',
                endeLokalzeit: '18:00',
                endetAmFolgetag: false,
              },
              erstelltVonUid: 'uid-1',
              aktualisiertVonUid: 'uid-1',
            },
            {
              ...PFAD,
              id: 'heiligabend',
              bezeichnung: 'Heiligabend',
              aktiv: true,
              herkunft: 'system',
              datumsregel: { typ: 'jaehrlichFestesDatum', monat: 12, tag: 24 },
              oeffnungsregel: { geoeffnet: false },
              erstelltVonUid: 'uid-1',
              aktualisiertVonUid: 'uid-1',
            },
          ],
          ausnahmen: [
            {
              ...PFAD,
              id: '2026-11-12',
              datum: '2026-11-12',
              bezeichnung: 'Betriebsversammlung',
              oeffnungsregel: { geoeffnet: false },
              erstelltVonUid: 'uid-1',
              aktualisiertVonUid: 'uid-1',
            },
          ],
        },
      };
    });
    const fixture = TestBed.createComponent(OeffnungszeitenFiliale);
    fixture.componentRef.setInput('filiale', FILIALE);
    fixture.componentRef.setInput('pfad', PFAD);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.componentInstance.form.controls.montag.getRawValue()).toEqual({
      geoeffnet: false,
      beginnLokalzeit: '07:00',
      endeLokalzeit: '01:00',
    });

    const inaktiverSondertag = fixture.nativeElement.querySelector(
      '.pur-list__row--inactive',
    ) as HTMLElement | null;
    expect(inaktiverSondertag?.textContent).toContain('Tag der Arbeit');
    const bereiche = [...fixture.nativeElement.querySelectorAll('section.pur-list.liste')].map(
      (bereich: HTMLElement) => {
        return bereich.textContent;
      },
    );
    expect(bereiche[0]).toContain('Tag der Arbeit');
    expect(bereiche[0]).not.toContain('Heiligabend');
    expect(bereiche[1]).toContain('Heiligabend');
    expect(bereiche[1]).not.toContain('Betriebsversammlung');
    expect(bereiche[2]).toContain('Betriebsversammlung');
    expect(bereiche[0]).toContain('Gesetzliche Feiertage');
    expect(bereiche[1]).toContain('Jährliche Sondertage');
    expect(bereiche[2]).toContain('Einmalige Sondertage');
    expect(bereiche[0]).toContain('Inaktiv · Wochentagsregel gilt');
    expect(bereiche[0]).toContain('Aktiv · Geöffnet 08:00–18:00 Uhr');
    expect(bereiche[1]).toContain('Aktiv · Geschlossen · Jährlich am 24.12.');
    expect(bereiche[2]).toContain('Aktiv · Geschlossen · Einmalig am 12.11.2026');
    expect(bereiche.join(' ')).not.toContain('Folgetag');
    const jaehrlichHinzufuegen = fixture.nativeElement.querySelector(
      'button[aria-label="Jährlichen Sondertag hinzufügen"]',
    ) as HTMLButtonElement | null;
    const einmaligHinzufuegen = fixture.nativeElement.querySelector(
      'button[aria-label="Einmaligen Sondertag hinzufügen"]',
    ) as HTMLButtonElement | null;
    expect(jaehrlichHinzufuegen?.closest('.pur-list__header')).not.toBeNull();
    expect(jaehrlichHinzufuegen?.querySelector('mat-icon')?.textContent).toContain('add');
    expect(einmaligHinzufuegen?.closest('.pur-list__header')).not.toBeNull();
    expect(einmaligHinzufuegen?.querySelector('mat-icon')?.textContent).toContain('add');

    kontext.update((wert) => {
      if (!wert.bestand) {
        return wert;
      }
      return {
        ...wert,
        bestand: {
          ...wert.bestand,
          sondertage: wert.bestand.sondertage.filter((sondertag) => {
            return sondertag.datumsregel.typ === 'gesetzlicherFeiertag';
          }),
          ausnahmen: [],
        },
      };
    });
    fixture.detectChanges();

    const leereBereiche = fixture.nativeElement.querySelectorAll('section.pur-list.liste');
    const jaehrlichLeerzeile = leereBereiche[1].querySelector('.pur-list__row');
    const einmaligLeerzeile = leereBereiche[2].querySelector('.pur-list__row');
    expect(jaehrlichLeerzeile?.textContent).toContain('Noch keine jährlichen Sondertage');
    expect(jaehrlichLeerzeile?.querySelector('button')).toBeNull();
    expect(einmaligLeerzeile?.textContent).toContain('Noch keine einmaligen Sondertage');
    expect(einmaligLeerzeile?.querySelector('button')).toBeNull();
  });
});
