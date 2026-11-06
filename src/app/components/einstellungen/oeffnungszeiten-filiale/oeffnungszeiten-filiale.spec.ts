// pur-system/src/app/components/einstellungen/oeffnungszeiten-filiale/oeffnungszeiten-filiale.spec.ts

import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { of } from 'rxjs';

import { IFilialeEintrag } from '../../../commons/models/domain/filiale';
import {
  FilialeinstellungStore,
  TFilialeinstellungKontext,
} from '../../../stores/domain/filialeinstellung.store';
import { AbweichendeOeffnungszeitBearbeitenDialog } from '../abweichende-oeffnungszeit-bearbeiten-dialog/abweichende-oeffnungszeit-bearbeiten-dialog';
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
  const updateSondertag = vi.fn().mockResolvedValue(undefined);
  const updateSystemSondertag = vi.fn().mockResolvedValue(undefined);
  const open = vi.fn();

  beforeEach(async () => {
    vi.clearAllMocks();
    open.mockReturnValue({ afterClosed: () => of(undefined) });
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
            updateSondertag,
            updateSystemSondertag,
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
    expect(fixture.componentInstance.form.contains('schliesszeitraum')).toBe(false);
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
        standardoeffnungsregel: {
          geoeffnet: true,
          beginnLokalzeit: '06:00',
          endeLokalzeit: '01:00',
          endetAmFolgetag: true,
        },
        wochenregeln: expect.objectContaining({
          montag: { modus: 'standard' },
          sonntag: { modus: 'standard' },
        }),
      }),
    );
    expect(gespeicherteGrundlagen).not.toHaveProperty('zeitzone');
  });

  it('should enable time controls only for overriding weekdays', async () => {
    const fixture = TestBed.createComponent(OeffnungszeitenFiliale);
    fixture.componentRef.setInput('filiale', FILIALE);
    fixture.componentRef.setInput('pfad', PFAD);
    fixture.detectChanges();
    await fixture.whenStable();
    const component = fixture.componentInstance;

    expect(component.form.controls.montag.controls.beginnLokalzeit.disabled).toBe(true);
    expect(component.form.controls.montag.controls.endeLokalzeit.disabled).toBe(true);

    component.form.controls.dienstag.controls.modus.setValue('abweichend');

    expect(component.form.controls.montag.controls.modus.value).toBe('standard');
    expect(component.form.controls.montag.controls.beginnLokalzeit.disabled).toBe(true);
    expect(component.form.controls.dienstag.controls.beginnLokalzeit.enabled).toBe(true);
    expect(component.form.controls.dienstag.controls.endeLokalzeit.enabled).toBe(true);

    component.form.controls.dienstag.controls.endeLokalzeit.setValue(
      component.form.controls.dienstag.controls.beginnLokalzeit.value,
    );
    expect(component.form.invalid).toBe(true);

    component.form.controls.dienstag.controls.modus.setValue('geschlossen');

    expect(component.form.valid).toBe(true);
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
    expect(component.form.controls.montag.controls.beginnLokalzeit.disabled).toBe(true);
    expect(component.form.controls.dienstag.controls.beginnLokalzeit.disabled).toBe(true);
  });

  it('should edit an overriding weekday opening interval in a dialog', async () => {
    open.mockReturnValueOnce({
      afterClosed: () => of({ beginnLokalzeit: '08:00', endeLokalzeit: '22:00' }),
    });
    const fixture = TestBed.createComponent(OeffnungszeitenFiliale);
    fixture.componentRef.setInput('filiale', FILIALE);
    fixture.componentRef.setInput('pfad', PFAD);
    fixture.detectChanges();
    await fixture.whenStable();
    const component = fixture.componentInstance;
    component.form.controls.sonntag.controls.modus.setValue('abweichend');

    component.openWochenoeffnungszeitBearbeiten('sonntag');
    await fixture.whenStable();

    expect(open).toHaveBeenCalledWith(
      AbweichendeOeffnungszeitBearbeitenDialog,
      expect.objectContaining({
        data: {
          bezeichnung: 'Sonntag',
          beginnLokalzeit: '06:00',
          endeLokalzeit: '01:00',
        },
      }),
    );
    expect(component.form.controls.sonntag.getRawValue()).toEqual({
      modus: 'abweichend',
      beginnLokalzeit: '08:00',
      endeLokalzeit: '22:00',
    });
    expect(component.form.controls.sonntag.dirty).toBe(true);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('08:00–22:00');

    await component.saveGrundlagen();

    expect(initializeFilialeinstellung).toHaveBeenLastCalledWith(
      PFAD,
      expect.objectContaining({
        wochenregeln: expect.objectContaining({
          sonntag: {
            modus: 'abweichend',
            oeffnungsregel: {
              geoeffnet: true,
              beginnLokalzeit: '08:00',
              endeLokalzeit: '22:00',
              endetAmFolgetag: false,
            },
          },
        }),
      }),
    );
  });

  it('should open the dialog for an annual special day', () => {
    const fixture = TestBed.createComponent(OeffnungszeitenFiliale);
    fixture.componentRef.setInput('filiale', FILIALE);
    fixture.componentRef.setInput('pfad', PFAD);

    fixture.componentInstance.openSondertagAnlegen();

    expect(open).toHaveBeenCalledWith(
      SondertagBearbeitenDialog,
      expect.objectContaining({
        data: { pfad: PFAD },
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
            standardoeffnungsregel: {
              geoeffnet: true,
              beginnLokalzeit: '06:00',
              endeLokalzeit: '01:00',
              endetAmFolgetag: true,
            },
            wochenregeln: {
              montag: {
                modus: 'abweichend',
                oeffnungsregel: {
                  geoeffnet: true,
                  beginnLokalzeit: '07:00',
                  endeLokalzeit: '01:00',
                  endetAmFolgetag: true,
                },
              },
              dienstag: { modus: 'geschlossen' },
              mittwoch: { modus: 'geschlossen' },
              donnerstag: { modus: 'geschlossen' },
              freitag: { modus: 'geschlossen' },
              samstag: { modus: 'geschlossen' },
              sonntag: { modus: 'geschlossen' },
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
              id: 'karfreitag',
              bezeichnung: 'Karfreitag',
              aktiv: false,
              herkunft: 'system',
              datumsregel: {
                typ: 'gesetzlicherFeiertag',
                feiertagSchluessel: 'karfreitag',
              },
              oeffnungsregel: { geoeffnet: false },
              erstelltVonUid: 'uid-1',
              aktualisiertVonUid: 'uid-1',
            },
            {
              ...PFAD,
              id: 'volkstrauertag',
              bezeichnung: 'Volkstrauertag',
              aktiv: true,
              modus: 'abweichend',
              herkunft: 'system',
              datumsregel: {
                typ: 'berechneterSondertag',
                sondertagSchluessel: 'volkstrauertag',
              },
              oeffnungsregel: {
                geoeffnet: true,
                beginnLokalzeit: '13:00',
                endeLokalzeit: '01:00',
                endetAmFolgetag: true,
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
            {
              ...PFAD,
              id: 'winteraktion',
              bezeichnung: 'Winteraktion',
              aktiv: false,
              herkunft: 'benutzer',
              datumsregel: { typ: 'jaehrlichFestesDatum', monat: 2, tag: 3 },
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
      modus: 'abweichend',
      beginnLokalzeit: '07:00',
      endeLokalzeit: '01:00',
    });
    const submit = fixture.nativeElement.querySelector(
      'button[type="submit"]',
    ) as HTMLButtonElement;
    expect(submit.disabled).toBe(false);
    expect(fixture.componentInstance.hasFehlendeSystemtage()).toBe(true);

    await fixture.componentInstance.saveGrundlagen();
    expect(saveGrundlagen).toHaveBeenCalledOnce();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Tag der Arbeit');
    expect(text).toContain('01.05.');
    expect(text).toContain('25.12.');
    expect(text).toMatch(/\d{2}\.\d{2}\.\d{2}(?!\d)/);
    expect(text).not.toContain('Festes Datum');
    expect(text).not.toContain('Berechnetes Datum');
    expect(text.indexOf('Karfreitag')).toBeLessThan(text.indexOf('Tag der Arbeit'));
    expect(text.indexOf('Tag der Arbeit')).toBeLessThan(text.indexOf('1. Weihnachtstag'));
    expect(text.indexOf('Winteraktion')).toBeLessThan(text.indexOf('Heiligabend'));
    expect(text).toContain('03.02.');
    expect(text).toContain('Volkstrauertag');
    expect(text).toContain('13:00–01:00 Uhr');
    expect(text).toContain('Heiligabend');
    expect(text).toContain('08:00–18:00 Uhr');
    expect(text).toContain('24.12.');
    expect(text).not.toContain('Jährlich am');
    expect(
      fixture.componentInstance.getSondertagsmodus(fixture.componentInstance.feiertage()[0]),
    ).toBe('standard');
    expect(
      fixture.componentInstance.getSondertagsmodus(fixture.componentInstance.feiertage()[2]),
    ).toBe('abweichend');
    const tagDerArbeit = fixture.componentInstance.feiertage().find((feiertag) => {
      return feiertag.id === 'tag-der-arbeit';
    });
    const ersterWeihnachtstag = fixture.componentInstance.feiertage().find((feiertag) => {
      return feiertag.id === 'erster-weihnachtstag';
    });
    expect(tagDerArbeit).toBeDefined();
    expect(ersterWeihnachtstag).toBeDefined();
    if (!tagDerArbeit || !ersterWeihnachtstag) return;
    const kalenderjahrKurz = String(fixture.componentInstance.kalenderjahr).slice(-2);
    expect(fixture.componentInstance.getFeiertagDatum(tagDerArbeit)).toBe(
      `01.05.${kalenderjahrKurz}`,
    );
    expect(fixture.componentInstance.getSondertagOeffnungsregel(tagDerArbeit)).toEqual({
      geoeffnet: true,
      beginnLokalzeit: '06:00',
      endeLokalzeit: '01:00',
      endetAmFolgetag: true,
    });

    fixture.componentInstance.form.controls.sonntag.patchValue({
      modus: 'abweichend',
      beginnLokalzeit: '10:00',
      endeLokalzeit: '01:00',
    });
    await fixture.componentInstance.updateSondertagsmodus(tagDerArbeit, 'wieSonntag');

    expect(updateSystemSondertag).toHaveBeenLastCalledWith(PFAD, 'tag-der-arbeit', {
      aktiv: true,
      modus: 'wieSonntag',
      oeffnungsregel: { geoeffnet: false },
    });
    expect(
      fixture.componentInstance.getSondertagOeffnungsregel({
        ...tagDerArbeit,
        aktiv: true,
        modus: 'wieSonntag',
      }),
    ).toEqual({
      geoeffnet: true,
      beginnLokalzeit: '10:00',
      endeLokalzeit: '01:00',
      endetAmFolgetag: true,
    });

    await fixture.componentInstance.updateSondertagsmodus(tagDerArbeit, 'abweichend');

    expect(updateSystemSondertag).toHaveBeenLastCalledWith(PFAD, 'tag-der-arbeit', {
      aktiv: true,
      modus: 'abweichend',
      oeffnungsregel: {
        geoeffnet: true,
        beginnLokalzeit: '06:00',
        endeLokalzeit: '01:00',
        endetAmFolgetag: true,
      },
    });

    open.mockReturnValueOnce({
      afterClosed: () => of({ beginnLokalzeit: '09:00', endeLokalzeit: '20:00' }),
    });
    fixture.componentInstance.openSondertagOeffnungszeitBearbeiten(ersterWeihnachtstag);
    await vi.waitFor(() => {
      expect(updateSystemSondertag).toHaveBeenLastCalledWith(PFAD, 'erster-weihnachtstag', {
        aktiv: true,
        modus: 'abweichend',
        oeffnungsregel: {
          geoeffnet: true,
          beginnLokalzeit: '09:00',
          endeLokalzeit: '20:00',
          endetAmFolgetag: false,
        },
      });
    });
    expect(open).toHaveBeenLastCalledWith(
      AbweichendeOeffnungszeitBearbeitenDialog,
      expect.objectContaining({
        data: {
          bezeichnung: '1. Weihnachtstag',
          beginnLokalzeit: '08:00',
          endeLokalzeit: '18:00',
        },
      }),
    );
    const winteraktion = fixture.componentInstance.sondertage().find((sondertag) => {
      return sondertag.id === 'winteraktion';
    });
    const heiligabend = fixture.componentInstance.sondertage().find((sondertag) => {
      return sondertag.id === 'heiligabend';
    });
    const volkstrauertag = fixture.componentInstance.sondertage().find((sondertag) => {
      return sondertag.id === 'volkstrauertag';
    });
    expect(winteraktion).toBeDefined();
    expect(heiligabend).toBeDefined();
    expect(volkstrauertag).toBeDefined();
    if (!winteraktion || !heiligabend || !volkstrauertag) return;
    expect(fixture.componentInstance.getSondertagsmodus(winteraktion)).toBe('standard');
    expect(fixture.componentInstance.getSondertagsmodus(heiligabend)).toBe('geschlossen');
    expect(fixture.componentInstance.getSondertagsmodus(volkstrauertag)).toBe('abweichend');
    expect(fixture.componentInstance.getJaehrlichesDatum(winteraktion)).toBe(
      `03.02.${kalenderjahrKurz}`,
    );
    expect(fixture.componentInstance.getJaehrlichesDatum(heiligabend)).toBe(
      `24.12.${kalenderjahrKurz}`,
    );
    expect(fixture.componentInstance.getJaehrlichesDatum(volkstrauertag)).toMatch(
      /^\d{2}\.\d{2}\.\d{2}$/,
    );

    await fixture.componentInstance.updateSondertagsmodus(winteraktion, 'abweichend');

    expect(updateSondertag).toHaveBeenLastCalledWith(PFAD, 'winteraktion', {
      bezeichnung: 'Winteraktion',
      aktiv: true,
      datumsregel: { typ: 'jaehrlichFestesDatum', monat: 2, tag: 3 },
      oeffnungsregel: {
        geoeffnet: true,
        beginnLokalzeit: '06:00',
        endeLokalzeit: '01:00',
        endetAmFolgetag: true,
      },
    });
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
        },
      };
    });
    fixture.detectChanges();

    const leerText = (fixture.nativeElement as HTMLElement).textContent;
    expect(leerText).toContain('Noch keine jährlichen Sondertage');
  });
});
