// pur-system/src/app/pages/systemverwaltung-page/datenmigration-page/datenmigration-page.spec.ts

import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import type { Timestamp } from 'firebase/firestore';

import {
  IDatenbereichMigrationDokument,
  TDatenmigrationsstatusMap,
} from '../../../commons/models/domain/datenmigration';
import { IPurCustomerEintrag } from '../../../commons/models/legacy/pur-customer';
import { DatenmigrationStore } from '../../../stores/domain/datenmigration.store';
import { DatenmigrationPage } from './datenmigration-page';

function createStatus(
  overrides: Partial<IDatenbereichMigrationDokument> = {},
): IDatenbereichMigrationDokument {
  const zeitstempel = {} as Timestamp;
  return {
    datenbereich: 'unternehmer',
    version: 1,
    status: 'inProgress',
    quellDokumente: 1,
    migrierteDokumente: 0,
    fehler: 0,
    probleme: [],
    gestartetAm: zeitstempel,
    abgeschlossenAm: null,
    aktualisiertAm: zeitstempel,
    ...overrides,
  };
}

describe('DatenmigrationPage', () => {
  const purCustomers: IPurCustomerEintrag[] = [
    { id: 'a', anzeigename: 'Alpha', daten: { displayName: 'Alpha' } },
    { id: 'b', anzeigename: 'Beta', daten: { displayName: 'Beta' } },
  ];
  let fixture: ComponentFixture<DatenmigrationPage>;
  let selectedPurCustomerId: ReturnType<typeof signal<string | null>>;
  let migrationsstatus: ReturnType<typeof signal<TDatenmigrationsstatusMap>>;
  let unternehmerZielDokumente: ReturnType<typeof signal<number | null>>;
  let firmenQuellDokumente: ReturnType<typeof signal<number | null>>;
  let firmenZielDokumente: ReturnType<typeof signal<number | null>>;
  let filialenQuellDokumente: ReturnType<typeof signal<number | null>>;
  let filialenZielDokumente: ReturnType<typeof signal<number | null>>;
  let mitarbeiterQuellDokumente: ReturnType<typeof signal<number | null>>;
  let mitarbeiterZielDokumente: ReturnType<typeof signal<number | null>>;
  let download: ReturnType<typeof signal<boolean>>;
  let isLoaded: ReturnType<typeof signal<boolean>>;
  let inProgress: ReturnType<typeof signal<boolean>>;
  let error: ReturnType<typeof signal<string | null>>;
  let datenmigrationStoreMock: {
    purCustomers: ReturnType<typeof signal<IPurCustomerEintrag[]>>;
    selectedPurCustomerId: typeof selectedPurCustomerId;
    migrationsstatus: typeof migrationsstatus;
    unternehmerZielDokumente: typeof unternehmerZielDokumente;
    firmenQuellDokumente: typeof firmenQuellDokumente;
    firmenZielDokumente: typeof firmenZielDokumente;
    filialenQuellDokumente: typeof filialenQuellDokumente;
    filialenZielDokumente: typeof filialenZielDokumente;
    mitarbeiterQuellDokumente: typeof mitarbeiterQuellDokumente;
    mitarbeiterZielDokumente: typeof mitarbeiterZielDokumente;
    download: typeof download;
    isLoaded: typeof isLoaded;
    inProgress: typeof inProgress;
    error: typeof error;
    loadPurCustomers: ReturnType<typeof vi.fn>;
    loadUnternehmerZiel: ReturnType<typeof vi.fn>;
    loadFirmenBestaende: ReturnType<typeof vi.fn>;
    loadFilialenBestaende: ReturnType<typeof vi.fn>;
    loadMitarbeiterBestaende: ReturnType<typeof vi.fn>;
    selectPurCustomer: ReturnType<typeof vi.fn>;
    migrateUnternehmer: ReturnType<typeof vi.fn>;
    migrateFirmen: ReturnType<typeof vi.fn>;
    migrateFilialen: ReturnType<typeof vi.fn>;
    migrateMitarbeiter: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    selectedPurCustomerId = signal<string | null>(null);
    migrationsstatus = signal<TDatenmigrationsstatusMap>({});
    unternehmerZielDokumente = signal<number | null>(null);
    firmenQuellDokumente = signal<number | null>(null);
    firmenZielDokumente = signal<number | null>(null);
    filialenQuellDokumente = signal<number | null>(null);
    filialenZielDokumente = signal<number | null>(null);
    mitarbeiterQuellDokumente = signal<number | null>(null);
    mitarbeiterZielDokumente = signal<number | null>(null);
    download = signal(false);
    isLoaded = signal(true);
    inProgress = signal(false);
    error = signal<string | null>(null);
    datenmigrationStoreMock = {
      purCustomers: signal(purCustomers),
      selectedPurCustomerId,
      migrationsstatus,
      unternehmerZielDokumente,
      firmenQuellDokumente,
      firmenZielDokumente,
      filialenQuellDokumente,
      filialenZielDokumente,
      mitarbeiterQuellDokumente,
      mitarbeiterZielDokumente,
      download,
      isLoaded,
      inProgress,
      error,
      loadPurCustomers: vi.fn().mockResolvedValue(undefined),
      loadUnternehmerZiel: vi.fn().mockImplementation(async () => {
        unternehmerZielDokumente.set(1);
      }),
      loadFirmenBestaende: vi.fn().mockImplementation(async () => {
        firmenQuellDokumente.set(2);
        firmenZielDokumente.set(3);
      }),
      loadFilialenBestaende: vi.fn().mockImplementation(async () => {
        filialenQuellDokumente.set(4);
        filialenZielDokumente.set(5);
      }),
      loadMitarbeiterBestaende: vi.fn().mockImplementation(async () => {
        mitarbeiterQuellDokumente.set(6);
        mitarbeiterZielDokumente.set(7);
      }),
      selectPurCustomer: vi.fn().mockImplementation(async (purCustomerId: string) => {
        selectedPurCustomerId.set(purCustomerId);
      }),
      migrateUnternehmer: vi.fn().mockResolvedValue(undefined),
      migrateFirmen: vi.fn().mockResolvedValue(undefined),
      migrateFilialen: vi.fn().mockResolvedValue(undefined),
      migrateMitarbeiter: vi.fn().mockResolvedValue(undefined),
    };

    await TestBed.configureTestingModule({
      imports: [DatenmigrationPage],
      providers: [{ provide: DatenmigrationStore, useValue: datenmigrationStoreMock }],
    }).compileComponents();

    fixture = TestBed.createComponent(DatenmigrationPage);
    fixture.detectChanges();
  });

  it('should load customers and render both selections without a migration card', () => {
    const compiled = fixture.nativeElement as HTMLElement;

    expect(datenmigrationStoreMock.loadPurCustomers).toHaveBeenCalledOnce();
    expect(
      Array.from(compiled.querySelectorAll('mat-label')).map((label) => label.textContent),
    ).toEqual(
      expect.arrayContaining([
        expect.stringContaining('Legacy-Kunde'),
        expect.stringContaining('Migrationsbereich'),
      ]),
    );
    expect(fixture.componentInstance.migrationsbereiche.map((bereich) => bereich.label)).toEqual([
      'Unternehmer',
      'Firmen',
      'Filialen',
      'Mitarbeiter',
    ]);
    expect(fixture.componentInstance.migrationsbereiche.map((bereich) => bereich.pfad)).toEqual([
      'Root / unternehmer',
      'unternehmer / firma',
      'firma / filiale',
      'firma / mitarbeiter',
    ]);
    expect(compiled.querySelector('mat-card')).toBeNull();
    expect(compiled.textContent).not.toContain('alle Legacy-Kunden migrieren');
  });

  it('should select one customer and render its entrepreneur migration card', async () => {
    await fixture.componentInstance.handlePurCustomerSelect('b');
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;

    expect(datenmigrationStoreMock.selectPurCustomer).toHaveBeenCalledWith('b');
    expect(datenmigrationStoreMock.loadUnternehmerZiel).toHaveBeenCalledOnce();
    expect(compiled.querySelector('mat-card-title')?.textContent).toContain(
      'Unternehmer migrieren',
    );
    expect(compiled.querySelector('mat-card-subtitle')?.textContent).toContain('Beta');
    expect(compiled.textContent).toContain('Ausstehend');
    expect(compiled.textContent).toContain('Quelle');
  });

  it('should migrate only the currently selected customer', async () => {
    selectedPurCustomerId.set('a');
    fixture.detectChanges();
    const button = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>(
      '.datenmigration-page__migration-button',
    );

    button?.click();
    await fixture.whenStable();

    expect(datenmigrationStoreMock.migrateUnternehmer).toHaveBeenCalledOnce();
  });

  it('should load the company source and block migration until the entrepreneur is complete', async () => {
    selectedPurCustomerId.set('a');
    await fixture.componentInstance.handleMigrationsbereichSelect('firmen');
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const button = compiled.querySelector<HTMLButtonElement>(
      '.datenmigration-page__migration-button',
    );

    expect(compiled.querySelector('mat-card-title')?.textContent).toContain('Firmen migrieren');
    expect(compiled.querySelector('mat-card-subtitle')?.textContent).toContain('Alpha');
    expect(datenmigrationStoreMock.loadFirmenBestaende).toHaveBeenCalledOnce();
    expect(compiled.textContent).toContain('2');
    expect(compiled.textContent).toContain('Migriere zuerst den Unternehmer');
    expect(button?.disabled).toBe(true);
  });

  it('should migrate companies after the entrepreneur migration is complete', async () => {
    selectedPurCustomerId.set('a');
    migrationsstatus.set({ unternehmer: createStatus({ status: 'completed' }) });
    await fixture.componentInstance.handleMigrationsbereichSelect('firmen');
    fixture.detectChanges();
    const button = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>(
      '.datenmigration-page__migration-button',
    );

    button?.click();
    await fixture.whenStable();

    expect(button?.disabled).toBe(false);
    expect(datenmigrationStoreMock.migrateFirmen).toHaveBeenCalledOnce();
  });

  it('should derive open documents from the current source count and the stored migration count', async () => {
    selectedPurCustomerId.set('a');
    migrationsstatus.set({
      unternehmer: createStatus({ status: 'completed' }),
      firmen: createStatus({
        datenbereich: 'firmen',
        status: 'completed',
        quellDokumente: 1,
        migrierteDokumente: 1,
      }),
    });
    await fixture.componentInstance.handleMigrationsbereichSelect('firmen');
    fixture.detectChanges();

    expect(fixture.componentInstance.quellDokumente()).toBe(2);
    expect(fixture.componentInstance.offeneDokumente()).toBe(1);
    expect(fixture.componentInstance.zielDokumente()).toBe(3);
  });

  it('should load the branch source and block migration until companies are complete', async () => {
    selectedPurCustomerId.set('a');
    await fixture.componentInstance.handleMigrationsbereichSelect('filialen');
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const button = compiled.querySelector<HTMLButtonElement>(
      '.datenmigration-page__migration-button',
    );

    expect(compiled.querySelector('mat-card-title')?.textContent).toContain('Filialen migrieren');
    expect(datenmigrationStoreMock.loadFilialenBestaende).toHaveBeenCalledOnce();
    expect(compiled.textContent).toContain('4');
    expect(compiled.textContent).toContain('Migriere zuerst die Firmen');
    expect(button?.disabled).toBe(true);
  });

  it('should migrate branches after the company migration is complete', async () => {
    selectedPurCustomerId.set('a');
    migrationsstatus.set({ firmen: createStatus({ status: 'completed' }) });
    await fixture.componentInstance.handleMigrationsbereichSelect('filialen');
    fixture.detectChanges();
    const button = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>(
      '.datenmigration-page__migration-button',
    );

    button?.click();
    await fixture.whenStable();

    expect(button?.disabled).toBe(false);
    expect(datenmigrationStoreMock.migrateFilialen).toHaveBeenCalledOnce();
  });

  it('should load the employee source and block migration until branches are complete', async () => {
    selectedPurCustomerId.set('a');
    await fixture.componentInstance.handleMigrationsbereichSelect('mitarbeiter');
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const button = compiled.querySelector<HTMLButtonElement>(
      '.datenmigration-page__migration-button',
    );

    expect(compiled.querySelector('mat-card-title')?.textContent).toContain(
      'Mitarbeiter migrieren',
    );
    expect(datenmigrationStoreMock.loadMitarbeiterBestaende).toHaveBeenCalledOnce();
    expect(fixture.componentInstance.quellDokumente()).toBe(6);
    expect(fixture.componentInstance.zielDokumente()).toBe(7);
    expect(compiled.textContent).toContain('Migriere zuerst die Filialen');
    expect(button?.disabled).toBe(true);
  });

  it('should migrate employees after the branch migration is complete', async () => {
    selectedPurCustomerId.set('a');
    migrationsstatus.set({ filialen: createStatus({ status: 'completed' }) });
    await fixture.componentInstance.handleMigrationsbereichSelect('mitarbeiter');
    fixture.detectChanges();
    const button = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>(
      '.datenmigration-page__migration-button',
    );

    button?.click();
    await fixture.whenStable();

    expect(button?.disabled).toBe(false);
    expect(datenmigrationStoreMock.migrateMitarbeiter).toHaveBeenCalledOnce();
  });

  it('should allow a completed migration to run again and show its result counts', async () => {
    selectedPurCustomerId.set('a');
    migrationsstatus.set({
      unternehmer: createStatus({
        status: 'completed',
        migrierteDokumente: 1,
      }),
    });
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const button = compiled.querySelector<HTMLButtonElement>(
      '.datenmigration-page__migration-button',
    );

    expect(compiled.textContent).toContain('Abgeschlossen');
    expect(compiled.textContent).toContain('Offen');
    expect(compiled.textContent).toContain('Ziel');
    expect(
      Array.from(compiled.querySelectorAll('.datenmigration-page__status dt')).map((element) =>
        element.textContent?.trim(),
      ),
    ).toEqual(['Status', 'Quelle', 'Migriert', 'Fehler', 'Offen', 'Ziel']);
    expect(compiled.textContent).not.toContain('Bereits migriert');
    expect(compiled.textContent).not.toContain('Konflikte');
    expect(button?.disabled).toBe(false);
    expect(button?.textContent).toContain('Erneut migrieren');

    button?.click();
    await fixture.whenStable();

    expect(datenmigrationStoreMock.migrateUnternehmer).toHaveBeenCalledOnce();
  });

  it('should show migration problems with their source path', () => {
    selectedPurCustomerId.set('a');
    migrationsstatus.set({
      unternehmer: createStatus({
        status: 'failed',
        fehler: 1,
        probleme: [
          {
            typ: 'fehler',
            quellPfad: 'purCustomers/a',
            ursache: 'Die Adresse ist unvollständig.',
          },
        ],
      }),
    });
    fixture.detectChanges();
    const text = fixture.nativeElement.textContent;

    expect(text).toContain('Fehlgeschlagen');
    expect(text).toContain('Die Adresse ist unvollständig.');
    expect(text).toContain('purCustomers/a');
  });

  it('should disable migration while loading or writing', () => {
    selectedPurCustomerId.set('a');
    inProgress.set(true);
    fixture.detectChanges();
    const button = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>(
      '.datenmigration-page__migration-button',
    );

    expect(button?.disabled).toBe(true);
    expect(button?.textContent).toContain('Migration läuft');
  });
});
