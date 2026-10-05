// pur-system/src/app/services/domain/mitarbeiter.service.ts

import { Injectable, inject } from '@angular/core';

import { environment } from '../../../environments/environment';
import {
  FIRESTORE_COLLECTION_PATHS,
  FIRESTORE_DOCUMENT_PATHS,
} from '../../commons/constants/firebase.constants';
import { ISystemmigrationDokument } from '../../commons/models/domain/datenmigration';
import {
  IMitarbeiterAktualisierung,
  IMitarbeiterAnlage,
  IMitarbeiterAnlageErgebnis,
  IMitarbeiterEintrag,
  TMitarbeiterPerson,
  TMitarbeiterRolle,
} from '../../commons/models/domain/mitarbeiter';
import { TFirestoreLesestrategie } from '../../commons/models/app/firestore-lesestrategie.types';
import { FirestoreDbService } from '../firebase/firestore-db.service';

// ===== Top-Level Helper =====================

const MITARBEITER_ROLLEN: readonly TMitarbeiterRolle[] = ['service', 'kasse', 'admin'];

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

function mapPerson(value: unknown): TMitarbeiterPerson {
  const person = asRecord(value);
  const adresse = asRecord(person['adresse']);
  const kontakt = asRecord(person['kontakt']);
  const geburtstag = getOptionalString(person['geburtstag']);
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

function createAnzeigename(person: TMitarbeiterPerson): string {
  return `${person.vorname.trim()} ${person.nachname.trim()}`.trim();
}

function createMitarbeiterPerson(person: TMitarbeiterPerson): TMitarbeiterPerson {
  return {
    vorname: person.vorname,
    nachname: person.nachname,
    adresse: person.adresse,
    kontakt: person.kontakt,
    ...(person.geburtstag ? { geburtstag: person.geburtstag } : {}),
  };
}

function sortMitarbeiter(mitarbeiter: readonly IMitarbeiterEintrag[]): IMitarbeiterEintrag[] {
  return [...mitarbeiter].sort((a, b) => {
    const nachname = a.person.nachname.localeCompare(b.person.nachname, 'de');
    return nachname || a.person.vorname.localeCompare(b.person.vorname, 'de');
  });
}

function removeMitarbeiterIdZuordnung(
  systemmigration: ISystemmigrationDokument,
  firmaId: string,
  mitarbeiterId: string,
): NonNullable<ISystemmigrationDokument['mitarbeiterIds']> | null {
  const mitarbeiterIds = systemmigration.mitarbeiterIds;
  if (!mitarbeiterIds) return null;

  let aktualisiert = false;
  const bereinigteFirmen = Object.fromEntries(
    Object.entries(mitarbeiterIds).flatMap(([purCompanyId, filialen]) => {
      if (systemmigration.firmenIds?.[purCompanyId] !== firmaId) {
        return [[purCompanyId, filialen]];
      }

      const bereinigteFilialen = Object.fromEntries(
        Object.entries(filialen).flatMap(([purBranchId, ids]) => {
          const bereinigteIds = Object.fromEntries(
            Object.entries(ids).filter(([, zielId]) => {
              const behalten = zielId !== mitarbeiterId;
              aktualisiert ||= !behalten;
              return behalten;
            }),
          );
          return Object.keys(bereinigteIds).length > 0 ? [[purBranchId, bereinigteIds]] : [];
        }),
      );
      return Object.keys(bereinigteFilialen).length > 0 ? [[purCompanyId, bereinigteFilialen]] : [];
    }),
  );

  return aktualisiert ? bereinigteFirmen : null;
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
   * Lädt die eindeutige Mitarbeitermenge mehrerer Filialen einer Firma.
   *
   * @param unternehmerId - Die Dokument-ID des übergeordneten Unternehmers.
   * @param firmaId - Die Dokument-ID der übergeordneten Firma.
   * @param filialIds - Filial-IDs, denen mindestens eine Mitarbeiterzuordnung entsprechen muss.
   * @param strategie - Datenquellenstrategie für den Ladevorgang.
   * @returns Die nach Nachname und Vorname sortierten Mitarbeiter ohne Mehrfachtreffer.
   * @throws Gibt Fehler des Firestore-Zugriffs an die aufrufende Stelle weiter.
   */
  async loadMitarbeiterNachFilialen(
    unternehmerId: string,
    firmaId: string,
    filialIds: readonly string[],
    strategie: TFirestoreLesestrategie = environment.firestoreLesestrategien.stammdaten,
  ): Promise<IMitarbeiterEintrag[]> {
    const eindeutigeFilialIds = [...new Set(filialIds)];
    if (eindeutigeFilialIds.length === 0) {
      return [];
    }

    const dokumente = await this.firestoreDbService.loadCollectionByAnyArrayValue<
      Record<string, unknown>
    >(
      FIRESTORE_COLLECTION_PATHS.mitarbeiter(unternehmerId, firmaId),
      'filialIds',
      eindeutigeFilialIds,
      strategie,
    );

    return sortMitarbeiter(
      dokumente.map((dokument) => {
        return mapMitarbeiterEintrag(unternehmerId, firmaId, dokument.id, dokument.daten);
      }),
    );
  }

  /**
   * Lädt einen Mitarbeiter gezielt über seine Dokument-ID.
   *
   * @param unternehmerId - Die Dokument-ID des übergeordneten Unternehmers.
   * @param firmaId - Die Dokument-ID der übergeordneten Firma.
   * @param mitarbeiterId - Die Dokument-ID des Mitarbeiters.
   * @param strategie - Datenquellenstrategie für den Ladevorgang.
   * @returns Der Mitarbeiter oder `null`, wenn das Dokument nicht existiert.
   * @throws Gibt Fehler des Firestore-Zugriffs an die aufrufende Stelle weiter.
   */
  async loadMitarbeiterEintrag(
    unternehmerId: string,
    firmaId: string,
    mitarbeiterId: string,
    strategie: TFirestoreLesestrategie = environment.firestoreLesestrategien.stammdaten,
  ): Promise<IMitarbeiterEintrag | null> {
    const dokument = await this.firestoreDbService.loadDocument<Record<string, unknown>>(
      FIRESTORE_DOCUMENT_PATHS.mitarbeiter(unternehmerId, firmaId, mitarbeiterId),
      strategie,
    );

    return dokument
      ? mapMitarbeiterEintrag(unternehmerId, firmaId, dokument.id, dokument.daten)
      : null;
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
        person: createMitarbeiterPerson(anlage.person),
        anzeigename: createAnzeigename(anlage.person),
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
        person: createMitarbeiterPerson(aktualisierung.person),
        anzeigename: createAnzeigename(aktualisierung.person),
        aktualisiertAm: this.firestoreDbService.createServerTimestamp(),
      },
    );
  }

  /**
   * Löscht einen nicht mit einem Benutzerkonto verknüpften Mitarbeiter und seine Migrationszuordnungen.
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
    const systemmigrationen =
      await this.firestoreDbService.loadCollection<ISystemmigrationDokument>(
        FIRESTORE_COLLECTION_PATHS.systemMigrationen,
        'networkOnly',
      );
    const zuordnungsUpdates = systemmigrationen.flatMap((dokument) => {
      if (dokument.daten.unternehmerId !== unternehmerId) return [];
      const mitarbeiterIds = removeMitarbeiterIdZuordnung(dokument.daten, firmaId, mitarbeiterId);
      return mitarbeiterIds ? [{ purCustomerId: dokument.id, mitarbeiterIds }] : [];
    });

    await this.firestoreDbService.deleteDocument(
      FIRESTORE_DOCUMENT_PATHS.mitarbeiter(unternehmerId, firmaId, mitarbeiterId),
    );
    for (const update of zuordnungsUpdates) {
      await this.firestoreDbService.replaceDocumentFields(
        FIRESTORE_DOCUMENT_PATHS.systemmigration(update.purCustomerId),
        {
          mitarbeiterIds: update.mitarbeiterIds,
          aktualisiertAm: this.firestoreDbService.createServerTimestamp(),
        },
      );
    }
  }
}
