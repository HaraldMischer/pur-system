// pur-system/src/app/services/core/pwa-update.service.spec.ts

import { DOCUMENT } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { SwUpdate, VersionEvent } from '@angular/service-worker';
import { Subject } from 'rxjs';

import { PwaUpdateService } from './pwa-update.service';

describe('PwaUpdateService', () => {
  const reloadMock = vi.fn();
  let swUpdateMock: {
    isEnabled: boolean;
    versionUpdates: Subject<VersionEvent>;
    unrecoverable: Subject<{ type: 'UNRECOVERABLE_STATE'; reason: string }>;
  };

  beforeEach(() => {
    reloadMock.mockReset();
    swUpdateMock = {
      isEnabled: true,
      versionUpdates: new Subject<VersionEvent>(),
      unrecoverable: new Subject<{ type: 'UNRECOVERABLE_STATE'; reason: string }>(),
    };
  });

  function configureServiceWorker(isEnabled = true): PwaUpdateService {
    swUpdateMock.isEnabled = isEnabled;
    TestBed.configureTestingModule({
      providers: [
        PwaUpdateService,
        { provide: SwUpdate, useValue: swUpdateMock },
        {
          provide: DOCUMENT,
          useValue: { defaultView: { location: { reload: reloadMock } } },
        },
      ],
    });

    return TestBed.inject(PwaUpdateService);
  }

  it('should expose a fully downloaded application version', () => {
    const service = configureServiceWorker();

    swUpdateMock.versionUpdates.next({
      type: 'VERSION_READY',
      currentVersion: { hash: 'alt' },
      latestVersion: { hash: 'neu' },
    });

    expect(service.updateVerfuegbar()).toBe(true);
    expect(service.updateFehler()).toBeNull();
  });

  it('should reload only after the user confirms an available update', () => {
    const service = configureServiceWorker();

    service.reloadApp();
    expect(reloadMock).not.toHaveBeenCalled();

    swUpdateMock.versionUpdates.next({
      type: 'VERSION_READY',
      currentVersion: { hash: 'alt' },
      latestVersion: { hash: 'neu' },
    });
    service.reloadApp();

    expect(reloadMock).toHaveBeenCalledOnce();
  });

  it('should expose an update installation error without reloading', () => {
    const service = configureServiceWorker();

    swUpdateMock.versionUpdates.next({
      type: 'VERSION_INSTALLATION_FAILED',
      version: { hash: 'neu' },
      error: 'Download fehlgeschlagen',
    });

    expect(service.updateFehler()).toContain('Eine neue Version konnte nicht geladen werden.');
    expect(reloadMock).not.toHaveBeenCalled();
  });

  it('should require a reload for an unrecoverable application state', () => {
    const service = configureServiceWorker();

    swUpdateMock.unrecoverable.next({
      type: 'UNRECOVERABLE_STATE',
      reason: 'Ressource fehlt',
    });

    expect(service.neuladenErforderlich()).toBe(true);
    expect(service.updateFehler()).toContain('Bitte lade die App neu.');

    service.reloadApp();
    expect(reloadMock).toHaveBeenCalledOnce();
  });

  it('should stay inactive without service worker support', () => {
    const service = configureServiceWorker(false);

    swUpdateMock.versionUpdates.next({
      type: 'VERSION_READY',
      currentVersion: { hash: 'alt' },
      latestVersion: { hash: 'neu' },
    });

    expect(service.updateVerfuegbar()).toBe(false);
    expect(service.updateFehler()).toBeNull();
    expect(service.neuladenErforderlich()).toBe(false);
  });
});
