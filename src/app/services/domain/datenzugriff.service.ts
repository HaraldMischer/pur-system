// pur-system/src/app/services/domain/datenzugriff.service.ts

import { Injectable, inject } from '@angular/core';
import { IDatenzugriffEintrag } from '../../commons/models/domain/datenzugriff';
import { FilialeService } from './filiale.service';
import { FirmaService } from './firma.service';
import { UnternehmerService } from './unternehmer.service';

@Injectable({ providedIn: 'root' })
export class DatenzugriffService {
  private readonly filialeService = inject(FilialeService);
  private readonly firmaService = inject(FirmaService);
  private readonly unternehmerService = inject(UnternehmerService);

  /**
   * Lädt Unternehmer als kompakte Einträge für die Datenzugriffsauswahl.
   *
   * @returns Die IDs und Anzeigenamen der Unternehmer.
   * @throws Gibt Fehler des Unternehmer-Service an die aufrufende Stelle weiter.
   */
  async loadUnternehmer(): Promise<IDatenzugriffEintrag[]> {
    const unternehmer = await this.unternehmerService.loadUnternehmer();
    return unternehmer.map((eintrag) => ({
      id: eintrag.id,
      anzeigename: eintrag.anzeigename,
    }));
  }

  /**
   * Lädt die Firmen eines Unternehmers für die Datenzugriffsauswahl.
   *
   * @param unternehmerId - Die Dokument-ID des übergeordneten Unternehmers.
   * @returns Die IDs und Anzeigenamen der Firmen.
   * @throws Gibt Fehler des Firestore-Zugriffs an die aufrufende Stelle weiter.
   */
  async loadFirmen(unternehmerId: string): Promise<IDatenzugriffEintrag[]> {
    const firmen = await this.firmaService.loadFirmen(unternehmerId);
    return firmen.map((eintrag) => ({
      id: eintrag.id,
      anzeigename: eintrag.anzeigename,
    }));
  }

  /**
   * Lädt die Filialen einer Firma für die Datenzugriffsauswahl.
   *
   * @param unternehmerId - Die Dokument-ID des übergeordneten Unternehmers.
   * @param firmaId - Die Dokument-ID der übergeordneten Firma.
   * @returns Die IDs und Anzeigenamen der Filialen.
   * @throws Gibt Fehler des Firestore-Zugriffs an die aufrufende Stelle weiter.
   */
  async loadFilialen(unternehmerId: string, firmaId: string): Promise<IDatenzugriffEintrag[]> {
    const filialen = await this.filialeService.loadFilialen(unternehmerId, firmaId);
    return filialen.map((eintrag) => ({
      id: eintrag.id,
      anzeigename: eintrag.anzeigename,
    }));
  }
}
