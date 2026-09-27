// pur-system/src/app/components/app-shell/app-sidenav/app-sidenav-nested-navigation/app-sidenav-nested-navigation.ts

import {
  ChangeDetectionStrategy,
  Component,
  Signal,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatTree, MatTreeModule } from '@angular/material/tree';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { filter } from 'rxjs';

import { INavigationGruppe, TNavigationEintrag } from '../../../../commons/models/app/navigation';

// ===== Top-Level Helper =====================

function filterLeereGruppen(eintraege: readonly TNavigationEintrag[]): TNavigationEintrag[] {
  const gefilterteEintraege: TNavigationEintrag[] = [];

  for (const eintrag of eintraege) {
    if (eintrag.typ === 'link') {
      gefilterteEintraege.push(eintrag);
      continue;
    }

    const kinder = filterLeereGruppen(eintrag.kinder);
    if (kinder.length > 0) {
      gefilterteEintraege.push({ ...eintrag, kinder });
    }
  }

  return gefilterteEintraege;
}

function getKinder(eintrag: TNavigationEintrag): TNavigationEintrag[] {
  return eintrag.typ === 'gruppe' ? [...eintrag.kinder] : [];
}

function getExpansionKey(eintrag: TNavigationEintrag): string {
  return eintrag.id;
}

function isGruppe(_index: number, eintrag: TNavigationEintrag): eintrag is INavigationGruppe {
  return eintrag.typ === 'gruppe';
}

@Component({
  selector: 'app-sidenav-nested-navigation',
  imports: [MatIconModule, MatListModule, MatTreeModule, RouterLink, RouterLinkActive],
  templateUrl: './app-sidenav-nested-navigation.html',
  styleUrl: './app-sidenav-nested-navigation.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppSidenavNestedNavigation {
  // ===== Interne Dependency Injection =========
  private readonly router = inject(Router);

  // ===== Öffentliche API ======================
  readonly eintraege = input.required<readonly TNavigationEintrag[]>();
  readonly navigationSelected = output<void>();

  // ===== View Queries =========================
  private readonly tree = viewChild<MatTree<TNavigationEintrag>>('tree');

  // ===== Interner State =======================
  private readonly aktuelleUrl = signal(this.router.url);

  // ===== Öffentliche Werte ====================
  readonly childrenAccessor = getKinder;
  readonly getExpansionKey = getExpansionKey;
  readonly isGruppe = isGruppe;

  // ===== Öffentliche Ableitungen ==============
  readonly sichtbareEintraege: Signal<TNavigationEintrag[]> = computed(() => {
    return filterLeereGruppen(this.eintraege());
  });

  constructor() {
    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe((event) => {
        this.aktuelleUrl.set(event.urlAfterRedirects);
      });

    effect(() => {
      const tree = this.tree();
      const eintraege = this.sichtbareEintraege();
      this.aktuelleUrl();

      if (tree) {
        this.expandAktiveGruppen(tree, eintraege);
      }
    });
  }

  // ===== Öffentliche Aktionen =================
  /**
   * Meldet die Auswahl eines Navigationslinks an die übergeordnete App-Shell.
   */
  selectNavigation(): void {
    this.navigationSelected.emit();
  }

  // ===== Interne Helfer =======================
  private expandAktiveGruppen(
    tree: MatTree<TNavigationEintrag>,
    eintraege: readonly TNavigationEintrag[],
  ): void {
    for (const eintrag of eintraege) {
      if (eintrag.typ !== 'gruppe') continue;

      if (this.enthaeltAktiveRoute(eintrag)) {
        tree.expand(eintrag);
      }
      this.expandAktiveGruppen(tree, eintrag.kinder);
    }
  }

  private enthaeltAktiveRoute(gruppe: INavigationGruppe): boolean {
    return gruppe.kinder.some((eintrag) => {
      if (eintrag.typ === 'gruppe') {
        return this.enthaeltAktiveRoute(eintrag);
      }
      return this.router.isActive(eintrag.route, {
        paths: 'exact',
        queryParams: 'ignored',
        fragment: 'ignored',
        matrixParams: 'ignored',
      });
    });
  }
}
