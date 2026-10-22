// pur-system/src/app/pages/dashboard-page/dashboard-page.ts

import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatToolbarModule } from '@angular/material/toolbar';

import { isLocalhost as checkIsLocalhost } from '../../commons/utils/core/localhost';
import { PageRouteTitleDirective } from '../../directives/page-route-title.directive';

@Component({
  selector: 'app-dashboard-page',
  imports: [MatButtonModule, MatToolbarModule, PageRouteTitleDirective],
  templateUrl: './dashboard-page.html',
  styleUrl: './dashboard-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardPage {
  // ===== Öffentliche Werte ====================

  readonly isLocalhost = checkIsLocalhost(globalThis.location?.hostname ?? '');
  readonly showTests = true;
  readonly isTertiary = true;
}
