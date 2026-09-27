// pur-system/src/app/services/domain/datenzugriff.service.spec.ts
import { TestBed } from '@angular/core/testing';
import { DatenzugriffService } from './datenzugriff.service';
import { FilialeService } from './filiale.service';
import { FirmaService } from './firma.service';
import { UnternehmerService } from './unternehmer.service';

describe('DatenzugriffService', () => {
  const loadFilialen = vi.fn();
  const loadFirmen = vi.fn();
  const loadUnternehmer = vi.fn();
  beforeEach(() => {
    vi.clearAllMocks();
    loadFilialen.mockResolvedValue([]);
    loadFirmen.mockResolvedValue([]);
    loadUnternehmer.mockResolvedValue([]);
    TestBed.configureTestingModule({
      providers: [
        { provide: FilialeService, useValue: { loadFilialen } },
        { provide: FirmaService, useValue: { loadFirmen } },
        { provide: UnternehmerService, useValue: { loadUnternehmer } },
      ],
    });
  });
  it('should use document IDs, map display names and sort entrepreneurs', async () => {
    const service = TestBed.inject(DatenzugriffService);
    loadUnternehmer.mockResolvedValue([
      { id: 'a', anzeigename: 'Alpha', nummer: 1 },
      { id: 'b', anzeigename: 'Beta', nummer: 2 },
    ]);

    expect(await service.loadUnternehmer()).toEqual([
      { id: 'a', anzeigename: 'Alpha' },
      { id: 'b', anzeigename: 'Beta' },
    ]);
    expect(loadUnternehmer).toHaveBeenCalledOnce();
  });
  it('should map company entries without exposing their numbers', async () => {
    const service = TestBed.inject(DatenzugriffService);
    loadFirmen.mockResolvedValue([
      { id: 'a', anzeigename: 'Alpha', nummer: 1 },
      { id: 'b', anzeigename: 'Beta', nummer: 2 },
    ]);

    expect(await service.loadFirmen('u')).toEqual([
      { id: 'a', anzeigename: 'Alpha' },
      { id: 'b', anzeigename: 'Beta' },
    ]);
    expect(loadFirmen).toHaveBeenCalledWith('u');
  });
  it('should map branch entries without exposing their numbers', async () => {
    const service = TestBed.inject(DatenzugriffService);
    loadFilialen.mockResolvedValue([
      { id: 'a', anzeigename: 'Alpha', nummer: 1 },
      { id: 'b', anzeigename: 'Beta', nummer: 2 },
    ]);

    expect(await service.loadFilialen('u', 'f')).toEqual([
      { id: 'a', anzeigename: 'Alpha' },
      { id: 'b', anzeigename: 'Beta' },
    ]);
    expect(loadFilialen).toHaveBeenCalledWith('u', 'f');
  });
  it('should return an empty list and propagate read errors', async () => {
    const service = TestBed.inject(DatenzugriffService);
    expect(await service.loadUnternehmer()).toEqual([]);
    loadUnternehmer.mockRejectedValue({ code: 'permission-denied' });
    await expect(service.loadUnternehmer()).rejects.toEqual({ code: 'permission-denied' });
  });
});
