// pur-system/src/app/services/firebase/benutzer-verwaltung.service.ts

import { Injectable, Injector, inject, runInInjectionContext } from '@angular/core';
import { Functions } from '@angular/fire/functions';

import { FIRESTORE_COLLECTION_PATHS } from '../../commons/constants/firebase.constants';
import { mapMitarbeiterAuswahl } from '../../commons/mapper/domain/mitarbeiter-auswahl.mapper';
import {
  IBenutzerAnlage,
  IBenutzerAnlageErgebnis,
  IBenutzerMitarbeiterZuordnung,
} from '../../commons/models/domain/benutzer';
import {
  IMitarbeiterAuswahl,
  IMitarbeiterAuswahlAnfrage,
} from '../../commons/models/domain/mitarbeiter';
import { HTTPS_CALLABLE } from '../../commons/tokens/firebase.tokens';
import { LoadingService } from '../core/loading.service';
import { NetzwerkStatusService } from '../core/netzwerk-status.service';
import { FirestoreDbService } from './firestore-db.service';

@Injectable({ providedIn: 'root' })
export class BenutzerVerwaltungService {
  private readonly _injector = inject(Injector);
  private readonly _functions = inject(Functions);
  private readonly _httpsCallable = inject(HTTPS_CALLABLE);
  private readonly _loadingService = inject(LoadingService);
  private readonly _netzwerkStatusService = inject(NetzwerkStatusService);
  private readonly firestoreDbService = inject(FirestoreDbService);

  /**
   * Lädt die aktive, noch nicht verknüpfte Mitarbeiterauswahl einer Firma.
   *
   * @param anfrage - Unternehmer- und Firmen-ID des gewünschten Mitarbeiterkontexts.
   * @returns Ausschließlich Mitarbeiter-IDs und Anzeigenamen.
   * @throws Gibt Firestore-Fehler unverändert weiter.
   */
  async loadMitarbeiterAuswahl(
    anfrage: IMitarbeiterAuswahlAnfrage,
  ): Promise<IMitarbeiterAuswahl[]> {
    const dokumente = await this.firestoreDbService.loadCollection<Record<string, unknown>>(
      FIRESTORE_COLLECTION_PATHS.mitarbeiter(anfrage.unternehmerId, anfrage.firmaId),
      'networkOnly',
    );
    return mapMitarbeiterAuswahl(dokumente);
  }

  async createBenutzer(anlage: IBenutzerAnlage): Promise<IBenutzerAnlageErgebnis> {
    this._netzwerkStatusService.assertOnline();

    return this._loadingService.trackWrite(async () => {
      const result = await runInInjectionContext(this._injector, () => {
        const createBenutzer = this._httpsCallable<IBenutzerAnlage, IBenutzerAnlageErgebnis>(
          this._functions,
          'createBenutzer',
        );

        return createBenutzer(anlage);
      });

      return result.data;
    });
  }

  /**
   * Ordnet ein vorhandenes Mitarbeiterkonto einem anderen fachlichen Mitarbeiter zu.
   *
   * @param uid - UID des neu zuzuordnenden Benutzerkontos.
   * @param zuordnung - Neuer Unternehmer-, Firmen- und Mitarbeiterkontext.
   * @returns Ein Promise, das nach der serverseitig bestätigten Neuzuordnung abgeschlossen ist.
   */
  async updateMitarbeiterZuordnung(
    uid: string,
    zuordnung: IBenutzerMitarbeiterZuordnung,
  ): Promise<void> {
    this._netzwerkStatusService.assertOnline();

    await this._loadingService.trackWrite(async () => {
      await runInInjectionContext(this._injector, () => {
        const updateMitarbeiterZuordnung = this._httpsCallable<
          IBenutzerMitarbeiterZuordnung & { uid: string },
          void
        >(this._functions, 'updateMitarbeiterZuordnung');
        return updateMitarbeiterZuordnung({ uid, ...zuordnung });
      });
    });
  }

  /**
   * Löscht ein Mitarbeiterkonto einschließlich Profil und fachlicher Verknüpfung.
   *
   * @param uid - UID des zu löschenden Mitarbeiterkontos.
   * @returns Ein Promise, das nach der serverseitig bestätigten Löschung abgeschlossen ist.
   */
  async deleteBenutzer(uid: string): Promise<void> {
    this._netzwerkStatusService.assertOnline();

    await this._loadingService.trackWrite(async () => {
      await runInInjectionContext(this._injector, () => {
        const deleteBenutzer = this._httpsCallable<{ uid: string }, void>(
          this._functions,
          'deleteBenutzer',
        );
        return deleteBenutzer({ uid });
      });
    });
  }
}
