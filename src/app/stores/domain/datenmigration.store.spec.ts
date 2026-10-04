// pur-system/src/app/stores/domain/datenmigration.store.spec.ts

import { TestBed } from '@angular/core/testing';

import { IDatenbereichMigrationDokument } from '../../commons/models/domain/datenmigration';
import { IPurCustomerEintrag } from '../../commons/models/legacy/pur-customer';
import { DebugLogService } from '../../services/core/debug-log.service';
import { StoreSnapshotService } from '../../services/core/store-snapshot.service';
import { DatenmigrationService } from '../../services/domain/datenmigration.service';
import { DatenmigrationStore } from './datenmigration.store';

describe('DatenmigrationStore', () => {
  const purCustomers: IPurCustomerEintrag[] = [
    { id: 'a', anzeigename: 'Alpha', daten: { displayName: 'Alpha' } },
    { id: 'b', anzeigename: 'Beta', daten: { displayName: 'Beta' } },
  ];
  const completedStatus = {
    status: 'completed',
  } as IDatenbereichMigrationDokument;
  let datenmigrationServiceMock: {
    loadPurCustomers: ReturnType<typeof vi.fn>;
    loadMigrationsstatus: ReturnType<typeof vi.fn>;
    loadPurCompanies: ReturnType<typeof vi.fn>;
    loadPurBranches: ReturnType<typeof vi.fn>;
    loadPurEmployees: ReturnType<typeof vi.fn>;
    loadUnternehmerZielDokumente: ReturnType<typeof vi.fn>;
    loadFirmenZielDokumente: ReturnType<typeof vi.fn>;
    loadFilialenZielDokumente: ReturnType<typeof vi.fn>;
    loadMitarbeiterZielDokumente: ReturnType<typeof vi.fn>;
    migrateUnternehmer: ReturnType<typeof vi.fn>;
    migrateFirmen: ReturnType<typeof vi.fn>;
    migrateFilialen: ReturnType<typeof vi.fn>;
    migrateMitarbeiter: ReturnType<typeof vi.fn>;
  };
  const debugLogServiceMock = {
    logDatenflussTitel: vi.fn(),
    logDatenGeladen: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    datenmigrationServiceMock = {
      loadPurCustomers: vi.fn().mockResolvedValue(purCustomers),
      loadMigrationsstatus: vi.fn().mockResolvedValue({}),
      loadPurCompanies: vi.fn().mockResolvedValue([]),
      loadPurBranches: vi.fn().mockResolvedValue([]),
      loadPurEmployees: vi.fn().mockResolvedValue([]),
      loadUnternehmerZielDokumente: vi.fn().mockResolvedValue(0),
      loadFirmenZielDokumente: vi.fn().mockResolvedValue(0),
      loadFilialenZielDokumente: vi.fn().mockResolvedValue(0),
      loadMitarbeiterZielDokumente: vi.fn().mockResolvedValue(0),
      migrateUnternehmer: vi.fn().mockResolvedValue(undefined),
      migrateFirmen: vi.fn().mockResolvedValue(undefined),
      migrateFilialen: vi.fn().mockResolvedValue(undefined),
      migrateMitarbeiter: vi.fn().mockResolvedValue(undefined),
    };

    TestBed.configureTestingModule({
      providers: [
        DatenmigrationStore,
        { provide: DatenmigrationService, useValue: datenmigrationServiceMock },
        { provide: DebugLogService, useValue: debugLogServiceMock },
        {
          provide: StoreSnapshotService,
          useValue: { registerStoreSnapshot: vi.fn().mockReturnValue(vi.fn()) },
        },
      ],
    });
  });

  it('should load legacy customers and expose the complete snapshot', async () => {
    const store = TestBed.inject(DatenmigrationStore);

    await store.loadPurCustomers();

    expect(store.snapshot()).toEqual({
      purCustomers,
      selectedPurCustomerId: null,
      migrationsstatus: {},
      unternehmerZielDokumente: null,
      firmenQuellDokumente: null,
      firmenZielDokumente: null,
      filialenQuellDokumente: null,
      filialenZielDokumente: null,
      mitarbeiterQuellDokumente: null,
      mitarbeiterZielDokumente: null,
      download: false,
      isLoaded: true,
      inProgress: false,
      error: null,
    });
  });

  it('should load and log the branch source and target counts of the selected customer', async () => {
    datenmigrationServiceMock.loadPurBranches.mockResolvedValue([
      { id: 'filiale-1', purCompanyId: 'firma-1', daten: {} },
      { id: 'filiale-2', purCompanyId: 'firma-2', daten: {} },
    ]);
    datenmigrationServiceMock.loadFilialenZielDokumente.mockResolvedValue(3);
    const store = TestBed.inject(DatenmigrationStore);
    await store.loadPurCustomers();
    await store.selectPurCustomer('a');

    await store.loadFilialenBestaende();

    expect(datenmigrationServiceMock.loadPurBranches).toHaveBeenCalledWith('a');
    expect(datenmigrationServiceMock.loadFilialenZielDokumente).toHaveBeenCalledWith('a');
    expect(store.filialenQuellDokumente()).toBe(2);
    expect(store.filialenZielDokumente()).toBe(3);
    expect(debugLogServiceMock.logDatenflussTitel).toHaveBeenCalledWith('DATENMIGRATION ');
    expect(debugLogServiceMock.logDatenGeladen).toHaveBeenCalledWith('Legacy-Filialen | Alpha', 2);
    expect(debugLogServiceMock.logDatenGeladen).toHaveBeenCalledWith('Ziel-Filialen | Alpha', 3);
    expect(store.download()).toBe(false);
  });

  it('should load and log the employee source and target counts of the selected customer', async () => {
    datenmigrationServiceMock.loadPurEmployees.mockResolvedValue([
      { id: 'mitarbeiter-1', purCompanyId: 'firma-1', purBranchId: 'filiale-1', daten: {} },
      { id: 'mitarbeiter-2', purCompanyId: 'firma-1', purBranchId: 'filiale-2', daten: {} },
    ]);
    datenmigrationServiceMock.loadMitarbeiterZielDokumente.mockResolvedValue(3);
    const store = TestBed.inject(DatenmigrationStore);
    await store.loadPurCustomers();
    await store.selectPurCustomer('a');

    await store.loadMitarbeiterBestaende();

    expect(datenmigrationServiceMock.loadPurEmployees).toHaveBeenCalledWith('a');
    expect(datenmigrationServiceMock.loadMitarbeiterZielDokumente).toHaveBeenCalledWith('a');
    expect(store.mitarbeiterQuellDokumente()).toBe(2);
    expect(store.mitarbeiterZielDokumente()).toBe(3);
    expect(debugLogServiceMock.logDatenGeladen).toHaveBeenCalledWith(
      'Legacy-Mitarbeiter | Alpha',
      2,
    );
    expect(debugLogServiceMock.logDatenGeladen).toHaveBeenCalledWith('Ziel-Mitarbeiter | Alpha', 3);
  });

  it('should load and log the company source and target counts of the selected customer', async () => {
    datenmigrationServiceMock.loadPurCompanies.mockResolvedValue([
      { id: 'firma-1', daten: {} },
      { id: 'firma-2', daten: {} },
    ]);
    datenmigrationServiceMock.loadFirmenZielDokumente.mockResolvedValue(1);
    const store = TestBed.inject(DatenmigrationStore);
    await store.loadPurCustomers();
    await store.selectPurCustomer('a');

    await store.loadFirmenBestaende();

    expect(datenmigrationServiceMock.loadPurCompanies).toHaveBeenCalledWith('a');
    expect(datenmigrationServiceMock.loadFirmenZielDokumente).toHaveBeenCalledWith('a');
    expect(store.firmenQuellDokumente()).toBe(2);
    expect(store.firmenZielDokumente()).toBe(1);
    expect(debugLogServiceMock.logDatenflussTitel).toHaveBeenCalledWith('DATENMIGRATION ');
    expect(debugLogServiceMock.logDatenGeladen).toHaveBeenCalledWith('Legacy-Firmen | Alpha', 2);
    expect(debugLogServiceMock.logDatenGeladen).toHaveBeenCalledWith('Ziel-Firmen | Alpha', 1);
    expect(store.download()).toBe(false);
  });

  it('should load and log the entrepreneur target count of the selected customer', async () => {
    datenmigrationServiceMock.loadUnternehmerZielDokumente.mockResolvedValue(1);
    const store = TestBed.inject(DatenmigrationStore);
    await store.loadPurCustomers();
    await store.selectPurCustomer('a');

    await store.loadUnternehmerZiel();

    expect(datenmigrationServiceMock.loadUnternehmerZielDokumente).toHaveBeenCalledWith('a');
    expect(store.unternehmerZielDokumente()).toBe(1);
    expect(debugLogServiceMock.logDatenGeladen).toHaveBeenCalledWith('Ziel-Unternehmer | Alpha', 1);
  });

  it('should select one customer and load only its migration status', async () => {
    datenmigrationServiceMock.loadMigrationsstatus.mockResolvedValue({
      unternehmer: completedStatus,
    });
    const store = TestBed.inject(DatenmigrationStore);
    await store.loadPurCustomers();

    await store.selectPurCustomer('b');

    expect(datenmigrationServiceMock.loadMigrationsstatus).toHaveBeenCalledWith('b');
    expect(store.selectedPurCustomerId()).toBe('b');
    expect(store.migrationsstatus()).toEqual({ unternehmer: completedStatus });
    expect(store.download()).toBe(false);
  });

  it('should clear status when clearing the customer selection', async () => {
    datenmigrationServiceMock.loadMigrationsstatus.mockResolvedValue({
      unternehmer: completedStatus,
    });
    const store = TestBed.inject(DatenmigrationStore);
    await store.loadPurCustomers();
    await store.selectPurCustomer('a');

    await store.selectPurCustomer(null);

    expect(store.selectedPurCustomerId()).toBeNull();
    expect(store.migrationsstatus()).toEqual({});
    expect(store.unternehmerZielDokumente()).toBeNull();
    expect(store.firmenQuellDokumente()).toBeNull();
    expect(store.firmenZielDokumente()).toBeNull();
    expect(store.filialenQuellDokumente()).toBeNull();
    expect(store.filialenZielDokumente()).toBeNull();
    expect(store.mitarbeiterQuellDokumente()).toBeNull();
    expect(store.mitarbeiterZielDokumente()).toBeNull();
  });

  it('should migrate branches of the selected customer and reload its status', async () => {
    datenmigrationServiceMock.loadMigrationsstatus
      .mockResolvedValueOnce({ firmen: completedStatus })
      .mockResolvedValueOnce({ firmen: completedStatus, filialen: completedStatus });
    datenmigrationServiceMock.loadFilialenZielDokumente.mockResolvedValue(4);
    const store = TestBed.inject(DatenmigrationStore);
    await store.loadPurCustomers();
    await store.selectPurCustomer('a');

    await store.migrateFilialen();

    expect(datenmigrationServiceMock.migrateFilialen).toHaveBeenCalledWith('a');
    expect(datenmigrationServiceMock.loadMigrationsstatus).toHaveBeenLastCalledWith('a');
    expect(datenmigrationServiceMock.loadFilialenZielDokumente).toHaveBeenCalledWith('a');
    expect(store.migrationsstatus().filialen).toBe(completedStatus);
    expect(store.filialenZielDokumente()).toBe(4);
    expect(store.inProgress()).toBe(false);
  });

  it('should migrate employees of the selected customer and reload its status', async () => {
    datenmigrationServiceMock.loadMigrationsstatus
      .mockResolvedValueOnce({ filialen: completedStatus })
      .mockResolvedValueOnce({ filialen: completedStatus, mitarbeiter: completedStatus });
    datenmigrationServiceMock.loadMitarbeiterZielDokumente.mockResolvedValue(4);
    const store = TestBed.inject(DatenmigrationStore);
    await store.loadPurCustomers();
    await store.selectPurCustomer('a');

    await store.migrateMitarbeiter();

    expect(datenmigrationServiceMock.migrateMitarbeiter).toHaveBeenCalledWith('a');
    expect(datenmigrationServiceMock.loadMitarbeiterZielDokumente).toHaveBeenCalledWith('a');
    expect(store.migrationsstatus().mitarbeiter).toBe(completedStatus);
    expect(store.mitarbeiterZielDokumente()).toBe(4);
    expect(store.inProgress()).toBe(false);
  });

  it('should migrate the selected customer and reload its status', async () => {
    datenmigrationServiceMock.loadMigrationsstatus
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({ unternehmer: completedStatus });
    datenmigrationServiceMock.loadUnternehmerZielDokumente.mockResolvedValue(1);
    const store = TestBed.inject(DatenmigrationStore);
    await store.loadPurCustomers();
    await store.selectPurCustomer('a');

    await store.migrateUnternehmer();

    expect(datenmigrationServiceMock.migrateUnternehmer).toHaveBeenCalledWith(purCustomers[0]);
    expect(datenmigrationServiceMock.loadMigrationsstatus).toHaveBeenLastCalledWith('a');
    expect(store.migrationsstatus()).toEqual({ unternehmer: completedStatus });
    expect(store.unternehmerZielDokumente()).toBe(1);
    expect(store.inProgress()).toBe(false);
  });

  it('should require a loaded customer selection before migration', async () => {
    const store = TestBed.inject(DatenmigrationStore);

    await expect(store.migrateUnternehmer()).rejects.toThrow(
      'Vor der Migration muss ein Legacy-Kunde ausgewählt werden.',
    );
    expect(datenmigrationServiceMock.migrateUnternehmer).not.toHaveBeenCalled();
  });

  it('should migrate companies of the selected customer and reload its status', async () => {
    datenmigrationServiceMock.loadMigrationsstatus
      .mockResolvedValueOnce({ unternehmer: completedStatus })
      .mockResolvedValueOnce({ unternehmer: completedStatus, firmen: completedStatus });
    datenmigrationServiceMock.loadFirmenZielDokumente.mockResolvedValue(2);
    const store = TestBed.inject(DatenmigrationStore);
    await store.loadPurCustomers();
    await store.selectPurCustomer('a');

    await store.migrateFirmen();

    expect(datenmigrationServiceMock.migrateFirmen).toHaveBeenCalledWith('a');
    expect(datenmigrationServiceMock.loadMigrationsstatus).toHaveBeenLastCalledWith('a');
    expect(datenmigrationServiceMock.loadFirmenZielDokumente).toHaveBeenCalledWith('a');
    expect(store.migrationsstatus().firmen).toBe(completedStatus);
    expect(store.firmenZielDokumente()).toBe(2);
    expect(store.inProgress()).toBe(false);
  });

  it('should expose friendly load and migration errors', async () => {
    datenmigrationServiceMock.loadPurCustomers.mockRejectedValue({ code: 'unavailable' });
    const store = TestBed.inject(DatenmigrationStore);

    await expect(store.loadPurCustomers()).rejects.toEqual({ code: 'unavailable' });
    expect(store.error()).toBe('Die Daten sind gerade nicht erreichbar. Bitte versuche es erneut.');
    expect(store.download()).toBe(false);

    datenmigrationServiceMock.loadPurCustomers.mockResolvedValue(purCustomers);
    await store.loadPurCustomers();
    await store.selectPurCustomer('a');
    datenmigrationServiceMock.migrateUnternehmer.mockRejectedValue({
      code: 'permission-denied',
    });

    await expect(store.migrateUnternehmer()).rejects.toEqual({ code: 'permission-denied' });
    expect(store.error()).toBe('Du hast keine Berechtigung für diese Aktion.');
    expect(store.inProgress()).toBe(false);

    store.clearError();
    expect(store.error()).toBeNull();
  });
});
