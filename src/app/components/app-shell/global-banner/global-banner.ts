// pur-system/src/app/components/app-shell/global-banner/global-banner.ts

import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

import { GlobalBannerService } from '../../../services/core/global-banner.service';

@Component({
  selector: 'app-global-banner',
  imports: [MatIconModule],
  templateUrl: './global-banner.html',
  styleUrl: './global-banner.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GlobalBanner {
  // ===== Interne Dependency Injection =========

  private readonly _globalBannerService = inject(GlobalBannerService);

  // ===== Öffentliche API ======================

  readonly active = this._globalBannerService.active;
  readonly state = this._globalBannerService.state;

  // ===== Öffentliche Ableitungen ==============

  readonly icon = computed(() => {
    switch (this.state().kind) {
      case 'error':
        return 'error';
      case 'warn':
        return 'warning';
      default:
        return 'info';
    }
  });
  readonly liveRole = computed(() => {
    return this.state().kind === 'error' ? 'alert' : 'status';
  });
}
