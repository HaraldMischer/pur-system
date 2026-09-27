// pur-system/src/app/services/domain/filiale.service.ts

import { Injectable, inject } from '@angular/core';

import {
  FIRESTORE_COLLECTION_PATHS,
  FIRESTORE_DOCUMENT_PATHS,
} from '../../commons/constants/firebase.constants';
import {
  IFilialeAnlage,
  IFilialeAnlageErgebnis,
  IFilialeAktualisierung,
  IFilialeEintrag,
} from '../../commons/models/domain/filiale';
import { FirestoreDbService } from '../firebase/firestore-db.service';
import { StrukturVerwaltungService } from '../firebase/struktur-verwaltung.service';

// ===== Top-Level Helper =====================

function mapFilialeEintrag(id: string, daten: Record<string, unknown>): IFilialeEintrag {
  const anzeigename = daten['anzeigename'];
  const filialname = daten['filialname'];
  const nummer = daten['nummer'];
  const adresse = asRecord(daten['adresse']);
  const kontakt = asRecord(daten['kontakt']);
  const email = getOptionalString(kontakt['email']);
  const telefon = getOptionalString(kontakt['telefon']);
  const mobil = getOptionalString(kontakt['mobil']);
  const webseite = getOptionalString(kontakt['webseite']);

  return {
    id,
    anzeigename: typeof anzeigename === 'string' && anzeigename.trim() ? anzeigename.trim() : id,
    filialname: typeof filialname === 'string' && filialname.trim() ? filialname.trim() : id,
    nummer: Number.isInteger(nummer) && Number(nummer) > 0 ? Number(nummer) : 0,
    aktiv: daten['aktiv'] === true,
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
  };
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function getString(value: unknown, fallback = ''): string {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function getOptionalString(value: unknown): string | undefined {
  const text = getString(value);
  return text || undefined;
}

@Injectable({ providedIn: 'root' })
export class FilialeService {
  // ===== Interne Dependency Injection =========

  private readonly firestoreDbService = inject(FirestoreDbService);
  private readonly strukturVerwaltungService = inject(StrukturVerwaltungService);

  // ===== Öffentliche Aktionen =================

  /**
   * Lädt alle Filialen einer Firma und bildet sie als sortierte Domäneneinträge ab.
   *
   * @param unternehmerId - Die Dokument-ID des übergeordneten Unternehmers.
   * @param firmaId - Die Dokument-ID der übergeordneten Firma.
   * @returns Die nach Anzeigename sortierten Filialen.
   * @throws Gibt Fehler des Firestore-Zugriffs an die aufrufende Stelle weiter.
   */
  async loadFilialen(unternehmerId: string, firmaId: string): Promise<IFilialeEintrag[]> {
    const dokumente = await this.firestoreDbService.loadCollection<Record<string, unknown>>(
      FIRESTORE_COLLECTION_PATHS.filialen(unternehmerId, firmaId),
    );

    return dokumente
      .map((dokument) => mapFilialeEintrag(dokument.id, dokument.daten))
      .sort((a, b) => a.anzeigename.localeCompare(b.anzeigename, 'de'));
  }

  /**
   * Lädt eine Filiale gezielt über ihren vollständigen Dokumentpfad.
   *
   * @param unternehmerId - Die Dokument-ID des übergeordneten Unternehmers.
   * @param firmaId - Die Dokument-ID der übergeordneten Firma.
   * @param filialeId - Die Dokument-ID der Filiale.
   * @returns Der kompakte Filialeintrag oder `null`, wenn das Dokument nicht existiert.
   * @throws Gibt Fehler des Firestore-Zugriffs an die aufrufende Stelle weiter.
   */
  async loadFilialeEintrag(
    unternehmerId: string,
    firmaId: string,
    filialeId: string,
  ): Promise<IFilialeEintrag | null> {
    const dokument = await this.firestoreDbService.loadDocument<Record<string, unknown>>(
      FIRESTORE_DOCUMENT_PATHS.filiale(unternehmerId, firmaId, filialeId),
    );

    return dokument ? mapFilialeEintrag(dokument.id, dokument.daten) : null;
  }

  /**
   * Legt eine Filiale mit der übergebenen fortlaufenden Nummer unter einer Firma an.
   *
   * @param unternehmerId - Die Dokument-ID des übergeordneten Unternehmers.
   * @param firmaId - Die Dokument-ID der übergeordneten Firma.
   * @param anlage - Die Anzeige-, Namens-, Adress- und Kontaktdaten der neuen Filiale.
   * @param nummer - Die für die Filiale ermittelte fortlaufende Nummer.
   * @returns Das Anlageergebnis mit Dokument-ID, Nummer und Anzeigename.
   * @throws Gibt Fehler des Firestore-Zugriffs an die aufrufende Stelle weiter.
   */
  async createFiliale(
    unternehmerId: string,
    firmaId: string,
    anlage: IFilialeAnlage,
    nummer: number,
  ): Promise<IFilialeAnlageErgebnis> {
    const zeitstempel = this.firestoreDbService.createServerTimestamp();
    const id = await this.firestoreDbService.createDocument(
      FIRESTORE_COLLECTION_PATHS.filialen(unternehmerId, firmaId),
      {
        ...anlage,
        nummer,
        aktiv: true,
        erstelltAm: zeitstempel,
        aktualisiertAm: zeitstempel,
      },
    );

    return {
      id,
      nummer,
      anzeigename: anlage.anzeigename,
    };
  }

  /**
   * Aktualisiert die bearbeitbaren Stammdaten einer Filiale.
   *
   * @param unternehmerId - Die Dokument-ID des übergeordneten Unternehmers.
   * @param firmaId - Die Dokument-ID der übergeordneten Firma.
   * @param filialeId - Die Dokument-ID der zu aktualisierenden Filiale.
   * @param aktualisierung - Die bearbeitbaren Anzeige-, Adress- und Kontaktdaten.
   * @returns Ein Promise, das nach dem bestätigten Schreibvorgang abgeschlossen ist.
   * @throws Gibt Fehler des Firestore-Zugriffs an die aufrufende Stelle weiter.
   */
  async updateFiliale(
    unternehmerId: string,
    firmaId: string,
    filialeId: string,
    aktualisierung: IFilialeAktualisierung,
  ): Promise<void> {
    await this.firestoreDbService.updateDocument(
      FIRESTORE_DOCUMENT_PATHS.filiale(unternehmerId, firmaId, filialeId),
      {
        ...aktualisierung,
        aktualisiertAm: this.firestoreDbService.createServerTimestamp(),
      },
    );
  }

  /**
   * Löscht eine unreferenzierte Filiale einschließlich ihrer untergeordneten Daten.
   *
   * @param unternehmerId - Die Dokument-ID des übergeordneten Unternehmers.
   * @param firmaId - Die Dokument-ID der übergeordneten Firma.
   * @param filialId - Die Dokument-ID der zu löschenden Filiale.
   * @returns Ein Promise, das nach der bestätigten Löschung abgeschlossen ist.
   * @throws Gibt Fehler der geschützten Strukturlöschung weiter.
   */
  async deleteFiliale(unternehmerId: string, firmaId: string, filialId: string): Promise<void> {
    await this.strukturVerwaltungService.deleteStruktureintrag({
      typ: 'filiale',
      unternehmerId,
      firmaId,
      filialId,
    });
  }
}
