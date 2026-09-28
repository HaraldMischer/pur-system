// pur-system/src/app/services/core/netzwerk-status.service.spec.ts

import { TestBed } from '@angular/core/testing';

import { NetzwerkStatusService } from './netzwerk-status.service';

describe('NetzwerkStatusService', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('should use the current browser network state initially', () => {
    vi.spyOn(window.navigator, 'onLine', 'get').mockReturnValue(false);

    const service = TestBed.inject(NetzwerkStatusService);

    expect(service.isOnline()).toBe(false);
  });

  it('should check the uncached health file', async () => {
    vi.spyOn(window.navigator, 'onLine', 'get').mockReturnValue(true);
    const fetchSpy = vi.spyOn(window, 'fetch').mockResolvedValue({ ok: true } as Response);

    const service = TestBed.inject(NetzwerkStatusService);
    const isOnline = await service.checkConnection();

    expect(isOnline).toBe(true);
    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringMatching(/^\/health\.json\?ts=\d+$/),
      expect.objectContaining({
        method: 'GET',
        cache: 'no-store',
      }),
    );
  });

  it('should mark the connection as offline when the health request fails', async () => {
    vi.spyOn(window.navigator, 'onLine', 'get').mockReturnValue(true);
    vi.spyOn(window, 'fetch').mockRejectedValue(new Error('Fetch failed'));

    const service = TestBed.inject(NetzwerkStatusService);

    await expect(service.checkConnection()).resolves.toBe(false);
    expect(service.isOnline()).toBe(false);
  });

  it('should mark the connection as offline when the health response is not successful', async () => {
    vi.spyOn(window.navigator, 'onLine', 'get').mockReturnValue(true);
    vi.spyOn(window, 'fetch').mockResolvedValue({ ok: false } as Response);

    const service = TestBed.inject(NetzwerkStatusService);

    await expect(service.checkConnection()).resolves.toBe(false);
    expect(service.isOnline()).toBe(false);
  });

  it('should abort the health request after three seconds', async () => {
    vi.useFakeTimers();
    vi.spyOn(window.navigator, 'onLine', 'get').mockReturnValue(true);
    vi.spyOn(window, 'fetch').mockImplementation((_input, init) => {
      return new Promise((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => {
          reject(new DOMException('Aborted', 'AbortError'));
        });
      });
    });

    const service = TestBed.inject(NetzwerkStatusService);
    const pruefung = service.checkConnection();

    await vi.advanceTimersByTimeAsync(3000);

    await expect(pruefung).resolves.toBe(false);
    expect(service.isOnline()).toBe(false);
  });

  it('should react to offline and online events', async () => {
    let browserOnline = true;
    vi.spyOn(window.navigator, 'onLine', 'get').mockImplementation(() => {
      return browserOnline;
    });
    vi.spyOn(window, 'fetch').mockResolvedValue({ ok: true } as Response);
    const service = TestBed.inject(NetzwerkStatusService);
    await service.checkConnection();

    browserOnline = false;
    window.dispatchEvent(new Event('offline'));
    expect(service.isOnline()).toBe(false);

    browserOnline = true;
    window.dispatchEvent(new Event('online'));
    await service.checkConnection();
    expect(service.isOnline()).toBe(true);
    expect(service.wiederOnline()).toBe(true);
  });

  it('should check the connection every thirty seconds', async () => {
    vi.useFakeTimers();
    vi.spyOn(window.navigator, 'onLine', 'get').mockReturnValue(true);
    const fetchSpy = vi.spyOn(window, 'fetch').mockResolvedValue({ ok: true } as Response);
    const service = TestBed.inject(NetzwerkStatusService);
    await service.checkConnection();

    await vi.advanceTimersByTimeAsync(30_000);

    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it('should hide the restored connection message after five seconds', async () => {
    vi.useFakeTimers();
    let browserOnline = true;
    vi.spyOn(window.navigator, 'onLine', 'get').mockImplementation(() => {
      return browserOnline;
    });
    vi.spyOn(window, 'fetch').mockResolvedValue({ ok: true } as Response);
    const service = TestBed.inject(NetzwerkStatusService);
    await service.checkConnection();

    browserOnline = false;
    window.dispatchEvent(new Event('offline'));
    browserOnline = true;
    window.dispatchEvent(new Event('online'));
    await service.checkConnection();
    vi.advanceTimersByTime(5000);

    expect(service.wiederOnline()).toBe(false);
  });

  it('should reject connection-dependent actions while offline', () => {
    vi.spyOn(window.navigator, 'onLine', 'get').mockReturnValue(false);
    const service = TestBed.inject(NetzwerkStatusService);

    expect(() => service.assertOnline()).toThrow('Diese Aktion benötigt eine Internetverbindung.');
  });
});
