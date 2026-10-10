// pur-system/src/app/components/schichtplan/dienstplan-arbeitsbereich/dienstplan-arbeitsbereich.spec.ts

import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';

import { IBenutzerProfilDokument } from '../../../commons/models/domain/benutzer';
import { IMitarbeiterEintrag } from '../../../commons/models/domain/mitarbeiter';
import { AppKontextStore } from '../../../stores/app/app-kontext.store';
import { BenutzerStore } from '../../../stores/app/benutzer.store';
import { DienstplanStore } from '../../../stores/domain/dienstplan.store';
import { MitarbeiterStore } from '../../../stores/domain/mitarbeiter.store';
import { SchichtvorlageStore } from '../../../stores/domain/schichtvorlage.store';
import { DienstplanArbeitsbereich } from './dienstplan-arbeitsbereich';

describe('DienstplanArbeitsbereich', () => {
  const selectedUnternehmer = signal<{ id: string } | null>({ id: 'u-1' });
  const selectedFirma = signal<{ id: string } | null>({ id: 'f-1' });
  const selectedFiliale = signal<{ id: string } | null>({ id: 'b-1' });
  const benutzerProfil = signal<IBenutzerProfilDokument>({
    email: 'office@example.com',
    anzeigename: 'Office',
    aktiv: true,
    userRole: 'office' as const,
    erlaubteBereiche: ['dashboard', 'schichtplan'],
    zugriffe: { 'u-1': { 'f-1': ['b-1'] } },
  });
  const download = signal(false);
  const isLoaded = signal(true);
  const selectedKontext = signal<{ error: string | null } | null>({ error: null });
  const selectedDienstplan = signal(null);
  const selectedVersionen = signal([]);
  const selectedSchichten = signal([]);
  const inProgress = signal(false);
  const error = signal<string | null>(null);
  const storeInternerStatus = signal(0);
  const createDienstplanMock = vi.fn().mockResolvedValue(undefined);
  const loadDienstplanMonatMock = vi.fn().mockResolvedValue(undefined);
  const loadSchichtvorlagenMock = vi.fn().mockResolvedValue(undefined);
  const selectDienstplanMock = vi.fn();
  const getMitarbeiterMock = vi.fn().mockReturnValue([] as IMitarbeiterEintrag[]);

  beforeEach(async () => {
    selectedUnternehmer.set({ id: 'u-1' });
    selectedFirma.set({ id: 'f-1' });
    selectedFiliale.set({ id: 'b-1' });
    benutzerProfil.set({
      email: 'office@example.com',
      anzeigename: 'Office',
      aktiv: true,
      userRole: 'office',
      erlaubteBereiche: ['dashboard', 'schichtplan'],
      zugriffe: { 'u-1': { 'f-1': ['b-1'] } },
    });
    error.set(null);
    storeInternerStatus.set(0);
    getMitarbeiterMock.mockReturnValue([]);
    createDienstplanMock.mockResolvedValue(undefined);
    loadDienstplanMonatMock.mockImplementation(() => {
      storeInternerStatus();
      return Promise.resolve();
    });
    vi.clearAllMocks();
    await TestBed.configureTestingModule({
      imports: [DienstplanArbeitsbereich],
      providers: [
        {
          provide: AppKontextStore,
          useValue: { selectedUnternehmer, selectedFirma, selectedFiliale },
        },
        { provide: BenutzerStore, useValue: { benutzerProfil } },
        {
          provide: DienstplanStore,
          useValue: {
            download,
            isLoaded,
            selectedKontext,
            selectedDienstplan,
            selectedVersionen,
            selectedSchichten,
            inProgress,
            error,
            createDienstplan: createDienstplanMock,
            loadDienstplanMonat: loadDienstplanMonatMock,
            selectDienstplan: selectDienstplanMock,
          },
        },
        {
          provide: MitarbeiterStore,
          useValue: {
            getMitarbeiter: getMitarbeiterMock,
            getMitarbeiterById: vi.fn().mockReturnValue(null),
          },
        },
        {
          provide: SchichtvorlageStore,
          useValue: {
            schichtvorlagen: signal([]),
            download: signal(false),
            isLoaded: signal(true),
            error: signal(null),
            loadSchichtvorlagen: loadSchichtvorlagenMock,
          },
        },
        { provide: MatDialog, useValue: { open: vi.fn() } },
      ],
    }).compileComponents();
  });

  it('should create the page', () => {
    const fixture = TestBed.createComponent(DienstplanArbeitsbereich);

    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should load the selected branch and render the empty month', async () => {
    const fixture = TestBed.createComponent(DienstplanArbeitsbereich);
    fixture.componentRef.setInput('planungsmodus', true);
    fixture.detectChanges();
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelector('h1')).toBeNull();
    expect(compiled.textContent).toContain('Für diesen Monat ist noch kein Dienstplan vorhanden.');
    expect(compiled.textContent).toContain('Dienstplan anlegen');
    expect(loadDienstplanMonatMock).toHaveBeenCalledWith(
      { unternehmerId: 'u-1', firmaId: 'f-1', filialeId: 'b-1' },
      fixture.componentInstance.selectedMonat(),
      false,
    );
    expect(loadSchichtvorlagenMock).toHaveBeenCalledWith({
      unternehmerId: 'u-1',
      firmaId: 'f-1',
      filialeId: 'b-1',
    });
  });

  it('should select active branch employees from the loaded company context', () => {
    const aktiverMitarbeiter: IMitarbeiterEintrag = {
      id: 'm-1',
      unternehmerId: 'u-1',
      firmaId: 'f-1',
      person: {
        vorname: 'Mia',
        nachname: 'Muster',
        adresse: {
          strasse: 'Musterstraße',
          hausnummer: '1',
          postleitzahl: '12345',
          ort: 'Musterstadt',
        },
        kontakt: {},
      },
      rollen: [],
      filialIds: ['b-1'],
      aktiv: true,
    };
    getMitarbeiterMock.mockReturnValue([
      aktiverMitarbeiter,
      { ...aktiverMitarbeiter, id: 'm-inaktiv', aktiv: false },
      { ...aktiverMitarbeiter, id: 'm-andere-filiale', filialIds: ['b-2'] },
    ]);
    const fixture = TestBed.createComponent(DienstplanArbeitsbereich);

    expect(fixture.componentInstance.mitarbeiter()).toEqual([aktiverMitarbeiter]);
    expect(getMitarbeiterMock).toHaveBeenCalledWith('u-1', 'f-1');
  });

  it('should keep the empty monthly view read-only outside planning mode', async () => {
    const fixture = TestBed.createComponent(DienstplanArbeitsbereich);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.nativeElement.textContent).toContain(
      'Für diesen Monat ist noch kein Dienstplan vorhanden.',
    );
    expect(fixture.nativeElement.textContent).not.toContain('Dienstplan anlegen');
  });

  it('should keep the empty month actionable and show a failed plan creation', async () => {
    createDienstplanMock.mockImplementationOnce(async () => {
      error.set('Der Dienstplan konnte nicht angelegt werden.');
      throw new Error('Der Dienstplan konnte nicht angelegt werden.');
    });
    const fixture = TestBed.createComponent(DienstplanArbeitsbereich);
    fixture.componentRef.setInput('planungsmodus', true);
    fixture.detectChanges();
    await fixture.whenStable();

    const button = [...(fixture.nativeElement as HTMLElement).querySelectorAll('button')].find(
      (eintrag) => eintrag.textContent?.trim() === 'Dienstplan anlegen',
    );
    button?.click();
    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(createDienstplanMock).toHaveBeenCalledOnce();
    expect(compiled.querySelector('[role="alert"]')?.textContent).toContain(
      'Der Dienstplan konnte nicht angelegt werden.',
    );
    expect(button?.disabled).toBe(false);
  });

  it('should not reload when an internal store signal changes', async () => {
    const fixture = TestBed.createComponent(DienstplanArbeitsbereich);
    fixture.detectChanges();
    await fixture.whenStable();

    storeInternerStatus.set(1);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(loadDienstplanMonatMock).toHaveBeenCalledOnce();
  });

  it('should require a concrete branch', () => {
    selectedFiliale.set(null);
    const fixture = TestBed.createComponent(DienstplanArbeitsbereich);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain(
      'Wähle eine konkrete Filiale, um ihren Dienstplan anzuzeigen.',
    );
    expect(loadDienstplanMonatMock).not.toHaveBeenCalled();
  });

  it('should derive the branch profile path without a visible selection', async () => {
    selectedUnternehmer.set(null);
    selectedFirma.set(null);
    selectedFiliale.set(null);
    benutzerProfil.set({
      email: 'filiale@example.com',
      anzeigename: 'Filiale',
      aktiv: true,
      userRole: 'filiale',
      erlaubteBereiche: ['dashboard', 'schichtplan'],
      zugriffe: { 'u-2': { 'f-2': ['b-2'] } },
    });
    const fixture = TestBed.createComponent(DienstplanArbeitsbereich);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(loadDienstplanMonatMock).toHaveBeenCalledWith(
      { unternehmerId: 'u-2', firmaId: 'f-2', filialeId: 'b-2' },
      fixture.componentInstance.selectedMonat(),
      false,
    );
    expect(fixture.nativeElement.textContent).not.toContain('Dienstplan anlegen');
  });

  it('should load only the published monthly view for employee accounts', async () => {
    benutzerProfil.set({
      email: 'mitarbeiter@example.com',
      anzeigename: 'Mitarbeiter',
      aktiv: true,
      userRole: 'mitarbeiter',
      erlaubteBereiche: ['dashboard', 'schichtplan'],
      zugriffe: { 'u-1': { 'f-1': [] } },
    });
    const fixture = TestBed.createComponent(DienstplanArbeitsbereich);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(loadDienstplanMonatMock).toHaveBeenCalledWith(
      { unternehmerId: 'u-1', firmaId: 'f-1', filialeId: 'b-1' },
      fixture.componentInstance.selectedMonat(),
      true,
    );
  });

  it('should change the selected month across year boundaries', () => {
    const fixture = TestBed.createComponent(DienstplanArbeitsbereich);
    fixture.componentInstance.selectedMonat.set('2026-01');

    fixture.componentInstance.changeMonat(-1);

    expect(fixture.componentInstance.selectedMonat()).toBe('2025-12');
  });
});
