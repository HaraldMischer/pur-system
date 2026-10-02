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
    bereitsMigrierteDokumente: 0,
    konflikte: 0,
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
  let download: ReturnType<typeof signal<boolean>>;
  let isLoaded: ReturnType<typeof signal<boolean>>;
  let inProgress: ReturnType<typeof signal<boolean>>;
  let error: ReturnType<typeof signal<string | null>>;
  let datenmigrationStoreMock: {
    purCustomers: ReturnType<typeof signal<IPurCustomerEintrag[]>>;
    selectedPurCustomerId: typeof selectedPurCustomerId;
    migrationsstatus: typeof migrationsstatus;
    download: typeof download;
    isLoaded: typeof isLoaded;
    inProgress: typeof inProgress;
    error: typeof error;
    loadPurCustomers: ReturnType<typeof vi.fn>;
    selectPurCustomer: ReturnType<typeof vi.fn>;
    migrateUnternehmer: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    selectedPurCustomerId = signal<string | null>(null);
    migrationsstatus = signal<TDatenmigrationsstatusMap>({});
    download = signal(false);
    isLoaded = signal(true);
    inProgress = signal(false);
    error = signal<string | null>(null);
    datenmigrationStoreMock = {
      purCustomers: signal(purCustomers),
      selectedPurCustomerId,
      migrationsstatus,
      download,
      isLoaded,
      inProgress,
      error,
      loadPurCustomers: vi.fn().mockResolvedValue(undefined),
      selectPurCustomer: vi.fn().mockImplementation(async (purCustomerId: string) => {
        selectedPurCustomerId.set(purCustomerId);
      }),
      migrateUnternehmer: vi.fn().mockResolvedValue(undefined),
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
    expect(compiled.querySelector('mat-card')).toBeNull();
    expect(compiled.textContent).not.toContain('alle Legacy-Kunden migrieren');
  });

  it('should select one customer and render its entrepreneur migration card', async () => {
    await fixture.componentInstance.handlePurCustomerSelect('b');
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;

    expect(datenmigrationStoreMock.selectPurCustomer).toHaveBeenCalledWith('b');
    expect(compiled.querySelector('mat-card-title')?.textContent).toContain(
      'Unternehmer migrieren',
    );
    expect(compiled.querySelector('mat-card-subtitle')?.textContent).toContain('Beta');
    expect(compiled.textContent).toContain('Noch nicht migriert');
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

  it('should render a placeholder card for a future migration area', () => {
    selectedPurCustomerId.set('a');
    fixture.componentInstance.handleMigrationsbereichSelect('firmen');
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelector('mat-card-title')?.textContent).toContain('Firmen migrieren');
    expect(compiled.querySelector('mat-card-subtitle')?.textContent).toContain('Alpha');
    expect(compiled.textContent).toContain(
      'Die Migration dieses Datenbereichs ist noch nicht umgesetzt.',
    );
    expect(compiled.querySelector('.datenmigration-page__migration-button')).toBeNull();
  });

  it('should disable a completed migration and show its result counts', () => {
    selectedPurCustomerId.set('a');
    migrationsstatus.set({
      unternehmer: createStatus({
        status: 'completed',
        bereitsMigrierteDokumente: 1,
      }),
    });
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const button = compiled.querySelector<HTMLButtonElement>(
      '.datenmigration-page__migration-button',
    );

    expect(compiled.textContent).toContain('Abgeschlossen');
    expect(compiled.textContent).toContain('Bereits migriert');
    expect(button?.disabled).toBe(true);
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
