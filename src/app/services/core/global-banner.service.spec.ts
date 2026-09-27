// pur-system/src/app/services/core/global-banner.service.spec.ts

import { TestBed } from '@angular/core/testing';

import { GlobalBannerService } from './global-banner.service';

describe('GlobalBannerService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('should start without an active banner', () => {
    const service = TestBed.inject(GlobalBannerService);

    expect(service.active()).toBe(false);
    expect(service.state()).toEqual({
      active: false,
      kind: 'info',
      text: '',
    });
  });

  it('should show and replace the global banner', () => {
    const service = TestBed.inject(GlobalBannerService);

    service.show({
      kind: 'warn',
      text: 'Erster Hinweis',
      source: 'test:erste-quelle',
    });
    service.show({
      kind: 'error',
      text: 'Zweiter Hinweis',
      source: 'test:zweite-quelle',
    });

    expect(service.state()).toEqual({
      active: true,
      kind: 'error',
      text: 'Zweiter Hinweis',
      source: 'test:zweite-quelle',
    });
  });

  it('should clear only a banner from the matching source', () => {
    const service = TestBed.inject(GlobalBannerService);
    service.show({
      kind: 'error',
      text: 'Hinweis',
      source: 'test:quelle',
    });

    service.clearIfSource('test:andere-quelle');
    expect(service.active()).toBe(true);

    service.clearIfSource('test:quelle');
    expect(service.active()).toBe(false);
  });
});
