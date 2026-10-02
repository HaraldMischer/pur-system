// pur-system/src/app/services/core/app-daten-init.service.ts

import { Injectable, inject } from '@angular/core';

import { environment } from '../../../environments/environment';
import { TFirestoreLesestrategie } from '../../commons/models/app/firestore-lesestrategie.types';
import { IBenutzerProfilDokument, TBenutzerZugriffe } from '../../commons/models/domain/benutzer';
import { IMitarbeiterEintrag } from '../../commons/models/domain/mitarbeiter';
import { StammdatenStore, TStammdatenLadeauftrag } from '../../stores/app/stammdaten.store';
import { MitarbeiterStore } from '../../stores/domain/mitarbeiter.store';
import { MitarbeiterService } from '../domain/mitarbeiter.service';
import { DebugLogService } from './debug-log.service';

// ===== Top-Level Helper =====================

type TMitarbeiterLadeauftrag = {
  readonly unternehmerId: string;
  readonly firmaId: string;
  readonly filialId?: string;
  readonly filialIds?: readonly string[];
};

const UNGUELTIGES_BENUTZERPROFIL = { code: 'app/invalid-user-profile' } as const;

@Injectable({ providedIn: 'root' })
export class AppDatenInitService {
  // ===== Interne Dependency Injection =========
  private readonly _stammdatenStore = inject(StammdatenStore);
  private readonly _mitarbeiterStore = inject(MitarbeiterStore);
  private readonly _mitarbeiterService = inject(MitarbeiterService);
  private readonly _debugLogService = inject(DebugLogService);

  // ===== Öffentliche Aktionen =================
  /**
   * Lädt alle für das aktive Benutzerprofil zwingend benötigten Stammdaten.
   *
   * @param benutzerId - UID des angemeldeten Firebase-Benutzers.
   * @param profil - Aktives Benutzerprofil mit Rolle und Datenzugriffen.
   * @param strategie - Datenquellenstrategie für alle Daten der rollenabhängigen Initialisierung.
   * @returns Ein Promise, das nach Abschluss der vollständigen Initialisierung beendet ist.
   * @throws Bei ungültigen Profilzuordnungen oder einem fehlgeschlagenen Ladevorgang.
   */
  async loadStammdaten(
    benutzerId: string,
    profil: IBenutzerProfilDokument,
    strategie: TFirestoreLesestrategie = environment.firestoreLesestrategien.stammdaten,
  ): Promise<void> {
    if (!profil.aktiv) {
      throw UNGUELTIGES_BENUTZERPROFIL;
    }

    this._debugLogService.logDatenflussTitel('2. STAMMDATEN ');

    let mitarbeiterAuftraege: readonly TMitarbeiterLadeauftrag[];
    switch (profil.userRole) {
      case 'master':
        mitarbeiterAuftraege = await this.loadMasterDaten(benutzerId, strategie);
        break;
      case 'office':
        mitarbeiterAuftraege = await this.loadOfficeDaten(benutzerId, profil, strategie);
        break;
      case 'filiale':
        mitarbeiterAuftraege = await this.loadFilialeDaten(benutzerId, profil, strategie);
        break;
      case 'mitarbeiter':
        mitarbeiterAuftraege = await this.loadMitarbeiterDaten(benutzerId, profil, strategie);
        break;
      default:
        throw UNGUELTIGES_BENUTZERPROFIL;
    }

    this.logLadeergebnis(profil.userRole === 'master', mitarbeiterAuftraege);
  }

  /**
   * Setzt alle durch den Ladeservice verwalteten sitzungsbezogenen Stammdaten zurück.
   */
  reset(): void {
    this._stammdatenStore.reset();
    this._mitarbeiterStore.resetMitarbeiter();
  }

  // ===== Interne Helfer =======================
  private async loadMasterDaten(
    benutzerId: string,
    strategie: TFirestoreLesestrategie,
  ): Promise<readonly TMitarbeiterLadeauftrag[]> {
    // Schritt 1: Gesamte Struktur und alle Benutzerprofile laden.
    await this._stammdatenStore.loadStammdaten(benutzerId, {
      alleStrukturdaten: true,
      zugriffe: {},
      benutzerprofile: true,
      lesestrategie: strategie,
    });

    // Schritt 2: Aus der geladenen Struktur Mitarbeiteraufträge für alle Firmen erstellen.
    const mitarbeiterAuftraege = this.getMitarbeiterAuftraegeAusStammdaten();

    // Schritt 3: Mitarbeiter aller Firmen laden.
    await this.warteAufLadeauftraege(
      this.loadMitarbeiterAuftraege(mitarbeiterAuftraege, strategie),
    );
    return mitarbeiterAuftraege;
  }

  private async loadOfficeDaten(
    benutzerId: string,
    profil: IBenutzerProfilDokument,
    strategie: TFirestoreLesestrategie,
  ): Promise<readonly TMitarbeiterLadeauftrag[]> {
    const zugriffe = this.getGueltigeZugriffe(profil.zugriffe);
    const firmen = this.getFirmenZuordnungen(zugriffe);
    if (
      firmen.length === 0 ||
      Object.values(zugriffe).some((eintrag) => {
        return Object.keys(eintrag).length === 0;
      }) ||
      firmen.some((eintrag) => {
        return eintrag.filialIds.length === 0;
      })
    ) {
      throw UNGUELTIGES_BENUTZERPROFIL;
    }
    const mitarbeiterAuftraege = firmen.map((firma) => {
      return { unternehmerId: firma.unternehmerId, firmaId: firma.firmaId };
    });

    // Schritt 1: Freigegebene Unternehmer, Firmen und Filialen laden.
    await this._stammdatenStore.loadStammdaten(
      benutzerId,
      this.getZugeordnetenStammdatenLadeauftrag(zugriffe, strategie),
    );

    // Schritt 2: Mitarbeiter aller freigegebenen Firmen laden.
    await this.warteAufLadeauftraege(
      this.loadMitarbeiterAuftraege(mitarbeiterAuftraege, strategie),
    );
    return mitarbeiterAuftraege;
  }

  private async loadFilialeDaten(
    benutzerId: string,
    profil: IBenutzerProfilDokument,
    strategie: TFirestoreLesestrategie,
  ): Promise<readonly TMitarbeiterLadeauftrag[]> {
    const zugriffe = this.getGueltigeZugriffe(profil.zugriffe);
    const firmen = this.getFirmenZuordnungen(zugriffe);
    if (
      Object.keys(zugriffe).length !== 1 ||
      firmen.length !== 1 ||
      firmen[0].filialIds.length !== 1
    ) {
      throw UNGUELTIGES_BENUTZERPROFIL;
    }
    const mitarbeiterAuftraege: readonly TMitarbeiterLadeauftrag[] = [
      {
        unternehmerId: firmen[0].unternehmerId,
        firmaId: firmen[0].firmaId,
        filialId: firmen[0].filialIds[0],
      },
    ];

    // Schritt 1: Zugeordneten Unternehmer, Firma und Filiale laden.
    await this._stammdatenStore.loadStammdaten(
      benutzerId,
      this.getZugeordnetenStammdatenLadeauftrag(zugriffe, strategie),
    );

    // Schritt 2: Mitarbeiter der zugeordneten Filiale laden.
    await this.warteAufLadeauftraege(
      this.loadMitarbeiterAuftraege(mitarbeiterAuftraege, strategie),
    );
    return mitarbeiterAuftraege;
  }

  private async loadMitarbeiterDaten(
    benutzerId: string,
    profil: IBenutzerProfilDokument,
    strategie: TFirestoreLesestrategie,
  ): Promise<readonly TMitarbeiterLadeauftrag[]> {
    const zugriffe = this.getGueltigeZugriffe(profil.zugriffe);
    const firmen = this.getFirmenZuordnungen(zugriffe);
    const mitarbeiterId = profil.firmaMitarbeiterId?.trim();
    if (
      Object.keys(zugriffe).length !== 1 ||
      firmen.length !== 1 ||
      firmen[0].filialIds.length !== 0 ||
      !mitarbeiterId
    ) {
      throw UNGUELTIGES_BENUTZERPROFIL;
    }
    const mitarbeiterAuftrag: TMitarbeiterLadeauftrag = {
      unternehmerId: firmen[0].unternehmerId,
      firmaId: firmen[0].firmaId,
    };

    // Schritt 1: Zugeordneten Unternehmer und zugeordnete Firma laden.
    await this._stammdatenStore.loadStammdaten(
      benutzerId,
      this.getZugeordnetenStammdatenLadeauftrag(zugriffe, strategie),
    );

    // Schritt 2: Eigenen aktiven Mitarbeiter gezielt über die Dokument-ID laden.
    const eigenerMitarbeiter = await this.loadEigenenAktivenMitarbeiter(
      mitarbeiterAuftrag,
      mitarbeiterId,
      strategie,
    );

    // Schritt 3: Die im Mitarbeiterdatensatz zugeordneten Filialen laden.
    await this._stammdatenStore.loadFilialenNachIds(
      benutzerId,
      mitarbeiterAuftrag.unternehmerId,
      mitarbeiterAuftrag.firmaId,
      eigenerMitarbeiter.filialIds,
      strategie,
    );

    // Schritt 4: Mitarbeiter aller zugeordneten Filialen gemeinsam laden.
    const mitarbeiterAuftraege: readonly TMitarbeiterLadeauftrag[] = [
      { ...mitarbeiterAuftrag, filialIds: eigenerMitarbeiter.filialIds },
    ];
    await this.warteAufLadeauftraege(
      this.loadMitarbeiterAuftraege(mitarbeiterAuftraege, strategie),
    );
    return mitarbeiterAuftraege;
  }

  private getZugeordnetenStammdatenLadeauftrag(
    zugriffe: TBenutzerZugriffe,
    strategie: TFirestoreLesestrategie,
  ): TStammdatenLadeauftrag {
    return {
      alleStrukturdaten: false,
      zugriffe,
      benutzerprofile: false,
      lesestrategie: strategie,
    };
  }

  private getGueltigeZugriffe(zugriffe: TBenutzerZugriffe): TBenutzerZugriffe {
    if (typeof zugriffe !== 'object' || zugriffe === null || Array.isArray(zugriffe)) {
      throw UNGUELTIGES_BENUTZERPROFIL;
    }

    for (const [unternehmerId, firmen] of Object.entries(zugriffe)) {
      if (
        !unternehmerId.trim() ||
        typeof firmen !== 'object' ||
        firmen === null ||
        Array.isArray(firmen)
      ) {
        throw UNGUELTIGES_BENUTZERPROFIL;
      }
      for (const [firmaId, filialIds] of Object.entries(firmen)) {
        if (
          !firmaId.trim() ||
          !Array.isArray(filialIds) ||
          filialIds.some((filialId) => {
            return typeof filialId !== 'string' || !filialId.trim();
          })
        ) {
          throw UNGUELTIGES_BENUTZERPROFIL;
        }
      }
    }

    return zugriffe;
  }

  private getFirmenZuordnungen(zugriffe: TBenutzerZugriffe): Array<{
    unternehmerId: string;
    firmaId: string;
    filialIds: readonly string[];
  }> {
    return Object.entries(zugriffe).flatMap(([unternehmerId, firmen]) => {
      return Object.entries(firmen).map(([firmaId, filialIds]) => {
        return { unternehmerId, firmaId, filialIds };
      });
    });
  }

  private getMitarbeiterAuftraegeAusStammdaten(): TMitarbeiterLadeauftrag[] {
    return this._stammdatenStore.unternehmer().flatMap((unternehmer) => {
      return this._stammdatenStore.getFirmen(unternehmer.id).map((firma) => {
        return {
          unternehmerId: unternehmer.id,
          firmaId: firma.id,
        };
      });
    });
  }

  private loadMitarbeiterAuftraege(
    auftraege: readonly TMitarbeiterLadeauftrag[],
    strategie: TFirestoreLesestrategie,
  ): Promise<void>[] {
    return auftraege.map((auftrag) => {
      if (auftrag.filialIds) {
        return this._mitarbeiterStore.loadMitarbeiterNachFilialen(
          auftrag.unternehmerId,
          auftrag.firmaId,
          auftrag.filialIds,
          strategie,
        );
      }
      return this._mitarbeiterStore.loadMitarbeiter(
        auftrag.unternehmerId,
        auftrag.firmaId,
        auftrag.filialId,
        strategie,
      );
    });
  }

  private async loadEigenenAktivenMitarbeiter(
    mitarbeiterAuftrag: TMitarbeiterLadeauftrag,
    mitarbeiterId: string,
    strategie: TFirestoreLesestrategie,
  ): Promise<IMitarbeiterEintrag> {
    const mitarbeiter = await this._mitarbeiterService.loadMitarbeiterEintrag(
      mitarbeiterAuftrag.unternehmerId,
      mitarbeiterAuftrag.firmaId,
      mitarbeiterId,
      strategie,
    );
    if (!mitarbeiter?.aktiv) {
      throw UNGUELTIGES_BENUTZERPROFIL;
    }
    return mitarbeiter;
  }

  private async warteAufLadeauftraege(auftraege: readonly Promise<void>[]): Promise<void> {
    const ergebnisse = await Promise.allSettled(auftraege);
    const fehler = ergebnisse.find((ergebnis): ergebnis is PromiseRejectedResult => {
      return ergebnis.status === 'rejected';
    });
    if (fehler) {
      throw fehler.reason;
    }
  }

  private logLadeergebnis(
    benutzerprofileGeladen: boolean,
    mitarbeiterAuftraege: readonly TMitarbeiterLadeauftrag[],
  ): void {
    const stammdaten = this._stammdatenStore.snapshot();
    const firmenAnzahl = Object.values(stammdaten.firmenNachUnternehmer).reduce(
      (anzahl, firmen) => {
        return anzahl + firmen.length;
      },
      0,
    );
    const filialenAnzahl = Object.values(stammdaten.filialenNachFirma).reduce((gesamt, firmen) => {
      return (
        gesamt +
        Object.values(firmen).reduce((anzahl, filialen) => {
          return anzahl + filialen.length;
        }, 0)
      );
    }, 0);

    if (benutzerprofileGeladen) {
      this._debugLogService.logDatenGeladen('Benutzerprofile', stammdaten.benutzerprofile.length);
    }
    this._debugLogService.logDatenGeladen('Unternehmer', stammdaten.unternehmer.length);
    this._debugLogService.logDatenGeladen('Firmen', firmenAnzahl);
    this._debugLogService.logDatenGeladen('Filialen', filialenAnzahl);

    const mitarbeiterErgebnisse = mitarbeiterAuftraege
      .map((auftrag) => {
        const unternehmer = stammdaten.unternehmer.find((eintrag) => {
          return eintrag.id === auftrag.unternehmerId;
        });
        const firma = stammdaten.firmenNachUnternehmer[auftrag.unternehmerId]?.find((eintrag) => {
          return eintrag.id === auftrag.firmaId;
        });
        const firmaBezeichnung = firma?.anzeigename ?? auftrag.firmaId;
        return {
          unternehmerBezeichnung: unternehmer?.anzeigename ?? auftrag.unternehmerId,
          firmaBezeichnung,
          bezeichnung: `Mitarbeiter | ${firmaBezeichnung}`,
          anzahl: auftrag.filialIds
            ? this._mitarbeiterStore.getMitarbeiterNachFilialen(
                auftrag.unternehmerId,
                auftrag.firmaId,
                auftrag.filialIds,
              ).length
            : this._mitarbeiterStore.getMitarbeiter(
                auftrag.unternehmerId,
                auftrag.firmaId,
                auftrag.filialId,
              ).length,
        };
      })
      .sort((erster, zweiter) => {
        return (
          erster.unternehmerBezeichnung.localeCompare(zweiter.unternehmerBezeichnung, 'de') ||
          erster.firmaBezeichnung.localeCompare(zweiter.firmaBezeichnung, 'de')
        );
      });

    for (const ergebnis of mitarbeiterErgebnisse) {
      this._debugLogService.logDatenGeladen(ergebnis.bezeichnung, ergebnis.anzahl);
    }

    this._debugLogService.logDatenflussTitel('STAMMDATEN VOLLSTÄNDIG GELADEN ');
  }
}
