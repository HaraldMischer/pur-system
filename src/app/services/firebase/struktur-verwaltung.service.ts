// pur-system/src/app/services/firebase/struktur-verwaltung.service.ts

import { Injectable, Injector, inject, runInInjectionContext } from '@angular/core';
import { Functions } from '@angular/fire/functions';

import { HTTPS_CALLABLE } from '../../commons/tokens/firebase.tokens';
import { LoadingService } from '../core/loading.service';
import { NetzwerkStatusService } from '../core/netzwerk-status.service';

type TStrukturTyp = 'unternehmer' | 'firma' | 'filiale';

interface IDeleteStruktureintragData {
  typ: TStrukturTyp;
  unternehmerId: string;
  firmaId?: string;
  filialId?: string;
}

@Injectable({ providedIn: 'root' })
export class StrukturVerwaltungService {
  // ===== Interne Dependency Injection =========

  private readonly injector = inject(Injector);
  private readonly functions = inject(Functions);
  private readonly httpsCallable = inject(HTTPS_CALLABLE);
  private readonly loadingService = inject(LoadingService);
  private readonly netzwerkStatusService = inject(NetzwerkStatusService);

  // ===== Öffentliche Aktionen =================

  /**
   * Löscht einen unreferenzierten Strukturzweig über die geschützte Cloud Function.
   *
   * @param data - Typ und vollständiger Hierarchiekontext des Struktureintrags.
   * @returns Ein Promise, das nach der bestätigten rekursiven Löschung abgeschlossen ist.
   * @throws Gibt Netzwerk- und Callable-Fehler unverändert weiter.
   */
  async deleteStruktureintrag(data: IDeleteStruktureintragData): Promise<void> {
    this.netzwerkStatusService.assertOnline();

    await this.loadingService.trackWrite(async () => {
      await runInInjectionContext(this.injector, () => {
        const deleteStruktureintrag = this.httpsCallable<IDeleteStruktureintragData, void>(
          this.functions,
          'deleteStruktureintrag',
        );
        return deleteStruktureintrag(data);
      });
    });
  }
}
