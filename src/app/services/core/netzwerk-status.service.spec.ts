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

  it('should react to offline and online events', () => {
    vi.spyOn(window.navigator, 'onLine', 'get').mockReturnValue(true);
    const service = TestBed.inject(NetzwerkStatusService);

    window.dispatchEvent(new Event('offline'));
    expect(service.isOnline()).toBe(false);

    window.dispatchEvent(new Event('online'));
    expect(service.isOnline()).toBe(true);
    expect(service.wiederOnline()).toBe(true);
  });

  it('should hide the restored connection message after five seconds', () => {
    vi.useFakeTimers();
    vi.spyOn(window.navigator, 'onLine', 'get').mockReturnValue(false);
    const service = TestBed.inject(NetzwerkStatusService);

    window.dispatchEvent(new Event('online'));
    vi.advanceTimersByTime(5000);

    expect(service.wiederOnline()).toBe(false);
  });

  it('should reject connection-dependent actions while offline', () => {
    vi.spyOn(window.navigator, 'onLine', 'get').mockReturnValue(false);
    const service = TestBed.inject(NetzwerkStatusService);

    expect(() => service.assertOnline()).toThrow('Diese Aktion benötigt eine Internetverbindung.');
  });
});
