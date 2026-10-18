// pur-system/src/app/components/einstellungen/oeffnungszeiten-filiale/oeffnungszeiten-filiale.spec.ts

import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';

import { IFilialeEintrag } from '../../../commons/models/domain/filiale';
import {
  FilialeinstellungStore,
  TFilialeinstellungKontext,
} from '../../../stores/domain/filialeinstellung.store';
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
    bestand: null,
    download: false,
    isLoaded: true,
    inProgress: false,
    error: null,
  });
  const loadFilialeinstellung = vi.fn().mockResolvedValue(undefined);
  const initializeFilialeinstellung = vi.fn().mockResolvedValue(undefined);

  beforeEach(async () => {
    vi.clearAllMocks();
    kontext.set({
      ...PFAD,
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
        { provide: MatDialog, useValue: { open: vi.fn() } },
      ],
    }).compileComponents();
  });

  it('should render all seven weekdays', async () => {
    const fixture = TestBed.createComponent(OeffnungszeitenFiliale);
    fixture.componentRef.setInput('filiale', FILIALE);
    fixture.componentRef.setInput('pfad', PFAD);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelectorAll('.wochentage > .pur-list__row')).toHaveLength(7);
    expect(fixture.nativeElement.querySelector('.pur-page-section')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('mat-card')).toBeNull();
    expect(fixture.nativeElement.querySelector('h2')?.textContent).toContain('Bochum 1');
    expect(fixture.nativeElement.querySelector('h3')?.textContent).toContain('Wochentage');
    expect(fixture.nativeElement.querySelectorAll('h4')).toHaveLength(7);
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
        }),
      }),
    );
    expect(gespeicherteGrundlagen).not.toHaveProperty('zeitzone');
  });

  it('should render store errors with the global form error style', async () => {
    kontext.update((wert) => {
      return { ...wert, error: 'Speichern fehlgeschlagen.' };
    });
    const fixture = TestBed.createComponent(OeffnungszeitenFiliale);
    fixture.componentRef.setInput('filiale', FILIALE);
    fixture.componentRef.setInput('pfad', PFAD);
    fixture.detectChanges();
    await fixture.whenStable();

    const meldung = fixture.nativeElement.querySelector(
      '.pur-form__item--error[role="alert"]',
    ) as HTMLElement | null;
    expect(meldung?.textContent).toContain('Speichern fehlgeschlagen.');
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
              montag: { geoeffnet: false },
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
    expect(bereiche[1]).toContain('Betriebsversammlung');
  });
});
