// pur-system/src/app/services/core/store-snapshot.service.spec.ts

import { TestBed } from '@angular/core/testing';
import { DebugLogService } from './debug-log.service';
import { StoreSnapshotService } from './store-snapshot.service';

describe('StoreSnapshotService', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should log registered store snapshots and remove inactive instances', () => {
    const snapshot = { isLoaded: true };
    const snapshotProvider = vi.fn().mockReturnValue(snapshot);
    const debugLogServiceMock = { log: vi.fn() };

    TestBed.configureTestingModule({
      providers: [
        StoreSnapshotService,
        { provide: DebugLogService, useValue: debugLogServiceMock },
      ],
    });
    const service = TestBed.inject(StoreSnapshotService);
    const unregister = service.registerStoreSnapshot('UnternehmerStore', snapshotProvider);

    service.logStoreSnapshots();

    expect(snapshotProvider).toHaveBeenCalledOnce();
    expect(debugLogServiceMock.log).toHaveBeenCalledWith('Store', 'Snapshots', {
      UnternehmerStore: snapshot,
    });

    unregister();
    service.logStoreSnapshots();

    expect(debugLogServiceMock.log).toHaveBeenLastCalledWith('Store', 'Snapshots', {});
  });
});
