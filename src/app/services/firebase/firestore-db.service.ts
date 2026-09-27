// pur-system/src/app/services/firebase/firestore-db.service.ts

import { EnvironmentInjector, Injectable, inject, runInInjectionContext } from '@angular/core';
import { DocumentData, FieldValue, Firestore } from '@angular/fire/firestore';

import {
  FIRESTORE_ADD_DOC,
  FIRESTORE_COLLECTION,
  FIRESTORE_DELETE_DOC,
  FIRESTORE_DOC,
  FIRESTORE_GET_DOC,
  FIRESTORE_GET_DOCS,
  FIRESTORE_ON_SNAPSHOT,
  FIRESTORE_QUERY,
  FIRESTORE_SERVER_TIMESTAMP,
  FIRESTORE_SET_DOC,
  FIRESTORE_WHERE,
} from '../../commons/tokens/firebase.tokens';
import { LoadingService } from '../core/loading.service';
import { NetzwerkStatusService } from '../core/netzwerk-status.service';

export interface IFirestoreDokument<T extends DocumentData> {
  id: string;
  daten: T;
}

@Injectable({ providedIn: 'root' })
export class FirestoreDbService {
  // ===== Interne Dependency Injection =========

  private readonly environmentInjector = inject(EnvironmentInjector);
  private readonly firestore = inject(Firestore);
  private readonly addDoc = inject(FIRESTORE_ADD_DOC);
  private readonly collection = inject(FIRESTORE_COLLECTION);
  private readonly deleteDoc = inject(FIRESTORE_DELETE_DOC);
  private readonly doc = inject(FIRESTORE_DOC);
  private readonly getDoc = inject(FIRESTORE_GET_DOC);
  private readonly getDocs = inject(FIRESTORE_GET_DOCS);
  private readonly onSnapshot = inject(FIRESTORE_ON_SNAPSHOT);
  private readonly query = inject(FIRESTORE_QUERY);
  private readonly loadingService = inject(LoadingService);
  private readonly netzwerkStatusService = inject(NetzwerkStatusService);
  private readonly serverTimestamp = inject(FIRESTORE_SERVER_TIMESTAMP);
  private readonly setDoc = inject(FIRESTORE_SET_DOC);
  private readonly where = inject(FIRESTORE_WHERE);

  // ===== Interner State =======================

  private readonly laufendeLeseauftraege = new Map<string, Promise<unknown>>();

  // ===== Öffentliche Aktionen =================

  /**
   * Lädt alle Dokumente einer Firestore-Collection.
   *
   * @param collectionPath - Vollständiger Pfad der Collection.
   * @returns Dokument-IDs und unveränderte Firestore-Daten.
   * @throws Gibt Fehler des Firestore-Zugriffs an die aufrufende Stelle weiter.
   */
  loadCollection<T extends DocumentData>(collectionPath: string): Promise<IFirestoreDokument<T>[]> {
    return this.getOrCreateLeseauftrag(`collection:${collectionPath}`, () => {
      return this.loadingService.trackLoad(async () => {
        const snapshot = await this.runInContext(() => {
          const collectionRef = this.collection(this.firestore, collectionPath);
          return this.getDocs(collectionRef);
        });

        return snapshot.docs.map((dokument) => {
          return {
            id: dokument.id,
            daten: dokument.data() as T,
          };
        });
      });
    });
  }

  /**
   * Lädt Dokumente, deren Array-Feld einen bestimmten Wert enthält.
   *
   * @param collectionPath - Vollständiger Pfad der Collection.
   * @param feld - Name des zu filternden Array-Felds.
   * @param wert - Im Array enthaltener Vergleichswert.
   * @returns Dokument-IDs und unveränderte Firestore-Daten.
   * @throws Gibt Fehler des Firestore-Zugriffs an die aufrufende Stelle weiter.
   */
  loadCollectionByArrayValue<T extends DocumentData>(
    collectionPath: string,
    feld: string,
    wert: unknown,
  ): Promise<IFirestoreDokument<T>[]> {
    const auftragKey = `collection-array:${collectionPath}:${feld}:${JSON.stringify(wert)}`;
    return this.getOrCreateLeseauftrag(auftragKey, () => {
      return this.loadingService.trackLoad(async () => {
        const snapshot = await this.runInContext(() => {
          const collectionRef = this.collection(this.firestore, collectionPath);
          const queryRef = this.query(collectionRef, this.where(feld, 'array-contains', wert));
          return this.getDocs(queryRef);
        });

        return snapshot.docs.map((dokument) => {
          return {
            id: dokument.id,
            daten: dokument.data() as T,
          };
        });
      });
    });
  }

  /**
   * Lädt ein einzelnes Firestore-Dokument.
   *
   * @param documentPath - Vollständiger Pfad des Dokuments.
   * @returns Dokument-ID und Daten oder `null`, wenn das Dokument nicht existiert.
   * @throws Gibt Fehler des Firestore-Zugriffs an die aufrufende Stelle weiter.
   */
  loadDocument<T extends DocumentData>(
    documentPath: string,
  ): Promise<IFirestoreDokument<T> | null> {
    return this.getOrCreateLeseauftrag(`document:${documentPath}`, () => {
      return this.loadingService.trackLoad(async () => {
        const snapshot = await this.runInContext(() => {
          const documentRef = this.doc(this.firestore, documentPath);
          return this.getDoc(documentRef);
        });

        if (!snapshot.exists()) {
          return null;
        }

        return {
          id: snapshot.id,
          daten: snapshot.data() as T,
        };
      });
    });
  }

  /**
   * Beobachtet ein einzelnes Firestore-Dokument in Echtzeit.
   *
   * @param documentPath - Vollständiger Pfad des Dokuments.
   * @param next - Wird bei jedem Dokumentstand mit den Daten oder `null` aufgerufen.
   * @param error - Wird bei einem Fehler des Echtzeit-Listeners aufgerufen.
   * @returns Funktion zum Beenden des Echtzeit-Listeners.
   */
  observeDocument<T extends DocumentData>(
    documentPath: string,
    next: (dokument: IFirestoreDokument<T> | null) => void,
    error: (error: unknown) => void,
  ): () => void {
    return this.runInContext(() => {
      const documentRef = this.doc(this.firestore, documentPath);
      return this.onSnapshot(
        documentRef,
        (snapshot) => {
          next(
            snapshot.exists()
              ? {
                  id: snapshot.id,
                  daten: snapshot.data() as T,
                }
              : null,
          );
        },
        error,
      );
    });
  }

  /**
   * Legt ein Dokument mit automatisch erzeugter Dokument-ID an.
   *
   * @param collectionPath - Vollständiger Pfad der Ziel-Collection.
   * @param daten - Zu speichernde Dokumentdaten.
   * @returns Die von Firestore erzeugte Dokument-ID.
   * @throws Gibt Fehler des Firestore-Zugriffs an die aufrufende Stelle weiter.
   */
  async createDocument<T extends DocumentData>(collectionPath: string, daten: T): Promise<string> {
    this.netzwerkStatusService.assertOnline();

    return this.loadingService.trackWrite(async () => {
      const dokumentRef = await this.runInContext(() => {
        const collectionRef = this.collection(this.firestore, collectionPath);
        return this.addDoc(collectionRef, daten);
      });

      return dokumentRef.id;
    });
  }

  /**
   * Löscht ein einzelnes Firestore-Dokument.
   *
   * @param documentPath - Vollständiger Pfad des zu löschenden Dokuments.
   * @returns Ein Promise, das nach der bestätigten Löschung abgeschlossen ist.
   * @throws Gibt Fehler des Firestore-Zugriffs an die aufrufende Stelle weiter.
   */
  async deleteDocument(documentPath: string): Promise<void> {
    this.netzwerkStatusService.assertOnline();

    await this.loadingService.trackWrite(async () => {
      await this.runInContext(() => {
        const documentRef = this.doc(this.firestore, documentPath);
        return this.deleteDoc(documentRef);
      });
    });
  }

  /**
   * Aktualisiert ein Dokument, ohne nicht übergebene Felder zu entfernen.
   *
   * @param documentPath - Vollständiger Pfad des Dokuments.
   * @param daten - Zu aktualisierende Dokumentfelder.
   * @returns Ein Promise, das nach dem bestätigten Schreibvorgang abgeschlossen ist.
   * @throws Gibt Fehler des Firestore-Zugriffs an die aufrufende Stelle weiter.
   */
  async updateDocument<T extends DocumentData>(documentPath: string, daten: T): Promise<void> {
    this.netzwerkStatusService.assertOnline();

    await this.loadingService.trackWrite(async () => {
      await this.runInContext(() => {
        const documentRef = this.doc(this.firestore, documentPath);
        return this.setDoc(documentRef, daten, { merge: true });
      });
    });
  }

  /**
   * Erzeugt einen serverseitig aufgelösten Firestore-Zeitstempel.
   *
   * @returns Platzhalter für den Firestore-Server-Zeitstempel.
   */
  createServerTimestamp(): FieldValue {
    return this.serverTimestamp();
  }

  // ===== Interne Helfer =======================

  /**
   * Verwendet einen bereits laufenden Leseauftrag für denselben Schlüssel erneut.
   *
   * @param key - Eindeutiger Schlüssel aus Leseart und Firestore-Pfad.
   * @param load - Erst bei fehlendem Auftrag auszuführende Ladefunktion.
   * @returns Der vorhandene oder neu gestartete Leseauftrag.
   */
  private getOrCreateLeseauftrag<T>(key: string, load: () => Promise<T>): Promise<T> {
    const laufenderAuftrag = this.laufendeLeseauftraege.get(key) as Promise<T> | undefined;
    if (laufenderAuftrag) return laufenderAuftrag;

    const auftrag = load().finally(() => {
      if (this.laufendeLeseauftraege.get(key) === auftrag) {
        this.laufendeLeseauftraege.delete(key);
      }
    });
    this.laufendeLeseauftraege.set(key, auftrag);
    return auftrag;
  }

  private runInContext<T>(aktion: () => T): T {
    return runInInjectionContext(this.environmentInjector, aktion);
  }
}
