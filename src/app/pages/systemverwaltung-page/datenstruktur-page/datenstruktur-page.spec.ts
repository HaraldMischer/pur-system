// pur-system/src/app/pages/systemverwaltung-page/datenstruktur-page/datenstruktur-page.spec.ts

import { BreakpointObserver, BreakpointState } from '@angular/cdk/layout';
import { signal, WritableSignal } from '@angular/core';
import { MatStepper } from '@angular/material/stepper';
import { MatDialog } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { By } from '@angular/platform-browser';
import { TestBed } from '@angular/core/testing';
import { BehaviorSubject, of } from 'rxjs';

import { FirmaStore } from '../../../stores/domain/firma.store';
import { FilialeStore } from '../../../stores/domain/filiale.store';
import { UnternehmerStore } from '../../../stores/domain/unternehmer.store';
import { DatenstrukturPage } from './datenstruktur-page';
import { FirmaAnlegenDialog } from './firma-anlegen-dialog/firma-anlegen-dialog';
import { FilialeAnlegenDialog } from './filiale-anlegen-dialog/filiale-anlegen-dialog';
import { UnternehmerAnlegenDialog } from './unternehmer-anlegen-dialog/unternehmer-anlegen-dialog';

describe('DatenstrukturPage', () => {
  const breakpointState = new BehaviorSubject<BreakpointState>({
    matches: false,
    breakpoints: {},
  });
  let dialogOpenMock: ReturnType<typeof vi.fn>;
  let firmaStoreMock: {
    firmen: WritableSignal<readonly { id: string; anzeigename: string; nummer: number }[]>;
    unternehmerId: WritableSignal<string | null>;
    download: WritableSignal<boolean>;
    isLoaded: WritableSignal<boolean>;
    error: WritableSignal<string | null>;
    loadFirmen: ReturnType<typeof vi.fn>;
    resetFirmen: ReturnType<typeof vi.fn>;
    clearError: ReturnType<typeof vi.fn>;
  };
  let filialeStoreMock: {
    filialen: WritableSignal<readonly { id: string; anzeigename: string; nummer: number }[]>;
    unternehmerId: WritableSignal<string | null>;
    firmaId: WritableSignal<string | null>;
    download: WritableSignal<boolean>;
    isLoaded: WritableSignal<boolean>;
    error: WritableSignal<string | null>;
    loadFilialen: ReturnType<typeof vi.fn>;
    resetFilialen: ReturnType<typeof vi.fn>;
    clearError: ReturnType<typeof vi.fn>;
  };
  let unternehmerStoreMock: {
    unternehmer: WritableSignal<readonly { id: string; anzeigename: string; nummer: number }[]>;
    download: WritableSignal<boolean>;
    isLoaded: WritableSignal<boolean>;
    error: WritableSignal<string | null>;
    loadUnternehmer: ReturnType<typeof vi.fn>;
    clearError: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    breakpointState.next({ matches: false, breakpoints: {} });
    dialogOpenMock = vi.fn().mockReturnValue({ afterClosed: () => of(undefined) });
    firmaStoreMock = {
      firmen: signal([{ id: 'firma-1', anzeigename: 'Firma Nord', nummer: 1 }]),
      unternehmerId: signal(null),
      download: signal(false),
      isLoaded: signal(false),
      error: signal(null),
      loadFirmen: vi.fn().mockImplementation(async (unternehmerId: string) => {
        firmaStoreMock.unternehmerId.set(unternehmerId);
        firmaStoreMock.isLoaded.set(true);
      }),
      resetFirmen: vi.fn().mockImplementation(() => {
        firmaStoreMock.unternehmerId.set(null);
        firmaStoreMock.isLoaded.set(false);
      }),
      clearError: vi.fn(),
    };
    filialeStoreMock = {
      filialen: signal([{ id: 'filiale-1', anzeigename: 'Filiale Hamburg', nummer: 1 }]),
      unternehmerId: signal(null),
      firmaId: signal(null),
      download: signal(false),
      isLoaded: signal(false),
      error: signal(null),
      loadFilialen: vi.fn().mockImplementation(async (unternehmerId: string, firmaId: string) => {
        filialeStoreMock.unternehmerId.set(unternehmerId);
        filialeStoreMock.firmaId.set(firmaId);
        filialeStoreMock.isLoaded.set(true);
      }),
      resetFilialen: vi.fn().mockImplementation(() => {
        filialeStoreMock.unternehmerId.set(null);
        filialeStoreMock.firmaId.set(null);
        filialeStoreMock.isLoaded.set(false);
      }),
      clearError: vi.fn(),
    };
    unternehmerStoreMock = {
      unternehmer: signal([{ id: 'unternehmer-1', anzeigename: 'Unternehmer Nord', nummer: 1 }]),
      download: signal(false),
      isLoaded: signal(true),
      error: signal(null),
      loadUnternehmer: vi.fn().mockResolvedValue(undefined),
      clearError: vi.fn(),
    };
    await TestBed.configureTestingModule({
      imports: [DatenstrukturPage, NoopAnimationsModule],
      providers: [
        {
          provide: BreakpointObserver,
          useValue: { observe: vi.fn(() => breakpointState.asObservable()) },
        },
        { provide: MatDialog, useValue: { open: dialogOpenMock } },
        { provide: FirmaStore, useValue: firmaStoreMock },
        { provide: FilialeStore, useValue: filialeStoreMock },
        { provide: UnternehmerStore, useValue: unternehmerStoreMock },
      ],
    }).compileComponents();
  });

  it('should render three linear steps with separate creation actions', () => {
    const fixture = TestBed.createComponent(DatenstrukturPage);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const stepper = fixture.debugElement.query(By.directive(MatStepper))
      .componentInstance as MatStepper;

    expect(compiled.classList).toContain('pur-page');
    expect(compiled.classList).toContain('pur-page--limited');
    expect(stepper.linear).toBe(true);
    expect(compiled.querySelectorAll('mat-step-header')).toHaveLength(3);
    expect(
      Array.from(compiled.querySelectorAll('button')).some(
        (button) => button.textContent?.trim() === 'Datenstruktur anlegen',
      ),
    ).toBe(false);
    expect(compiled.textContent).not.toContain('Das Speichern in Firestore');
  });

  it('should require an existing entrepreneur selection', () => {
    const component = TestBed.createComponent(DatenstrukturPage).componentInstance;

    expect(component.unternehmerForm.invalid).toBe(true);
    expect(component.unternehmerForm.controls.id.hasError('required')).toBe(true);

    component.unternehmerForm.controls.id.setValue('unternehmer-1');
    expect(component.unternehmerForm.valid).toBe(true);
  });

  it('should enable entrepreneur creation only after the list was loaded', () => {
    unternehmerStoreMock.isLoaded.set(false);
    const fixture = TestBed.createComponent(DatenstrukturPage);
    fixture.detectChanges();
    const getAnlegenButton = () =>
      Array.from(
        fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>,
      ).find((button) => button.textContent?.includes('Unternehmer anlegen'));

    expect(getAnlegenButton()?.disabled).toBe(true);

    unternehmerStoreMock.isLoaded.set(true);
    fixture.detectChanges();

    expect(getAnlegenButton()?.disabled).toBe(false);
  });

  it('should open the entrepreneur dialog and select the created entrepreneur', async () => {
    dialogOpenMock.mockReturnValue({
      afterClosed: () =>
        of({
          id: 'unternehmer-neu',
          nummer: 2,
          anzeigename: 'Unternehmer Neu',
        }),
    });
    const component = TestBed.createComponent(DatenstrukturPage).componentInstance;

    await component.openUnternehmerDialog();

    expect(unternehmerStoreMock.clearError).toHaveBeenCalled();
    expect(dialogOpenMock).toHaveBeenCalledWith(UnternehmerAnlegenDialog, {
      panelClass: ['pur-dialog__panel'],
    });
    expect(component.unternehmerForm.controls.id.value).toBe('unternehmer-neu');
    expect(component.unternehmerForm.valid).toBe(true);
  });

  it('should load companies for the selected entrepreneur and reset dependent forms', async () => {
    const fixture = TestBed.createComponent(DatenstrukturPage);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    component.firmaForm.controls.id.setValue('firma-alt');
    component.filialeForm.controls.id.setValue('filiale-alt');

    component.unternehmerForm.controls.id.setValue('unternehmer-1');
    await fixture.whenStable();
    fixture.detectChanges();

    expect(firmaStoreMock.loadFirmen).toHaveBeenCalledWith('unternehmer-1');
    expect(filialeStoreMock.resetFilialen).toHaveBeenCalled();
    expect(component.firmaForm.controls.id.value).toBe('');
    expect(component.filialeForm.controls.id.value).toBe('');
    expect(component.firmaForm.controls.id.enabled).toBe(true);
  });

  it('should open the company dialog and select the created company', async () => {
    dialogOpenMock.mockReturnValue({
      afterClosed: () => of({ id: 'firma-neu', nummer: 2, anzeigename: 'Firma Neu' }),
    });
    const fixture = TestBed.createComponent(DatenstrukturPage);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    component.unternehmerForm.controls.id.setValue('unternehmer-1');
    await fixture.whenStable();
    fixture.detectChanges();

    await component.openFirmaDialog();

    expect(firmaStoreMock.clearError).toHaveBeenCalled();
    expect(dialogOpenMock).toHaveBeenCalledWith(FirmaAnlegenDialog, {
      data: { unternehmerId: 'unternehmer-1' },
      panelClass: ['pur-dialog__panel'],
    });
    expect(component.firmaForm.controls.id.value).toBe('firma-neu');
    expect(component.firmaForm.valid).toBe(true);
  });

  it('should load branches for the selected company and reset the branch selection', async () => {
    const fixture = TestBed.createComponent(DatenstrukturPage);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    component.unternehmerForm.controls.id.setValue('unternehmer-1');
    await fixture.whenStable();
    component.filialeForm.controls.id.setValue('filiale-alt');

    component.firmaForm.controls.id.setValue('firma-1');
    await fixture.whenStable();

    expect(filialeStoreMock.loadFilialen).toHaveBeenCalledWith('unternehmer-1', 'firma-1');
    expect(component.filialeForm.controls.id.value).toBe('');
  });

  it('should open the branch dialog and select the created branch', async () => {
    dialogOpenMock.mockReturnValue({
      afterClosed: () => of({ id: 'filiale-neu', nummer: 2, anzeigename: 'Filiale Neu' }),
    });
    const fixture = TestBed.createComponent(DatenstrukturPage);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    component.unternehmerForm.controls.id.setValue('unternehmer-1');
    await fixture.whenStable();
    component.firmaForm.controls.id.setValue('firma-1');
    await fixture.whenStable();

    await component.openFilialeDialog();

    expect(filialeStoreMock.clearError).toHaveBeenCalled();
    expect(dialogOpenMock).toHaveBeenCalledWith(FilialeAnlegenDialog, {
      data: { unternehmerId: 'unternehmer-1', firmaId: 'firma-1' },
      panelClass: ['pur-dialog__panel'],
    });
    expect(component.filialeForm.controls.id.value).toBe('filiale-neu');
    expect(component.filialeForm.valid).toBe(true);
  });

  it('should move forward only after valid input and show the selected hierarchy', async () => {
    const fixture = TestBed.createComponent(DatenstrukturPage);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    const stepper = fixture.debugElement.query(By.directive(MatStepper))
      .componentInstance as MatStepper;
    const next = () =>
      fixture.nativeElement.querySelector('button[matStepperNext]') as HTMLButtonElement;

    expect(next().disabled).toBe(true);
    component.unternehmerForm.controls.id.setValue('unternehmer-1');
    fixture.detectChanges();
    expect(next().disabled).toBe(false);
    next().click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(stepper.selectedIndex).toBe(1);

    component.firmaForm.controls.id.setValue('firma-1');
    await fixture.whenStable();
    fixture.detectChanges();
    next().click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(stepper.selectedIndex).toBe(2);

    component.filialeForm.controls.id.setValue('filiale-1');
    fixture.detectChanges();
    const zusammenfassung = fixture.nativeElement.querySelector(
      '.pur-page-section__summary',
    ) as HTMLElement;
    expect(zusammenfassung.textContent).toContain('Unternehmer Nord');
    expect(zusammenfassung.textContent).toContain('Firma Nord');
    expect(zusammenfassung.textContent).toContain('Filiale Hamburg');
  });

  it('should use vertical orientation on small screens', () => {
    const fixture = TestBed.createComponent(DatenstrukturPage);
    fixture.detectChanges();
    expect(fixture.componentInstance.stepperOrientation()).toBe('horizontal');

    breakpointState.next({ matches: true, breakpoints: {} });
    fixture.detectChanges();
    expect(fixture.componentInstance.stepperOrientation()).toBe('vertical');
  });
});
