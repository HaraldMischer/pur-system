// pur-system/src/app/components/schichtplan/dienstplan-arbeitsbereich/dienstplan-arbeitsbereich.ts

import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { CdkDrag, CdkDropList, CdkDropListGroup } from '@angular/cdk/drag-drop';
import { MatButtonModule } from '@angular/material/button';

import { IFilialPfad } from '../../../commons/models/app/firestore-pfad.types';
import { IFilialeEintrag } from '../../../commons/models/domain/filiale';
import { getAktuellerMonat } from '../../../commons/utils/datum/monat';
import { sortMitarbeiter } from '../../../commons/utils/mitarbeiter/mitarbeiter-dokument';
import { AppKontextStore } from '../../../stores/app/app-kontext.store';
import { MitarbeiterStore } from '../../../stores/domain/mitarbeiter.store';
import { MonatSelector } from '../../date-selectors/monat-selector/monat-selector';
import { DienstplanFilialabschnitt } from '../dienstplan-filialabschnitt/dienstplan-filialabschnitt';

// ===== Konstanten & Typen ===================
type TDienstplanFilialauswahl = {
  readonly filiale: IFilialeEintrag;
  readonly pfad: IFilialPfad;
};

type TMitarbeiterAnzeige = {
  readonly id: string;
  readonly anzeigename: string;
  readonly filialIds: readonly string[];
  readonly farbkennung?: string;
};

@Component({
  selector: 'app-dienstplan-arbeitsbereich',
  imports: [
    CdkDrag,
    CdkDropList,
    CdkDropListGroup,
    MatButtonModule,
    MonatSelector,
    DienstplanFilialabschnitt,
  ],
  templateUrl: './dienstplan-arbeitsbereich.html',
  styleUrl: './dienstplan-arbeitsbereich.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DienstplanArbeitsbereich {
  // ===== Interne Dependency Injection =========
  readonly appKontextStore = inject(AppKontextStore);
  private readonly mitarbeiterStore = inject(MitarbeiterStore);

  // ===== Öffentliche API ======================
  readonly planungsmodus = input(false);

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
    return sortMitarbeiter(
      [...mitarbeiterNachId.values()].filter((eintrag) => {
        return (
          eintrag.aktiv && eintrag.filialIds.some((filialId) => ausgewaehlteFilialIds.has(filialId))
        );
      }),
    ).map((eintrag) => {
      const anzeigename = `${eintrag.person.nachname}, ${eintrag.person.vorname}`.trim();
      return {
        id: eintrag.id,
        anzeigename,
        filialIds: eintrag.filialIds,
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
}
