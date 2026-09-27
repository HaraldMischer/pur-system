// pur-system/src/app/services/domain/benutzer.service.ts

import { Injectable, inject } from '@angular/core';

import {
  FIRESTORE_COLLECTION_PATHS,
  FIRESTORE_DOCUMENT_PATHS,
} from '../../commons/constants/firebase.constants';
import {
  IBenutzerProfilAktualisierung,
  IBenutzerProfilDokument,
  IBenutzerProfilEintrag,
  TBenutzerZugriffe,
  TUserRole,
} from '../../commons/models/domain/benutzer';
import { buildErlaubteBereiche } from '../../commons/utils/benutzer/erlaubte-bereiche';
import { FirestoreDbService } from '../firebase/firestore-db.service';

type TBenutzerProfilRohdaten = Omit<IBenutzerProfilDokument, 'zugriffe'> & {
  zugriffe?: unknown;
};

@Injectable({
  providedIn: 'root',
})
export class BenutzerService {
  // ===== Interne Dependency Injection =========

  private readonly firestoreDbService = inject(FirestoreDbService);

  // ===== Öffentliche Aktionen =================

  /**
   * Lädt das Benutzerprofil für die übergebene Firebase-Auth-UID.
   *
   * @param uid - UID des angemeldeten Firebase-Benutzers.
   * @returns Das normalisierte Benutzerprofil oder `null`, wenn kein Profil existiert.
   * @throws Gibt Fehler des Firestore-Zugriffs an die aufrufende Stelle weiter.
   */
  async getBenutzerProfil(uid: string): Promise<IBenutzerProfilDokument | null> {
    const dokument = await this.firestoreDbService.loadDocument<TBenutzerProfilRohdaten>(
      FIRESTORE_DOCUMENT_PATHS.benutzerprofil(uid),
    );

    if (!dokument) {
      return null;
    }

    return this.mapBenutzerProfil(dokument.daten);
  }

  /**
   * Beobachtet das Benutzerprofil für die übergebene Firebase-Auth-UID in Echtzeit.
   *
   * @param uid - UID des angemeldeten Firebase-Benutzers.
   * @param next - Wird bei jedem Profilstand mit dem normalisierten Profil oder `null` aufgerufen.
   * @param error - Wird bei einem Fehler des Echtzeit-Listeners aufgerufen.
   * @returns Funktion zum Beenden des Echtzeit-Listeners.
   */
  observeBenutzerProfil(
    uid: string,
    next: (profil: IBenutzerProfilDokument | null) => void,
    error: (error: unknown) => void,
  ): () => void {
    return this.firestoreDbService.observeDocument<TBenutzerProfilRohdaten>(
      FIRESTORE_DOCUMENT_PATHS.benutzerprofil(uid),
      (dokument) => {
        next(dokument ? this.mapBenutzerProfil(dokument.daten) : null);
      },
      error,
    );
  }

  /**
   * Lädt alle Benutzerprofile für die Systemverwaltung.
   *
   * @returns Die nach Anzeigename sortierten Profile einschließlich ihrer Dokument-ID als UID.
   * @throws Gibt Fehler des Firestore-Zugriffs an die aufrufende Stelle weiter.
   */
  async loadBenutzerProfile(): Promise<IBenutzerProfilEintrag[]> {
    const dokumente = await this.firestoreDbService.loadCollection<TBenutzerProfilRohdaten>(
      FIRESTORE_COLLECTION_PATHS.benutzerprofile,
    );

    return dokumente
      .map((dokument) => ({
        uid: dokument.id,
        ...this.mapBenutzerProfil(dokument.daten),
      }))
      .sort((a, b) => a.anzeigename.localeCompare(b.anzeigename, 'de'));
  }

  /**
   * Aktualisiert die direkt bearbeitbaren Felder eines Benutzerprofils.
   *
   * @param uid - UID des zu aktualisierenden Benutzerprofils.
   * @param userRole - Unveränderliche Rolle des Benutzerprofils.
   * @param aktualisierung - Die bearbeitbaren Profilfelder.
   * @returns Die tatsächlich gespeicherte Profilaktualisierung.
   * @throws Gibt Fehler des Firestore-Zugriffs an die aufrufende Stelle weiter.
   */
  async updateBenutzerProfil(
    uid: string,
    userRole: TUserRole,
    aktualisierung: IBenutzerProfilAktualisierung,
  ): Promise<IBenutzerProfilAktualisierung> {
    const gespeicherteAktualisierung: IBenutzerProfilAktualisierung = {
      ...aktualisierung,
      erlaubteBereiche: buildErlaubteBereiche(userRole, aktualisierung.erlaubteBereiche),
    };

    await this.firestoreDbService.updateDocument(FIRESTORE_DOCUMENT_PATHS.benutzerprofil(uid), {
      ...gespeicherteAktualisierung,
      aktualisiertAm: this.firestoreDbService.createServerTimestamp(),
    });

    return gespeicherteAktualisierung;
  }

  // ===== Interne Helfer =======================

  private parseZugriffe(value: unknown, userRole: TUserRole): TBenutzerZugriffe {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      return {};
    }

    const zugriffe: Array<[string, Record<string, string[]>]> = [];
    for (const [unternehmerId, firmenValue] of Object.entries(value)) {
      if (typeof firmenValue !== 'object' || firmenValue === null || Array.isArray(firmenValue)) {
        continue;
      }

      const firmen: Array<[string, string[]]> = [];
      for (const [firmaId, filialenValue] of Object.entries(firmenValue)) {
        if (
          Array.isArray(filialenValue) &&
          (filialenValue.length > 0 || userRole === 'mitarbeiter') &&
          filialenValue.every((id) => typeof id === 'string')
        ) {
          firmen.push([firmaId, filialenValue]);
        }
      }
      zugriffe.push([unternehmerId, Object.fromEntries(firmen)]);
    }

    return Object.fromEntries(zugriffe);
  }

  private mapBenutzerProfil(profil: TBenutzerProfilRohdaten): IBenutzerProfilDokument {
    const firmaMitarbeiterId =
      profil.userRole === 'mitarbeiter' &&
      typeof profil.firmaMitarbeiterId === 'string' &&
      profil.firmaMitarbeiterId.trim()
        ? profil.firmaMitarbeiterId.trim()
        : undefined;

    return {
      email: profil.email,
      anmeldename: profil.anmeldename,
      anzeigename: profil.anzeigename,
      aktiv: profil.aktiv,
      userRole: profil.userRole,
      erlaubteBereiche: buildErlaubteBereiche(profil.userRole, profil.erlaubteBereiche),
      zugriffe: this.parseZugriffe(profil.zugriffe, profil.userRole),
      ...(firmaMitarbeiterId ? { firmaMitarbeiterId } : {}),
      erstelltAm: profil.erstelltAm,
      aktualisiertAm: profil.aktualisiertAm,
    };
  }
}
