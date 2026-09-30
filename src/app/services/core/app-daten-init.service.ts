// pur-system/src/app/services/core/app-daten-init.service.ts

import { Injectable, inject } from '@angular/core';

import { environment } from '../../../environments/environment';
import { TFirestoreLesestrategie } from '../../commons/models/app/firestore-lesestrategie.types';
import { IBenutzerProfilDokument, TBenutzerZugriffe } from '../../commons/models/domain/benutzer';
import { StammdatenStore, TStammdatenLadeauftrag } from '../../stores/app/stammdaten.store';
import { MitarbeiterStore } from '../../stores/domain/mitarbeiter.store';
import { DebugLogService } from './debug-log.service';

// ===== Top-Level Helper =====================

type TMitarbeiterLadeauftrag = {
  readonly unternehmerId: string;
  readonly firmaId: string;
  readonly filialId?: string;
};

type TStammdatenLadeplan = {
  readonly stammdaten: TStammdatenLadeauftrag;
  readonly mitarbeiter: readonly TMitarbeiterLadeauftrag[];
  readonly mitarbeiterAusGeladenerStruktur: boolean;
};

const UNGUELTIGES_BENUTZERPROFIL = { code: 'app/invalid-user-profile' } as const;

@Injectable({ providedIn: 'root' })
export class AppDatenInitService {
  // ===== Interne Dependency Injection =========
  private readonly _stammdatenStore = inject(StammdatenStore);
  private readonly _mitarbeiterStore = inject(MitarbeiterStore);
  private readonly _debugLogService = inject(DebugLogService);

  // ===== Öffentliche Aktionen =================
  /**
   * Lädt alle für das aktive Benutzerprofil zwingend benötigten Stammdaten.
   *
   * @param benutzerId - UID des angemeldeten Firebase-Benutzers.
   * @param profil - Aktives Benutzerprofil mit Rolle und Datenzugriffen.
   * @param strategie - Datenquellenstrategie für alle Stammdaten des Ladeplans.
   * @returns Ein Promise, das nach Abschluss des vollständigen Ladeplans beendet ist.
   * @throws Bei ungültigen Profilzuordnungen oder einem fehlgeschlagenen Ladevorgang.
   */
  async loadStammdaten(
    benutzerId: string,
    profil: IBenutzerProfilDokument,
    strategie: TFirestoreLesestrategie = environment.firestoreLesestrategien.stammdaten,
  ): Promise<void> {
    const ladeplan = this.erstelleLadeplan(profil, strategie);
    this._debugLogService.logDatenflussTitel('2. STAMMDATEN ');

    let mitarbeiterAuftraege = ladeplan.mitarbeiter;

    if (ladeplan.mitarbeiterAusGeladenerStruktur) {
      await this._stammdatenStore.loadStammdaten(benutzerId, ladeplan.stammdaten);
      mitarbeiterAuftraege = this.getMitarbeiterAuftraegeAusStammdaten();
      await this.warteAufLadeauftraege(
        this.loadMitarbeiterAuftraege(mitarbeiterAuftraege, strategie),
      );
    } else {
      await this.warteAufLadeauftraege([
        this._stammdatenStore.loadStammdaten(benutzerId, ladeplan.stammdaten),
        ...this.loadMitarbeiterAuftraege(mitarbeiterAuftraege, strategie),
      ]);
    }

    this.logLadeergebnis(ladeplan, mitarbeiterAuftraege);
  }

  /**
   * Setzt alle durch den Ladeservice verwalteten sitzungsbezogenen Stammdaten zurück.
   */
  reset(): void {
    this._stammdatenStore.reset();
    this._mitarbeiterStore.resetMitarbeiter();
  }

  // ===== Interne Helfer =======================
  private erstelleLadeplan(
    profil: IBenutzerProfilDokument,
    strategie: TFirestoreLesestrategie,
  ): TStammdatenLadeplan {
    if (!profil.aktiv) {
      throw UNGUELTIGES_BENUTZERPROFIL;
    }
    if (profil.userRole === 'master') {
      return {
        stammdaten: {
          alleStrukturdaten: true,
          zugriffe: {},
          benutzerprofile: true,
          lesestrategie: strategie,
        },
        mitarbeiter: [],
        mitarbeiterAusGeladenerStruktur: true,
      };
    }

    const zugriffe = this.getGueltigeZugriffe(profil.zugriffe);
    const firmen = this.getFirmenZuordnungen(zugriffe);
    if (profil.userRole === 'office') {
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
      return this.getZugeordnetenLadeplan(zugriffe, firmen, strategie);
    }
    if (profil.userRole === 'filiale') {
      if (
        Object.keys(zugriffe).length !== 1 ||
        firmen.length !== 1 ||
        firmen[0].filialIds.length !== 1
      ) {
        throw UNGUELTIGES_BENUTZERPROFIL;
      }
      return this.getZugeordnetenLadeplan(
        zugriffe,
        [
          {
            unternehmerId: firmen[0].unternehmerId,
            firmaId: firmen[0].firmaId,
            filialId: firmen[0].filialIds[0],
          },
        ],
        strategie,
      );
    }
    if (profil.userRole !== 'mitarbeiter') {
      throw UNGUELTIGES_BENUTZERPROFIL;
    }
    if (
      Object.keys(zugriffe).length !== 1 ||
      firmen.length !== 1 ||
      firmen[0].filialIds.length !== 0 ||
      !profil.firmaMitarbeiterId?.trim()
    ) {
      throw UNGUELTIGES_BENUTZERPROFIL;
    }

    return this.getZugeordnetenLadeplan(
      zugriffe,
      [
        {
          unternehmerId: firmen[0].unternehmerId,
          firmaId: firmen[0].firmaId,
        },
      ],
      strategie,
    );
  }

  private getZugeordnetenLadeplan(
    zugriffe: TBenutzerZugriffe,
    mitarbeiter: readonly TMitarbeiterLadeauftrag[],
    strategie: TFirestoreLesestrategie,
  ): TStammdatenLadeplan {
    return {
      stammdaten: {
        alleStrukturdaten: false,
        zugriffe,
        benutzerprofile: false,
        lesestrategie: strategie,
      },
      mitarbeiter,
      mitarbeiterAusGeladenerStruktur: false,
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
      return this._mitarbeiterStore.loadMitarbeiter(
        auftrag.unternehmerId,
        auftrag.firmaId,
        auftrag.filialId,
        strategie,
      );
    });
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
    ladeplan: TStammdatenLadeplan,
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

    if (ladeplan.stammdaten.benutzerprofile) {
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
          anzahl: this._mitarbeiterStore.getMitarbeiter(
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
