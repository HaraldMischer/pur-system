// pur-system/src/app/pages/systemverwaltung-page/benutzer-page/benutzer-page.spec.ts

import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { signal } from '@angular/core';
import { FormGroupDirective } from '@angular/forms';
import { By } from '@angular/platform-browser';
import { DatenzugriffSelector } from '../../../components/data-selectors/datenzugriff-selector/datenzugriff-selector';
import { TestBed } from '@angular/core/testing';

import { DatenzugriffService } from '../../../services/domain/datenzugriff.service';
import { BenutzerService } from '../../../services/domain/benutzer.service';
import { AuthService } from '../../../services/firebase/auth.service';
import { BenutzerVerwaltungService } from '../../../services/firebase/benutzer-verwaltung.service';
import { BenutzerStore } from '../../../stores/app/benutzer.store';
import { BenutzerVerwaltungStore } from '../../../stores/domain/benutzer-verwaltung.store';
import { FirmaStore } from '../../../stores/domain/firma.store';
import { FilialeStore } from '../../../stores/domain/filiale.store';
import { UnternehmerStore } from '../../../stores/domain/unternehmer.store';
import { BenutzerAnlage } from './benutzer-anlage/benutzer-anlage';
import { BenutzerPage } from './benutzer-page';

describe('BenutzerPage', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BenutzerAnlage, BenutzerPage, NoopAnimationsModule],
      providers: [
        BenutzerVerwaltungStore,
        {
          provide: FirmaStore,
          useValue: {
            firmen: signal([]),
            download: signal(false),
            isLoaded: signal(false),
            error: signal(null),
            loadFirmen: vi.fn().mockResolvedValue(undefined),
            resetFirmen: vi.fn(),
            clearError: vi.fn(),
          },
        },
        {
          provide: UnternehmerStore,
          useValue: {
            unternehmer: signal([]),
            download: signal(false),
            isLoaded: signal(true),
            error: signal(null),
            loadUnternehmer: vi.fn().mockResolvedValue(undefined),
            clearError: vi.fn(),
          },
        },
        {
          provide: FilialeStore,
          useValue: {
            filialen: signal([]),
            download: signal(false),
            isLoaded: signal(false),
            error: signal(null),
            loadFilialen: vi.fn().mockResolvedValue(undefined),
            resetFilialen: vi.fn(),
            clearError: vi.fn(),
          },
        },
        {
          provide: DatenzugriffService,
          useValue: {
            loadUnternehmer: vi.fn().mockResolvedValue([]),
            loadFirmen: vi.fn().mockResolvedValue([]),
            loadFilialen: vi.fn().mockResolvedValue([]),
          },
        },
        {
          provide: BenutzerService,
          useValue: {
            updateBenutzerProfil: vi.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: AuthService,
          useValue: {
            getAktuelleBenutzerId: vi.fn().mockReturnValue('master-1'),
          },
        },
        {
          provide: BenutzerStore,
          useValue: {
            setBenutzerProfil: vi.fn(),
          },
        },
        {
          provide: BenutzerVerwaltungService,
          useValue: {
            loadMitarbeiterAuswahl: vi
              .fn()
              .mockResolvedValue([{ id: 'm-1', anzeigename: 'Muster, Mia' }]),
            createBenutzer: vi.fn().mockResolvedValue({
              uid: 'neu-123',
              anmeldename: 'test-master',
              email: 'test-master@pur-system.invalid',
            }),
          },
        },
      ],
    }).compileComponents();
  });

  it('should create the page with an invalid empty user form', () => {
    const fixture = TestBed.createComponent(BenutzerAnlage);

    expect(fixture.componentInstance).toBeTruthy();
    expect(fixture.componentInstance.benutzerForm.invalid).toBe(true);
  });

  it('should render role and area controls', () => {
    const fixture = TestBed.createComponent(BenutzerPage);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelector('h1')).toBeNull();
    expect(
      Array.from(compiled.querySelectorAll('.pur-page-section__title')).map((titel) =>
        titel.textContent?.trim(),
      ),
    ).toEqual(['Benutzer anlegen', 'Benutzer verwalten']);
    expect(compiled.querySelectorAll('mat-divider')).toHaveLength(1);
    expect(compiled.querySelector('mat-select')).toBeTruthy();
    expect(compiled.querySelectorAll('mat-checkbox')).toHaveLength(2);
    const bereichCheckboxen = compiled.querySelectorAll<HTMLInputElement>('input[type="checkbox"]');
    expect(bereichCheckboxen).toHaveLength(2);
  });

  it('should create normalized input data from a valid form', () => {
    const fixture = TestBed.createComponent(BenutzerAnlage);
    const component = fixture.componentInstance;
    component.benutzerForm.patchValue({
      namensbestandteil: '  Tést Benutzer! ',
      anzeigename: '  Test Benutzer ',
      userRole: 'master',
      passwort: 'SicheresPasswort123!',
      erlaubteBereiche: {
        schichtplan: true,
        mitarbeiter: false,
        verwaltung: true,
      },
    });
    expect(component.getBenutzerAnlage()).toEqual({
      namensbestandteil: 'test.benutzer',
      anzeigename: 'Test Benutzer',
      userRole: 'master',
      erlaubteBereiche: ['dashboard', 'schichtplan', 'verwaltung', 'systemverwaltung'],
      zugriffe: {},
      passwort: 'SicheresPasswort123!',
    });
  });

  it('should derive read-only login details from display name and role', () => {
    const fixture = TestBed.createComponent(BenutzerAnlage);
    const component = fixture.componentInstance;

    component.benutzerForm.controls.anzeigename.setValue('Harald Mischer');
    component.benutzerForm.controls.userRole.setValue('master');
    fixture.detectChanges();

    expect(component.benutzerForm.controls.namensbestandteil.value).toBe('harald.mischer');
    expect(component.getAnmeldenameVorschau()).toBe('harald.mischer-master');
    const readOnlyInputs = fixture.nativeElement.querySelectorAll('input[readonly]');
    expect(readOnlyInputs).toHaveLength(1);
    expect(readOnlyInputs[0].value).toBe('harald.mischer-master');
    expect(fixture.nativeElement.textContent).not.toContain('Technische Adresse');

    component.benutzerForm.controls.anzeigename.setValue('Anderer Anzeigename');
    fixture.detectChanges();

    expect(component.benutzerForm.controls.namensbestandteil.value).toBe('anderer.anzeigename');
    expect(readOnlyInputs[0].value).toBe('anderer.anzeigename-master');
  });

  it('should reject a display name without usable login characters', () => {
    const component = TestBed.createComponent(BenutzerAnlage).componentInstance;
    component.benutzerForm.patchValue({
      anzeigename: '---',
      userRole: 'master',
      passwort: 'SicheresPasswort123!',
    });

    expect(component.getBenutzerAnlage()).toBeNull();
    expect(component.benutzerForm.controls.namensbestandteil.hasError('required')).toBe(true);
  });

  it('should create an employee account with its company employee reference', async () => {
    const daten = TestBed.inject(DatenzugriffService);
    vi.mocked(daten.loadUnternehmer).mockResolvedValue([{ id: 'u', anzeigename: 'Unternehmer' }]);
    vi.mocked(daten.loadFirmen).mockResolvedValue([{ id: 'f', anzeigename: 'Firma' }]);
    const fixture = TestBed.createComponent(BenutzerAnlage);
    async function render() {
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();
    }
    await render();
    const component = fixture.componentInstance;

    component.benutzerForm.patchValue({
      namensbestandteil: 'mitarbeiter',
      anzeigename: 'Test Mitarbeiter',
      userRole: 'mitarbeiter',
      passwort: 'SicheresPasswort123!',
      erlaubteBereiche: {
        schichtplan: true,
      },
    });
    await render();
    expect(component.benutzerForm.controls.firmaMitarbeiterId.disabled).toBe(true);

    const datenAuswahl = fixture.debugElement.query(By.directive(DatenzugriffSelector))
      .componentInstance as DatenzugriffSelector;
    datenAuswahl.selectUnternehmer('u');
    await render();
    datenAuswahl.selectFirmen([datenAuswahl.getFirmaSchluessel('u', 'f')]);
    await render();
    expect(component.benutzerForm.controls.firmaMitarbeiterId.enabled).toBe(true);
    component.benutzerForm.controls.firmaMitarbeiterId.setValue('m-1');
    component.handleMitarbeiterChange('m-1');

    expect(component.rollen).toContainEqual({ value: 'mitarbeiter', label: 'Mitarbeiter' });
    expect(component.benutzerForm.controls.erlaubteBereiche.controls.schichtplan.enabled).toBe(
      true,
    );
    expect(datenAuswahl.filialenSichtbar()).toBe(false);
    expect(datenAuswahl.filialen()).toEqual({});
    expect(
      Array.from(
        (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>(
          'app-datenzugriff-selector mat-label',
        ),
      ).map((label) => label.textContent?.trim()),
    ).toEqual(['Unternehmer', 'Firmen', 'Mitarbeiter']);
    expect(component.getBenutzerAnlage()).toEqual({
      namensbestandteil: 'test.mitarbeiter',
      anzeigename: 'Test Mitarbeiter',
      userRole: 'mitarbeiter',
      erlaubteBereiche: ['dashboard', 'schichtplan'],
      zugriffe: { u: { f: [] } },
      firmaMitarbeiterId: 'm-1',
      passwort: 'SicheresPasswort123!',
    });
  });

  it('should show when the selected company has no employees', async () => {
    const daten = TestBed.inject(DatenzugriffService);
    const benutzerVerwaltung = TestBed.inject(BenutzerVerwaltungService);
    vi.mocked(daten.loadUnternehmer).mockResolvedValue([{ id: 'u', anzeigename: 'Unternehmer' }]);
    vi.mocked(daten.loadFirmen).mockResolvedValue([{ id: 'f', anzeigename: 'Firma' }]);
    vi.mocked(benutzerVerwaltung.loadMitarbeiterAuswahl).mockResolvedValue([]);
    const fixture = TestBed.createComponent(BenutzerAnlage);
    async function render() {
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();
    }
    await render();

    fixture.componentInstance.benutzerForm.controls.userRole.setValue('mitarbeiter');
    await render();
    const datenAuswahl = fixture.debugElement.query(By.directive(DatenzugriffSelector))
      .componentInstance as DatenzugriffSelector;
    datenAuswahl.selectUnternehmer('u');
    await render();
    datenAuswahl.selectFirmen([datenAuswahl.getFirmaSchluessel('u', 'f')]);
    await render();

    const meldung = fixture.nativeElement.querySelector('.pur-form__error[role="alert"]');
    expect(meldung?.textContent).toContain('Die Firma hat noch keine Mitarbeiter.');
    expect(fixture.componentInstance.benutzerForm.controls.firmaMitarbeiterId.disabled).toBe(true);
  });

  it('should preserve selected areas when changing roles', () => {
    const component = TestBed.createComponent(BenutzerAnlage).componentInstance;

    component.benutzerForm.controls.erlaubteBereiche.patchValue({
      schichtplan: true,
    });
    component.benutzerForm.controls.userRole.setValue('mitarbeiter');
    component.benutzerForm.controls.userRole.setValue('office');

    expect(component.benutzerForm.controls.erlaubteBereiche.getRawValue()).toEqual({
      schichtplan: true,
      mitarbeiter: false,
      verwaltung: false,
    });
    expect(component.benutzerForm.controls.erlaubteBereiche.controls.schichtplan.enabled).toBe(
      true,
    );
    expect(component.benutzerForm.controls.erlaubteBereiche.controls.mitarbeiter.enabled).toBe(
      true,
    );
    expect(component.benutzerForm.controls.erlaubteBereiche.controls.verwaltung.enabled).toBe(true);
  });

  it('should derive mandatory areas without exposing them as form controls', () => {
    const fixture = TestBed.createComponent(BenutzerAnlage);
    const component = fixture.componentInstance;
    component.benutzerForm.patchValue({
      anzeigename: 'Test Master',
      userRole: 'master',
      passwort: 'SicheresPasswort123!',
    });
    fixture.detectChanges();

    expect(component.getBenutzerAnlage()?.erlaubteBereiche).toEqual([
      'dashboard',
      'systemverwaltung',
    ]);
    expect(
      Array.from(
        (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>('mat-checkbox'),
      ).map((checkbox) => checkbox.textContent?.trim()),
    ).toEqual(['Schichtplan', 'Mitarbeiter', 'Verwaltung']);
  });

  it.each(['', 'short'])(
    'should prevent submission with an invalid initial password: %s',
    async (passwort) => {
      const component = TestBed.createComponent(BenutzerAnlage).componentInstance;
      component.benutzerForm.patchValue({
        namensbestandteil: 'user',
        anzeigename: 'Test',
        passwort,
      });
      await component.onSubmit();
      expect(component.getBenutzerAnlage()).toBeNull();
      expect(TestBed.inject(BenutzerVerwaltungService).createBenutzer).not.toHaveBeenCalled();
    },
  );

  it('should enable submission for valid input and clear the form after success', async () => {
    const fixture = TestBed.createComponent(BenutzerAnlage);
    const component = fixture.componentInstance;
    component.benutzerForm.patchValue({
      namensbestandteil: 'test',
      anzeigename: 'Test',
      userRole: 'master',
      passwort: 'SicheresPasswort123!',
    });
    expect(component.benutzerForm.valid).toBe(true);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('button[type="submit"]').disabled).toBe(false);
    const directive = fixture.debugElement
      .query(By.directive(FormGroupDirective))
      .injector.get(FormGroupDirective);
    fixture.nativeElement
      .querySelector('form')
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    expect(directive.submitted).toBe(true);
    await fixture.whenStable();
    fixture.detectChanges();
    expect(directive.submitted).toBe(false);
    expect(component.benutzerForm.pristine).toBe(true);
    expect(component.benutzerForm.untouched).toBe(true);
    expect(fixture.nativeElement.querySelectorAll('mat-error')).toHaveLength(0);
    expect(fixture.nativeElement.querySelectorAll('.mat-mdc-form-field-invalid')).toHaveLength(0);
    expect(fixture.nativeElement.querySelector('.pur-form__success')).not.toBeNull();
    expect(
      TestBed.inject(BenutzerVerwaltungService).createBenutzer,
    ).toHaveBeenCalledExactlyOnceWith({
      namensbestandteil: 'test',
      anzeigename: 'Test',
      userRole: 'master',
      passwort: 'SicheresPasswort123!',
      erlaubteBereiche: ['dashboard', 'systemverwaltung'],
      zugriffe: {},
    });
    expect(component.benutzerForm.controls.passwort.value).toBe('');
    expect(component.benutzerForm.controls.namensbestandteil.value).toBe('');
  });

  it('should clear user management feedback when leaving the page', () => {
    const store = TestBed.inject(BenutzerVerwaltungStore);
    const clearFeedback = vi.spyOn(store, 'clearFeedback');
    const fixture = TestBed.createComponent(BenutzerPage);

    fixture.destroy();

    expect(clearFeedback).toHaveBeenCalledOnce();
  });

  it('should toggle password visibility without submitting or changing the password', () => {
    const fixture = TestBed.createComponent(BenutzerAnlage);
    const component = fixture.componentInstance;
    component.benutzerForm.patchValue({
      namensbestandteil: 'test',
      anzeigename: 'Test',
      passwort: 'SicheresPasswort123!',
    });
    fixture.detectChanges();
    const input = fixture.nativeElement.querySelector(
      'input[formControlName="passwort"]',
    ) as HTMLInputElement;
    const button = fixture.nativeElement.querySelector('button[matSuffix]') as HTMLButtonElement;
    expect(input.type).toBe('password');
    expect(button.type).toBe('button');
    expect(button.getAttribute('aria-label')).toBe('Passwort anzeigen');
    button.click();
    fixture.detectChanges();
    expect(input.type).toBe('text');
    expect(button.getAttribute('aria-label')).toBe('Passwort ausblenden');
    button.click();
    fixture.detectChanges();
    expect(input.type).toBe('password');
    expect(input.value).toBe('SicheresPasswort123!');
    expect(TestBed.inject(BenutzerVerwaltungService).createBenutzer).not.toHaveBeenCalled();
  });

  it('should allow all optional areas to remain unselected', async () => {
    const daten = TestBed.inject(DatenzugriffService);
    vi.mocked(daten.loadUnternehmer).mockResolvedValue([{ id: 'u', anzeigename: 'Unternehmer' }]);
    vi.mocked(daten.loadFirmen).mockResolvedValue([{ id: 'f', anzeigename: 'Firma' }]);
    const fixture = TestBed.createComponent(BenutzerAnlage);
    async function render() {
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();
    }
    await render();
    const component = fixture.componentInstance;
    component.benutzerForm.patchValue({
      namensbestandteil: 'testbenutzer',
      anzeigename: 'Test Benutzer',
      userRole: 'mitarbeiter',
      passwort: 'SicheresPasswort123!',
      erlaubteBereiche: {
        schichtplan: false,
        mitarbeiter: false,
        verwaltung: false,
      },
    });
    await render();
    const auswahl = fixture.debugElement.query(By.directive(DatenzugriffSelector))
      .componentInstance as DatenzugriffSelector;
    auswahl.selectUnternehmer('u');
    await render();
    auswahl.selectFirmen([auswahl.getFirmaSchluessel('u', 'f')]);
    await render();
    component.benutzerForm.controls.firmaMitarbeiterId.setValue('m-1');
    component.handleMitarbeiterChange('m-1');

    expect(component.getBenutzerAnlage()?.erlaubteBereiche).toEqual(['dashboard']);
  });
  it('should submit the selected hierarchy only after the selection is complete', async () => {
    const daten = TestBed.inject(DatenzugriffService);
    vi.mocked(daten.loadUnternehmer).mockResolvedValue([{ id: 'u', anzeigename: 'Unternehmer' }]);
    vi.mocked(daten.loadFirmen).mockResolvedValue([{ id: 'f', anzeigename: 'Firma' }]);
    vi.mocked(daten.loadFilialen).mockResolvedValue([{ id: 'b', anzeigename: 'Filiale' }]);
    const fixture = TestBed.createComponent(BenutzerAnlage);
    async function render() {
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();
    }
    await render();
    fixture.componentInstance.benutzerForm.patchValue({
      namensbestandteil: 'test',
      anzeigename: 'Test',
      passwort: 'SicheresPasswort123!',
    });
    const component = fixture.debugElement.query(By.directive(DatenzugriffSelector))
      .componentInstance as DatenzugriffSelector;
    expect(component.unternehmer().map((u) => u.id)).toEqual(['u']);
    component.selectUnternehmer('u');
    await render();
    expect(fixture.componentInstance.getBenutzerAnlage()).toBeNull();
    await fixture.componentInstance.onSubmit();
    expect(TestBed.inject(BenutzerVerwaltungService).createBenutzer).not.toHaveBeenCalled();
    const key = component.getFirmaSchluessel('u', 'f');
    expect(component.firmen().map((f) => f.id)).toEqual([key]);
    component.selectFirmen([key]);
    await render();
    expect(fixture.componentInstance.getBenutzerAnlage()).toBeNull();
    await fixture.componentInstance.onSubmit();
    expect(TestBed.inject(BenutzerVerwaltungService).createBenutzer).not.toHaveBeenCalled();
    component.selectFiliale(key, 'b', true);
    await render();
    expect(fixture.componentInstance.verwaltungStore.filialen()).toEqual({ [key]: ['b'] });
    const auswahl = fixture.nativeElement.querySelector('app-datenzugriff-selector') as HTMLElement;
    expect(auswahl.closest('.pur-form__group')).not.toBeNull();
    expect(auswahl.closest('fieldset')).toBeNull();
    expect(auswahl.querySelectorAll('mat-select')).toHaveLength(3);
    expect(fixture.componentInstance.getBenutzerAnlage()?.zugriffe).toEqual({
      u: { f: ['b'] },
    });
    expect(fixture.nativeElement.querySelector('button[type="submit"]').disabled).toBe(false);
    await fixture.componentInstance.onSubmit();
    expect(TestBed.inject(BenutzerVerwaltungService).createBenutzer).toHaveBeenCalledWith(
      expect.objectContaining({
        zugriffe: { u: { f: ['b'] } },
      }),
    );
  });
  it('blocks duplicate submissions while saving and preserves input on failure', async () => {
    const fixture = TestBed.createComponent(BenutzerAnlage);
    fixture.detectChanges();
    await fixture.whenStable();
    const component = fixture.componentInstance;
    component.benutzerForm.patchValue({
      namensbestandteil: 'test',
      anzeigename: 'Test',
      userRole: 'master',
      passwort: 'SicheresPasswort123!',
    });
    const service = TestBed.inject(BenutzerVerwaltungService);
    let rejectSave!: (error: Error) => void;
    vi.mocked(service.createBenutzer).mockReturnValue(
      new Promise((_, reject) => {
        rejectSave = reject;
      }),
    );
    const pending = component.onSubmit();
    fixture.detectChanges();
    const form = fixture.nativeElement.querySelector('form') as HTMLFormElement;
    const anzeigename = fixture.nativeElement.querySelector(
      'input[formControlName="anzeigename"]',
    ) as HTMLInputElement;
    expect(component.benutzerForm.disabled).toBe(true);
    expect(anzeigename.disabled).toBe(true);
    expect(form.hasAttribute('inert')).toBe(true);
    expect(form.getAttribute('aria-busy')).toBe('true');
    expect(fixture.nativeElement.querySelector('button[type="submit"]').disabled).toBe(true);
    await component.onSubmit();
    expect(service.createBenutzer).toHaveBeenCalledTimes(1);
    rejectSave(new Error('Speichern fehlgeschlagen'));
    await pending;
    fixture.detectChanges();
    expect(component.benutzerForm.enabled).toBe(true);
    expect(anzeigename.disabled).toBe(false);
    expect(form.hasAttribute('inert')).toBe(false);
    expect(form.getAttribute('aria-busy')).toBe('false');
    expect(component.benutzerForm.controls.namensbestandteil.value).toBe('test');
    expect(component.verwaltungStore.error()).toBeTruthy();
    expect(fixture.nativeElement.querySelector('button[type="submit"]').disabled).toBe(false);
  });
  it.each(['office', 'filiale', 'mitarbeiter'] as const)(
    'keeps %s disabled without any data selection, including after a role change',
    async (userRole) => {
      const fixture = TestBed.createComponent(BenutzerAnlage);
      fixture.detectChanges();
      await fixture.whenStable();
      const component = fixture.componentInstance;
      component.benutzerForm.patchValue({
        namensbestandteil: 'test',
        anzeigename: 'Test',
        passwort: 'SicheresPasswort123!',
        userRole,
      });
      fixture.detectChanges();
      const button = fixture.nativeElement.querySelector('button[type="submit"]');
      expect(button.disabled).toBe(true);
      await component.onSubmit();
      expect(TestBed.inject(BenutzerVerwaltungService).createBenutzer).not.toHaveBeenCalled();
      component.benutzerForm.controls.userRole.setValue('master');
      fixture.detectChanges();
      expect(button.disabled).toBe(false);
      component.benutzerForm.controls.userRole.setValue(userRole);
      fixture.detectChanges();
      expect(button.disabled).toBe(true);
    },
  );
  it('recreates fixed selection modes and clears assignments when changing roles', async () => {
    const daten = TestBed.inject(DatenzugriffService);
    vi.mocked(daten.loadUnternehmer).mockResolvedValue([{ id: 'u', anzeigename: 'Unternehmer' }]);
    vi.mocked(daten.loadFirmen).mockResolvedValue([{ id: 'f', anzeigename: 'Firma' }]);
    vi.mocked(daten.loadFilialen).mockResolvedValue([
      { id: 'b1', anzeigename: 'Filiale 1' },
      { id: 'b2', anzeigename: 'Filiale 2' },
    ]);
    const fixture = TestBed.createComponent(BenutzerAnlage);
    const page = fixture.componentInstance;
    async function render() {
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();
    }
    await render();
    const initial = fixture.debugElement.query(By.directive(DatenzugriffSelector))
      .componentInstance as DatenzugriffSelector;
    expect(initial.unternehmerMehrfach()).toBe(false);
    expect(initial.firmenMehrfach()).toBe(false);
    expect(initial.filialenMehrfach()).toBe(false);
    page.benutzerForm.controls.userRole.setValue('office');
    await render();
    const office = fixture.debugElement.query(By.directive(DatenzugriffSelector))
      .componentInstance as DatenzugriffSelector;
    expect(office).not.toBe(initial);
    expect(office.unternehmerMehrfach()).toBe(false);
    expect(office.firmenMehrfach()).toBe(true);
    expect(office.filialenMehrfach()).toBe(true);
    office.selectUnternehmer('u');
    await render();
    const key = office.getFirmaSchluessel('u', 'f');
    office.selectFirmen([key]);
    await render();
    office.selectFiliale(key, 'b1', true);
    office.selectFiliale(key, 'b2', true);
    await render();
    expect(page.verwaltungStore.zugriffe()['u']['f']).toHaveLength(2);
    expect(page.datenAuswahlGueltig()).toBe(true);
    page.benutzerForm.controls.userRole.setValue('filiale');
    await render();
    expect(page.verwaltungStore.unternehmerIds()).toEqual([]);
    expect(page.verwaltungStore.zugriffe()).toEqual({});
    const branch = fixture.debugElement.query(By.directive(DatenzugriffSelector))
      .componentInstance as DatenzugriffSelector;
    expect(branch).not.toBe(office);
    expect(branch.filialenMehrfach()).toBe(false);
    expect(page.datenAuswahlGueltig()).toBe(false);
    // Auch die Seitenvalidierung weist eine manipulierte Mehrfachzuordnung ab.
    page.verwaltungStore.selectUnternehmer(['u']);
    await render();
    page.verwaltungStore.selectFirmen([key]);
    await render();
    page.verwaltungStore.selectFilialen({ [key]: ['b1', 'b2'] });
    expect(page.datenAuswahlGueltig()).toBe(false);
    page.benutzerForm.controls.userRole.setValue('master');
    await render();
    expect(fixture.debugElement.query(By.directive(DatenzugriffSelector))).toBeNull();
    expect(page.verwaltungStore.zugriffe()).toEqual({});
    expect(page.datenAuswahlGueltig()).toBe(true);
  });
});
