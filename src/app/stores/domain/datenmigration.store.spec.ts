// pur-system/src/app/stores/domain/datenmigration.store.spec.ts

import { TestBed } from '@angular/core/testing';

import { IDatenbereichMigrationDokument } from '../../commons/models/domain/datenmigration';
import { IPurCustomerEintrag } from '../../commons/models/legacy/pur-customer';
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
    migrateUnternehmer: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    datenmigrationServiceMock = {
      loadPurCustomers: vi.fn().mockResolvedValue(purCustomers),
      loadMigrationsstatus: vi.fn().mockResolvedValue({}),
      migrateUnternehmer: vi.fn().mockResolvedValue(undefined),
    };

    TestBed.configureTestingModule({
      providers: [
        DatenmigrationStore,
        { provide: DatenmigrationService, useValue: datenmigrationServiceMock },
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
      download: false,
      isLoaded: true,
      inProgress: false,
      error: null,
    });
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
  });

  it('should migrate the selected customer and reload its status', async () => {
    datenmigrationServiceMock.loadMigrationsstatus
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({ unternehmer: completedStatus });
    const store = TestBed.inject(DatenmigrationStore);
    await store.loadPurCustomers();
    await store.selectPurCustomer('a');

    await store.migrateUnternehmer();

    expect(datenmigrationServiceMock.migrateUnternehmer).toHaveBeenCalledWith(purCustomers[0]);
    expect(datenmigrationServiceMock.loadMigrationsstatus).toHaveBeenLastCalledWith('a');
    expect(store.migrationsstatus()).toEqual({ unternehmer: completedStatus });
    expect(store.inProgress()).toBe(false);
  });

  it('should require a loaded customer selection before migration', async () => {
    const store = TestBed.inject(DatenmigrationStore);

    await expect(store.migrateUnternehmer()).rejects.toThrow(
      'Vor der Migration muss ein Legacy-Kunde ausgewählt werden.',
    );
    expect(datenmigrationServiceMock.migrateUnternehmer).not.toHaveBeenCalled();
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
