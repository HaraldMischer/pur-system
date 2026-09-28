// pur-system/src/app/services/firebase/benutzer-verwaltung.service.ts

import { Injectable, Injector, inject, runInInjectionContext } from '@angular/core';
import { Functions } from '@angular/fire/functions';

import { FIRESTORE_COLLECTION_PATHS } from '../../commons/constants/firebase.constants';
import { IBenutzerAnlage, IBenutzerAnlageErgebnis } from '../../commons/models/domain/benutzer';
import {
  IMitarbeiterAuswahl,
  IMitarbeiterAuswahlAnfrage,
} from '../../commons/models/domain/mitarbeiter';
import { HTTPS_CALLABLE } from '../../commons/tokens/firebase.tokens';
import { LoadingService } from '../core/loading.service';
import { NetzwerkStatusService } from '../core/netzwerk-status.service';
import { FirestoreDbService } from './firestore-db.service';

// ===== Top-Level Helper =====================

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function mapMitarbeiterAuswahl(
  dokumente: readonly { id: string; daten: Record<string, unknown> }[],
): IMitarbeiterAuswahl[] {
  return dokumente
    .flatMap((dokument) => {
      if (dokument.daten['aktiv'] !== true) return [];

      const benutzerUid = dokument.daten['benutzerUid'];
      if (
        benutzerUid !== undefined &&
        benutzerUid !== null &&
        (typeof benutzerUid !== 'string' || benutzerUid.trim())
      ) {
        return [];
      }

      const person = dokument.daten['person'];
      if (!isRecord(person)) return [];
      const vorname = typeof person['vorname'] === 'string' ? person['vorname'].trim() : '';
      const nachname = typeof person['nachname'] === 'string' ? person['nachname'].trim() : '';
      return vorname && nachname
        ? [{ id: dokument.id, anzeigename: `${nachname}, ${vorname}` }]
        : [];
    })
    .sort((a, b) => a.anzeigename.localeCompare(b.anzeigename, 'de'));
}

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
}
