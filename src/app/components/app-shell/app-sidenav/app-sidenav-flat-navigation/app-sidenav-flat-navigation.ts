// pur-system/src/app/components/app-shell/app-sidenav/app-sidenav-flat-navigation/app-sidenav-flat-navigation.ts

import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { RouterLink, RouterLinkActive } from '@angular/router';

import { INavigationLink } from '../../../../commons/models/app/navigation';

@Component({
  selector: 'app-sidenav-flat-navigation',
  imports: [MatIconModule, MatListModule, RouterLink, RouterLinkActive],
  templateUrl: './app-sidenav-flat-navigation.html',
  styleUrl: './app-sidenav-flat-navigation.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppSidenavFlatNavigation {
  // ===== Öffentliche API ======================
  readonly eintraege = input.required<readonly INavigationLink[]>();
  readonly navigationSelected = output<void>();

  // ===== Öffentliche Aktionen =================
  /**
   * Meldet die Auswahl eines Navigationslinks an die übergeordnete App-Shell.
   */
  selectNavigation(): void {
    this.navigationSelected.emit();
  }
}
