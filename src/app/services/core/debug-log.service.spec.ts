// pur-system/src/app/services/core/debug-log.service.spec.ts

import { TestBed } from '@angular/core/testing';

import { DebugLogService, isLocalhost } from './debug-log.service';

describe('DebugLogService', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should write categorized debug messages on localhost', () => {
    const consoleDebugSpy = vi.spyOn(console, 'debug').mockImplementation(() => undefined);
    const service = TestBed.inject(DebugLogService);
    const details = { pfad: 'unternehmer' };

    service.log('Firestore', 'Collection laden', details);

    expect(service.isEnabled).toBe(true);
    expect(consoleDebugSpy).toHaveBeenCalledWith('[PUR][Firestore] Collection laden', details);
  });

  it('should write readable initial data flow results through console log', () => {
    const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const service = TestBed.inject(DebugLogService);

    service.logDatenflussTitel('2. STAMMDATEN | MASTER ');
    service.logDatenGeladen('Unternehmer', 1);

    expect(consoleLogSpy).toHaveBeenNthCalledWith(
      1,
      '\n***** 2. STAMMDATEN | MASTER **********************',
    );
    expect(consoleLogSpy).toHaveBeenNthCalledWith(
      2,
      '* Unternehmer geladen.......................... (1)',
    );
  });

  it('should recognize only local hostnames', () => {
    expect(isLocalhost('localhost')).toBe(true);
    expect(isLocalhost('127.0.0.1')).toBe(true);
    expect(isLocalhost('::1')).toBe(true);
    expect(isLocalhost('pur-filiale.web.app')).toBe(false);
    expect(isLocalhost('192.168.1.10')).toBe(false);
  });
});
