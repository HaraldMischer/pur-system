// pur-system/src/app/pages/schichtplan/dienstplan-planung-page/dienstplan-planung-page.ts

import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CdkDrag, CdkDropList, CdkDropListGroup } from '@angular/cdk/drag-drop';
import { MatButtonModule } from '@angular/material/button';

import { IFilialPfad } from '../../../commons/models/app/firestore-pfad.types';
import { IFilialeEintrag } from '../../../commons/models/domain/filiale';
import { calculateSchichtLohnzeitMinuten } from '../../../commons/utils/dienstplan/schicht-zeit';
import { getAktuellerMonat } from '../../../commons/utils/datum/monat';
import { sortMitarbeiter } from '../../../commons/utils/mitarbeiter/mitarbeiter-dokument';
import { AppKontextStore } from '../../../stores/app/app-kontext.store';
import { DienstplanStore } from '../../../stores/domain/dienstplan.store';
import { MitarbeiterStore } from '../../../stores/domain/mitarbeiter.store';
import { MonatSelector } from '../../../components/date-selectors/monat-selector/monat-selector';
import { DienstplanPlanungsbereich } from '../../../components/schichtplan/dienstplan-planungsbereich/dienstplan-planungsbereich';

// ===== Top-Level Helper =====================
function formatLohnzeit(lohnzeitMinuten: number): string {
  const stunden = Math.floor(lohnzeitMinuten / 60);
  const minuten = lohnzeitMinuten % 60;
  return minuten > 0 ? `${stunden} Std. ${minuten} Min.` : `${stunden} Std.`;
}

// ===== Konstanten & Typen ===================
type TDienstplanFilialauswahl = {
  readonly filiale: IFilialeEintrag;
  readonly pfad: IFilialPfad;
};

type TMitarbeiterAnzeige = {
  readonly id: string;
  readonly anzeigename: string;
  readonly filialIds: readonly string[];
  readonly lohnzeit: string;
  readonly schichtanzahl: number;
  readonly farbkennung?: string;
};

type TMitarbeiterMonatswerte = {
  readonly lohnzeitMinuten: number;
  readonly schichtanzahl: number;
};

@Component({
  selector: 'app-dienstplan-planung-page',
  imports: [
    CdkDrag,
    CdkDropList,
    CdkDropListGroup,
    MatButtonModule,
    MonatSelector,
    DienstplanPlanungsbereich,
  ],
  templateUrl: './dienstplan-planung-page.html',
  styleUrl: './dienstplan-planung-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DienstplanPlanungPage {
  // ===== Interne Dependency Injection =========
  readonly appKontextStore = inject(AppKontextStore);
  private readonly dienstplanStore = inject(DienstplanStore);
  private readonly mitarbeiterStore = inject(MitarbeiterStore);

  // ===== Interner State =======================
  readonly selectedMonat = signal(getAktuellerMonat());

  // ===== Öffentliche Ableitungen ==============
  readonly filialauswahl = computed<readonly TDienstplanFilialauswahl[]>(() => {
    const unternehmerId = this.appKontextStore.selectedUnternehmer()?.id;
    const firmaId = this.appKontextStore.selectedFirma()?.id;
    if (!unternehmerId || !firmaId) return [];

    return this.appKontextStore.selectedFilialen().map((filiale) => {
      return {
        filiale,
        pfad: { unternehmerId, firmaId, filialeId: filiale.id },
      };
    });
  });
  readonly mitarbeiter = computed<readonly TMitarbeiterAnzeige[]>(() => {
    const unternehmerId = this.appKontextStore.selectedUnternehmer()?.id;
    const firmaId = this.appKontextStore.selectedFirma()?.id;
    if (!unternehmerId || !firmaId) return [];

    const filialen = this.appKontextStore.selectedFilialen();
    const filialIds = filialen.map((filiale) => filiale.id);
    const ausgewaehlteFilialIds = new Set(filialIds);
    const firmenMitarbeiter = this.mitarbeiterStore.getMitarbeiter(unternehmerId, firmaId);
    const gemeinsameMitarbeiter = this.mitarbeiterStore.getMitarbeiterNachFilialen(
      unternehmerId,
      firmaId,
      filialIds,
    );
    const filialMitarbeiter = filialen.flatMap((filiale) => {
      return this.mitarbeiterStore.getMitarbeiter(unternehmerId, firmaId, filiale.id);
    });
    const mitarbeiterNachId = new Map(
      [...firmenMitarbeiter, ...gemeinsameMitarbeiter, ...filialMitarbeiter].map((eintrag) => [
        eintrag.id,
        eintrag,
      ]),
    );
    const monatswerteNachMitarbeiterId = this.getMitarbeiterMonatswerte();
    return sortMitarbeiter(
      [...mitarbeiterNachId.values()].filter((eintrag) => {
        return (
          eintrag.aktiv && eintrag.filialIds.some((filialId) => ausgewaehlteFilialIds.has(filialId))
        );
      }),
    ).map((eintrag) => {
      const anzeigename = `${eintrag.person.nachname}, ${eintrag.person.vorname}`.trim();
      const monatswerte = monatswerteNachMitarbeiterId.get(eintrag.id) ?? {
        lohnzeitMinuten: 0,
        schichtanzahl: 0,
      };
      return {
        id: eintrag.id,
        anzeigename,
        filialIds: eintrag.filialIds,
        lohnzeit: formatLohnzeit(monatswerte.lohnzeitMinuten),
        schichtanzahl: monatswerte.schichtanzahl,
        ...(eintrag.farbkennung ? { farbkennung: eintrag.farbkennung } : {}),
      };
    });
  });

  // ===== Öffentliche Aktionen =================
  /**
   * Wechselt zum aktuellen Kalendermonat.
   */
  setAktuellerMonat(): void {
    this.selectedMonat.set(getAktuellerMonat());
  }

  // ===== Interne Helfer =======================
  /**
   * Summiert die Schichten der aktiven Planungsstände aller ausgewählten Filialen.
   *
   * @returns Monatswerte nach Mitarbeiter-ID.
   */
  private getMitarbeiterMonatswerte(): ReadonlyMap<string, TMitarbeiterMonatswerte> {
    const monatswerte = new Map<string, TMitarbeiterMonatswerte>();
    for (const auswahl of this.filialauswahl()) {
      const kontext = this.dienstplanStore.getDienstplanKontext(auswahl.pfad);
      const dienstplan = kontext?.dienstplaene.find((eintrag) => {
        return eintrag.id === this.selectedMonat();
      });
      const aktiveVersionId = dienstplan?.entwurfVersionId ?? dienstplan?.veroeffentlichteVersionId;
      if (!kontext || !aktiveVersionId) continue;

      for (const schicht of kontext.schichten) {
        if (schicht.versionId !== aktiveVersionId) continue;
        const bisherigeMonatswerte = monatswerte.get(schicht.mitarbeiterId) ?? {
          lohnzeitMinuten: 0,
          schichtanzahl: 0,
        };
        monatswerte.set(schicht.mitarbeiterId, {
          lohnzeitMinuten:
            bisherigeMonatswerte.lohnzeitMinuten + calculateSchichtLohnzeitMinuten(schicht),
          schichtanzahl: bisherigeMonatswerte.schichtanzahl + 1,
        });
      }
    }
    return monatswerte;
  }
}
