// pur-system/src/app/services/core/loading.service.spec.ts

import { TestBed } from '@angular/core/testing';

import { LoadingService } from './loading.service';

describe('LoadingService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('should show loading until all parallel operations are complete', async () => {
    const service = TestBed.inject(LoadingService);
    let resolveFirst!: (value: string) => void;
    let resolveSecond!: (value: string) => void;
    const first = service.trackLoad(
      () =>
        new Promise<string>((resolve) => {
          resolveFirst = resolve;
        }),
    );
    const second = service.trackLoad(
      () =>
        new Promise<string>((resolve) => {
          resolveSecond = resolve;
        }),
    );

    expect(service.isLoading()).toBe(true);
    resolveFirst('eins');
    await first;
    expect(service.isLoading()).toBe(true);
    resolveSecond('zwei');
    await second;
    expect(service.isLoading()).toBe(false);
  });

  it('should clear loading after an operation fails', async () => {
    const service = TestBed.inject(LoadingService);
    const error = new Error('Laden fehlgeschlagen');

    await expect(
      service.trackLoad(async () => {
        throw error;
      }),
    ).rejects.toBe(error);

    expect(service.isLoading()).toBe(false);
  });

  it('should show writing until all parallel write operations are complete', async () => {
    const service = TestBed.inject(LoadingService);
    let resolveFirst!: () => void;
    let resolveSecond!: () => void;
    const first = service.trackWrite(
      () =>
        new Promise<void>((resolve) => {
          resolveFirst = resolve;
        }),
    );
    const second = service.trackWrite(
      () =>
        new Promise<void>((resolve) => {
          resolveSecond = resolve;
        }),
    );

    expect(service.isWriting()).toBe(true);
    expect(service.isActive()).toBe(true);
    resolveFirst();
    await first;
    expect(service.isWriting()).toBe(true);
    resolveSecond();
    await second;
    expect(service.isWriting()).toBe(false);
    expect(service.isActive()).toBe(false);
  });

  it('should clear writing after an operation fails', async () => {
    const service = TestBed.inject(LoadingService);
    const error = new Error('Speichern fehlgeschlagen');

    await expect(
      service.trackWrite(async () => {
        throw error;
      }),
    ).rejects.toBe(error);

    expect(service.isWriting()).toBe(false);
    expect(service.isActive()).toBe(false);
  });

  it('should stay active while a load and a write overlap', async () => {
    const service = TestBed.inject(LoadingService);
    let resolveLoad!: () => void;
    let resolveWrite!: () => void;
    const load = service.trackLoad(
      () =>
        new Promise<void>((resolve) => {
          resolveLoad = resolve;
        }),
    );
    const write = service.trackWrite(
      () =>
        new Promise<void>((resolve) => {
          resolveWrite = resolve;
        }),
    );

    resolveLoad();
    await load;
    expect(service.isActive()).toBe(true);
    resolveWrite();
    await write;
    expect(service.isActive()).toBe(false);
  });
});
