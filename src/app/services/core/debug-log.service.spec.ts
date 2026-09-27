// pur-system/src/app/services/core/debug-log.service.spec.ts

import { TestBed } from '@angular/core/testing';

import { DebugLogService } from './debug-log.service';

describe('DebugLogService', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should write categorized debug messages in development mode', () => {
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
    const details = [{ id: 'u-1', anzeigename: 'Unternehmer' }];

    service.logDatenflussTitel('2. STAMMDATEN | MASTER ');
    service.logDatenGeladen('Unternehmer', 1, details);

    expect(consoleLogSpy).toHaveBeenNthCalledWith(
      1,
      '\n******* 2. STAMMDATEN | MASTER *******************',
    );
    expect(consoleLogSpy).toHaveBeenNthCalledWith(
      2,
      '* Unternehmer geladen............... (1)',
      details,
    );
  });
});
