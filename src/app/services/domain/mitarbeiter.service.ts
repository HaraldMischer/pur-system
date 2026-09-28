// pur-system/src/app/services/domain/mitarbeiter.service.ts

import { Injectable, inject } from '@angular/core';

import { environment } from '../../../environments/environment';
import {
  FIRESTORE_COLLECTION_PATHS,
  FIRESTORE_DOCUMENT_PATHS,
} from '../../commons/constants/firebase.constants';
import {
  IMitarbeiterAktualisierung,
  IMitarbeiterAnlage,
  IMitarbeiterAnlageErgebnis,
  IMitarbeiterEintrag,
  TMitarbeiterRolle,
} from '../../commons/models/domain/mitarbeiter';
import { TFirestoreLesestrategie } from '../../commons/models/app/firestore-lesestrategie.types';
import { EGender, IPerson } from '../../commons/models/domain/person';
import { FirestoreDbService } from '../firebase/firestore-db.service';

// ===== Top-Level Helper =====================

const MITARBEITER_ROLLEN: readonly TMitarbeiterRolle[] = ['service', 'kasse', 'admin'];
const GESCHLECHTER = new Set<string>(Object.values(EGender));

function mapMitarbeiterEintrag(
  unternehmerId: string,
  firmaId: string,
  id: string,
  daten: Record<string, unknown>,
): IMitarbeiterEintrag {
  const person = mapPerson(daten['person']);
  const rolle = daten['rolle'];

  return {
    id,
    unternehmerId,
    firmaId,
    person,
    rolle: isMitarbeiterRolle(rolle) ? rolle : 'service',
    filialIds: getDokumentIds(daten['filialIds']),
    aktiv: daten['aktiv'] === true,
  };
}

function mapPerson(value: unknown): IPerson {
  const person = asRecord(value);
  const adresse = asRecord(person['adresse']);
  const kontakt = asRecord(person['kontakt']);
  const geburtstag = getOptionalString(person['geburtstag']);
  const geschlecht = getOptionalString(person['geschlecht']);
  const email = getOptionalString(kontakt['email']);
  const telefon = getOptionalString(kontakt['telefon']);
  const mobil = getOptionalString(kontakt['mobil']);
  const webseite = getOptionalString(kontakt['webseite']);

  return {
    vorname: getString(person['vorname']),
    nachname: getString(person['nachname']),
    adresse: {
      strasse: getString(adresse['strasse']),
      hausnummer: getString(adresse['hausnummer']),
      postleitzahl: getString(adresse['postleitzahl']),
      ort: getString(adresse['ort']),
    },
    kontakt: {
      ...(email ? { email } : {}),
      ...(telefon ? { telefon } : {}),
      ...(mobil ? { mobil } : {}),
      ...(webseite ? { webseite } : {}),
    },
    ...(geburtstag ? { geburtstag } : {}),
    ...(geschlecht && GESCHLECHTER.has(geschlecht) ? { geschlecht: geschlecht as EGender } : {}),
  };
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function getString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function getOptionalString(value: unknown): string | undefined {
  const text = getString(value);
  return text || undefined;
}

function getDokumentIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map(getString).filter(Boolean))];
}

function isMitarbeiterRolle(value: unknown): value is TMitarbeiterRolle {
  return typeof value === 'string' && MITARBEITER_ROLLEN.includes(value as TMitarbeiterRolle);
}

function sortMitarbeiter(mitarbeiter: readonly IMitarbeiterEintrag[]): IMitarbeiterEintrag[] {
  return [...mitarbeiter].sort((a, b) => {
    const nachname = a.person.nachname.localeCompare(b.person.nachname, 'de');
    return nachname || a.person.vorname.localeCompare(b.person.vorname, 'de');
  });
}

@Injectable({ providedIn: 'root' })
export class MitarbeiterService {
  // ===== Interne Dependency Injection =========

  private readonly firestoreDbService = inject(FirestoreDbService);

  // ===== Öffentliche Aktionen =================

  /**
   * Lädt alle Mitarbeiter einer Firma und bildet sie als sortierte Domäneneinträge ab.
   *
   * @param unternehmerId - Die Dokument-ID des übergeordneten Unternehmers.
   * @param firmaId - Die Dokument-ID der übergeordneten Firma.
   * @param filialId - Optionale Filial-ID zur Begrenzung eines Filialkontos.
   * @param strategie - Datenquellenstrategie für den Ladevorgang.
   * @returns Die nach Nachname und Vorname sortierten Mitarbeiter.
   * @throws Gibt Fehler des Firestore-Zugriffs an die aufrufende Stelle weiter.
   */
  async loadMitarbeiter(
    unternehmerId: string,
    firmaId: string,
    filialId?: string,
    strategie: TFirestoreLesestrategie = environment.firestoreLesestrategien.stammdaten,
  ): Promise<IMitarbeiterEintrag[]> {
    const collectionPath = FIRESTORE_COLLECTION_PATHS.mitarbeiter(unternehmerId, firmaId);
    const dokumente = filialId
      ? await this.firestoreDbService.loadCollectionByArrayValue<Record<string, unknown>>(
          collectionPath,
          'filialIds',
          filialId,
          strategie,
        )
      : await this.firestoreDbService.loadCollection<Record<string, unknown>>(
          collectionPath,
          strategie,
        );

    return sortMitarbeiter(
      dokumente.map((dokument) => {
        return mapMitarbeiterEintrag(unternehmerId, firmaId, dokument.id, dokument.daten);
      }),
    );
  }

  /**
   * Legt einen aktiven Mitarbeiter unter einer Firma an.
   *
   * @param unternehmerId - Die Dokument-ID des übergeordneten Unternehmers.
   * @param firmaId - Die Dokument-ID der übergeordneten Firma.
   * @param anlage - Personen-, Rollen- und Filialdaten des neuen Mitarbeiters.
   * @returns Das Anlageergebnis mit der erzeugten Dokument-ID.
   * @throws Gibt Fehler des Firestore-Zugriffs an die aufrufende Stelle weiter.
   */
  async createMitarbeiter(
    unternehmerId: string,
    firmaId: string,
    anlage: IMitarbeiterAnlage,
  ): Promise<IMitarbeiterAnlageErgebnis> {
    const zeitstempel = this.firestoreDbService.createServerTimestamp();
    const id = await this.firestoreDbService.createDocument(
      FIRESTORE_COLLECTION_PATHS.mitarbeiter(unternehmerId, firmaId),
      {
        ...anlage,
        aktiv: true,
        erstelltAm: zeitstempel,
        aktualisiertAm: zeitstempel,
      },
    );

    return { id };
  }

  /**
   * Aktualisiert die bearbeitbaren Daten eines Mitarbeiters.
   *
   * @param unternehmerId - Die Dokument-ID des übergeordneten Unternehmers.
   * @param firmaId - Die Dokument-ID der übergeordneten Firma.
   * @param mitarbeiterId - Die Dokument-ID des Mitarbeiters.
   * @param aktualisierung - Die bearbeitbaren Personen-, Rollen-, Filial- und Statusdaten.
   * @returns Ein Promise, das nach dem bestätigten Schreibvorgang abgeschlossen ist.
   * @throws Gibt Fehler des Firestore-Zugriffs an die aufrufende Stelle weiter.
   */
  async updateMitarbeiter(
    unternehmerId: string,
    firmaId: string,
    mitarbeiterId: string,
    aktualisierung: IMitarbeiterAktualisierung,
  ): Promise<void> {
    await this.firestoreDbService.updateDocument(
      FIRESTORE_DOCUMENT_PATHS.mitarbeiter(unternehmerId, firmaId, mitarbeiterId),
      {
        ...aktualisierung,
        aktualisiertAm: this.firestoreDbService.createServerTimestamp(),
      },
    );
  }

  /**
   * Löscht einen nicht mit einem Benutzerkonto verknüpften Mitarbeiter.
   *
   * @param unternehmerId - Die Dokument-ID des übergeordneten Unternehmers.
   * @param firmaId - Die Dokument-ID der übergeordneten Firma.
   * @param mitarbeiterId - Die Dokument-ID des Mitarbeiters.
   * @returns Ein Promise, das nach der bestätigten Löschung abgeschlossen ist.
   * @throws Gibt Fehler des Firestore-Zugriffs an die aufrufende Stelle weiter.
   */
  async deleteMitarbeiter(
    unternehmerId: string,
    firmaId: string,
    mitarbeiterId: string,
  ): Promise<void> {
    await this.firestoreDbService.deleteDocument(
      FIRESTORE_DOCUMENT_PATHS.mitarbeiter(unternehmerId, firmaId, mitarbeiterId),
    );
  }
}
