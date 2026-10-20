// pur-system/src/app/components/app-shell/global-banner/global-banner.spec.ts

import { TestBed } from '@angular/core/testing';

import { GlobalBannerService } from '../../../services/core/global-banner.service';
import { GlobalBanner } from './global-banner';

describe('GlobalBanner', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GlobalBanner],
    }).compileComponents();
  });

  it('should remain hidden without an active banner', () => {
    const fixture = TestBed.createComponent(GlobalBanner);
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent?.trim()).toBe('');
  });

  it('should render the current banner', () => {
    const service = TestBed.inject(GlobalBannerService);
    service.show({
      kind: 'error',
      text: 'Dieses Profil ist inaktiv.',
      source: 'benutzerprofil:inaktiv',
    });
    const fixture = TestBed.createComponent(GlobalBanner);
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      'Dieses Profil ist inaktiv.',
    );
  });
});
