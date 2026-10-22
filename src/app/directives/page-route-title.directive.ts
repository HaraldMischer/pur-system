// pur-system/src/app/directives/page-route-title.directive.ts

import { Directive, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';

@Directive({
  selector: '[purPageRouteTitle]',
  host: {
    '[textContent]': 'routeTitle()',
  },
})
export class PageRouteTitleDirective {
  // ===== Interne Dependency Injection =========
  private readonly _route = inject(ActivatedRoute);

  // ===== Öffentliche Werte ====================
  readonly routeTitle = toSignal(this._route.title, {
    initialValue: this._route.snapshot.title ?? '',
  });
}
