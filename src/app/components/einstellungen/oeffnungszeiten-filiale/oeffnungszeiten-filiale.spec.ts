// pur-system/src/app/components/einstellungen/oeffnungszeiten-filiale/oeffnungszeiten-filiale.spec.ts

import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';

import { STANDARD_SCHLIESSZEITRAUM_NRW } from '../../../commons/constants/filialeinstellung.constants';
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
  const saveGrundlagen = vi.fn().mockResolvedValue(undefined);
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
            saveGrundlagen,
          },
        },
        { provide: MatDialog, useValue: { open } },
      ],
    }).compileComponents();
  });

  it('should provide all seven weekdays without branch-global fields', async () => {
    const fixture = TestBed.createComponent(OeffnungszeitenFiliale);
    fixture.componentRef.setInput('filiale', FILIALE);
    fixture.componentRef.setInput('pfad', PFAD);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.componentInstance.wochentage).toHaveLength(7);
    expect(fixture.componentInstance.form.contains('bundesland')).toBe(false);
    expect(fixture.componentInstance.form.contains('zeitzone')).toBe(false);
    expect(fixture.componentInstance.form.controls.schliesszeitraum.getRawValue()).toEqual({
      beginnLokalzeit: '01:00',
      endeLokalzeit: '06:00',
    });
  });

  it('should initialize weekdays with the overnight standard opening hours', async () => {
    const fixture = TestBed.createComponent(OeffnungszeitenFiliale);
    fixture.componentRef.setInput('filiale', FILIALE);
    fixture.componentRef.setInput('pfad', PFAD);
    fixture.detectChanges();
    await fixture.whenStable();
    const component = fixture.componentInstance;
    const submit = fixture.nativeElement.querySelector(
      'button[type="submit"]',
    ) as HTMLButtonElement;

    expect(submit.disabled).toBe(false);
    submit.click();
    await fixture.whenStable();

    const gespeicherteGrundlagen = initializeFilialeinstellung.mock.calls[0][1];
    expect(gespeicherteGrundlagen).toEqual(
      expect.objectContaining({
        bundesland: 'DE-NW',
        schliesszeitraum: STANDARD_SCHLIESSZEITRAUM_NRW,
        wochenregeln: expect.objectContaining({
          montag: {
            geoeffnet: true,
            beginnLokalzeit: '06:00',
            endeLokalzeit: '01:00',
            endetAmFolgetag: true,
          },
          sonntag: {
            geoeffnet: true,
            beginnLokalzeit: '06:00',
            endeLokalzeit: '01:00',
            endetAmFolgetag: true,
          },
        }),
      }),
    );
    expect(gespeicherteGrundlagen).not.toHaveProperty('zeitzone');
  });

  it('should disable only the time controls of closed weekdays', async () => {
    const fixture = TestBed.createComponent(OeffnungszeitenFiliale);
    fixture.componentRef.setInput('filiale', FILIALE);
    fixture.componentRef.setInput('pfad', PFAD);
    fixture.detectChanges();
    await fixture.whenStable();
    const component = fixture.componentInstance;

    expect(component.form.controls.montag.controls.beginnLokalzeit.enabled).toBe(true);
    expect(component.form.controls.montag.controls.endeLokalzeit.enabled).toBe(true);

    component.form.controls.dienstag.controls.geoeffnet.setValue(false);

    expect(component.form.controls.montag.controls.geoeffnet.value).toBe(true);
    expect(component.form.controls.montag.controls.beginnLokalzeit.enabled).toBe(true);
    expect(component.form.controls.dienstag.controls.beginnLokalzeit.disabled).toBe(true);
    expect(component.form.controls.dienstag.controls.endeLokalzeit.disabled).toBe(true);

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

  it('should block weekly opening hours that overlap the closing period', async () => {
    const fixture = TestBed.createComponent(OeffnungszeitenFiliale);
    fixture.componentRef.setInput('filiale', FILIALE);
    fixture.componentRef.setInput('pfad', PFAD);
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.form.controls.schliesszeitraum.controls.endeLokalzeit.setValue(
      '07:00',
    );
    fixture.detectChanges();

    expect(fixture.componentInstance.form.hasError('oeffnungsregelAusserhalbOeffnungsrahmen')).toBe(
      true,
    );
    const submit = fixture.nativeElement.querySelector(
      'button[type="submit"]',
    ) as HTMLButtonElement;
    expect(submit.disabled).toBe(true);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      'Die Öffnungsregel „Montag“ überschneidet den Schließzeitraum.',
    );
  });

  it('should open separate dialogs for annual special days and concrete date exceptions', () => {
    const fixture = TestBed.createComponent(OeffnungszeitenFiliale);
    fixture.componentRef.setInput('filiale', FILIALE);
    fixture.componentRef.setInput('pfad', PFAD);

    fixture.componentInstance.openSondertagAnlegen();
    fixture.componentInstance.openDatumsausnahmeAnlegen();

    expect(open).toHaveBeenNthCalledWith(
      1,
      SondertagBearbeitenDialog,
      expect.objectContaining({
        data: { pfad: PFAD, schliesszeitraum: STANDARD_SCHLIESSZEITRAUM_NRW },
      }),
    );
    expect(open).toHaveBeenNthCalledWith(
      2,
      DatumsausnahmeBearbeitenDialog,
      expect.objectContaining({
        data: { pfad: PFAD, schliesszeitraum: STANDARD_SCHLIESSZEITRAUM_NRW },
      }),
    );
  });

  it('should render store errors with their technical cause', async () => {
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

    const text = (fixture.nativeElement as HTMLElement).textContent;
    expect(text).toContain('Die Filialeinstellungen konnten nicht gespeichert werden.');
    expect(text).toContain('Die Öffnungsregel enthält keine gültige Zeitfolge.');
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
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Laden fehlgeschlagen.');
  });

  it('should show loaded special days and empty states', async () => {
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
            schliesszeitraum: STANDARD_SCHLIESSZEITRAUM_NRW,
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
    const submit = fixture.nativeElement.querySelector(
      'button[type="submit"]',
    ) as HTMLButtonElement;
    expect(submit.disabled).toBe(true);

    await fixture.componentInstance.saveGrundlagen();
    expect(saveGrundlagen).not.toHaveBeenCalled();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Tag der Arbeit');
    expect(text).toContain('Heiligabend');
    expect(text).toContain('Betriebsversammlung');
    expect(text).toContain('Inaktiv · Wochentagsregel gilt');
    expect(text).toContain('Aktiv · Geöffnet 08:00–18:00 Uhr');
    expect(text).toContain('Aktiv · Geschlossen · Jährlich am 24.12.');
    expect(text).toContain('Aktiv · Geschlossen · Einmalig am 12.11.2026');
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

    const leerText = (fixture.nativeElement as HTMLElement).textContent;
    expect(leerText).toContain('Noch keine jährlichen Sondertage');
    expect(leerText).toContain('Noch keine einmaligen Sondertage');
  });
});
