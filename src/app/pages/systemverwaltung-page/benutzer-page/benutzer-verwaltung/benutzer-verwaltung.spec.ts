// pur-system/src/app/pages/systemverwaltung-page/benutzer-page/benutzer-verwaltung/benutzer-verwaltung.spec.ts

import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { MatSelect } from '@angular/material/select';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { By } from '@angular/platform-browser';

import { IBenutzerProfilEintrag } from '../../../../commons/models/domain/benutzer';
import { BenutzerVerwaltungStore } from '../../../../stores/domain/benutzer-verwaltung.store';
import { BenutzerBearbeitenDialog } from './benutzer-bearbeiten-dialog/benutzer-bearbeiten-dialog';
import { BenutzerVerwaltung } from './benutzer-verwaltung';

describe('BenutzerVerwaltung', () => {
  const profil: IBenutzerProfilEintrag = {
    uid: 'office-1',
    anmeldename: 'officebenutzer-office',
    email: 'office@example.com',
    anzeigename: 'Office Benutzer',
    aktiv: true,
    userRole: 'office',
    erlaubteBereiche: ['dashboard', 'verwaltung'],
    zugriffe: { u: { f: ['b'] } },
  };
  const openMock = vi.fn();
  const storeMock = {
    benutzerprofile: signal<readonly IBenutzerProfilEintrag[]>([]),
    benutzerprofileDownload: signal(false),
    benutzerprofileIsLoaded: signal(true),
    benutzerprofileError: signal<string | null>(null),
    selectedBenutzer: signal<IBenutzerProfilEintrag | null>(null),
    inProgress: signal(false),
    updateError: signal<string | null>(null),
    updateSuccess: signal<string | null>(null),
    selectBenutzer: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    storeMock.benutzerprofile.set([]);
    storeMock.benutzerprofileDownload.set(false);
    storeMock.benutzerprofileIsLoaded.set(true);
    storeMock.benutzerprofileError.set(null);
    storeMock.selectedBenutzer.set(null);
    storeMock.inProgress.set(false);
    storeMock.updateError.set(null);
    storeMock.updateSuccess.set(null);

    await TestBed.configureTestingModule({
      imports: [BenutzerVerwaltung, NoopAnimationsModule],
    })
      .overrideComponent(BenutzerVerwaltung, {
        set: {
          providers: [
            { provide: MatDialog, useValue: { open: openMock } },
            { provide: BenutzerVerwaltungStore, useValue: storeMock },
          ],
        },
      })
      .compileComponents();
  });

  it('should render an empty and disabled profile selection', () => {
    const fixture = TestBed.createComponent(BenutzerVerwaltung);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const bearbeitenButton = compiled.querySelector<HTMLButtonElement>('button');

    expect(compiled.querySelector('.pur-page-section__title')?.textContent).toContain(
      'Benutzer verwalten',
    );
    expect(compiled.textContent).toContain('Keine Benutzerprofile verfügbar');
    expect(bearbeitenButton?.disabled).toBe(true);
  });

  it('should select a profile and open its edit dialog', () => {
    storeMock.benutzerprofile.set([profil]);
    storeMock.selectedBenutzer.set(profil);
    const fixture = TestBed.createComponent(BenutzerVerwaltung);
    const component = fixture.componentInstance;

    component.selectBenutzer(profil.uid);
    component.openBenutzerBearbeitenDialog();

    expect(storeMock.selectBenutzer).toHaveBeenCalledWith(profil.uid);
    expect(openMock).toHaveBeenCalledWith(BenutzerBearbeitenDialog, {
      data: { profil },
      panelClass: ['pur-dialog__panel'],
    });
  });

  it('should show the display name and role instead of technical login data', () => {
    storeMock.benutzerprofile.set([profil]);
    const fixture = TestBed.createComponent(BenutzerVerwaltung);
    fixture.detectChanges();
    const select = fixture.debugElement.query(By.directive(MatSelect))
      .componentInstance as MatSelect;
    const optionTexts = select.options.map((option) =>
      option.viewValue.replace(/\s+/g, ' ').trim(),
    );

    expect(optionTexts).toContain('Office Benutzer - Office');
    expect(optionTexts.join(' ')).not.toContain('officebenutzer-office');
    expect(optionTexts.join(' ')).not.toContain('office@example.com');
  });
});
