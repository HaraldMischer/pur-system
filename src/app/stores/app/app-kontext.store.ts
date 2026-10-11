// pur-system/src/app/stores/app/app-kontext.store.ts

import { computed, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';

import { IFirmaEintrag } from '../../commons/models/domain/firma';
import { IFilialeEintrag } from '../../commons/models/domain/filiale';
import { IUnternehmerEintrag } from '../../commons/models/domain/unternehmer';
import { StammdatenStore } from './stammdaten.store';

// ===== Top-Level Helper =====================

type TAppKontextState = {
  readonly selectedUnternehmerId: string | null;
  readonly selectedFirmaId: string | null;
  readonly selectedFilialeIds: readonly string[];
};

const initialState: TAppKontextState = {
  selectedUnternehmerId: null,
  selectedFirmaId: null,
  selectedFilialeIds: [],
};

export const AppKontextStore = signalStore(
  { providedIn: 'root', protectedState: true } as const,
  withState<TAppKontextState>(initialState),
  withComputed((store, stammdatenStore = inject(StammdatenStore)) => {
    const selectedUnternehmer = computed(() => {
      return (
        stammdatenStore
          .unternehmer()
          .find((eintrag) => eintrag.id === store.selectedUnternehmerId()) ?? null
      );
    });
    const firmen = computed(() => {
      const unternehmerId = store.selectedUnternehmerId();
      return unternehmerId ? stammdatenStore.getFirmen(unternehmerId) : [];
    });
    const selectedFirma = computed(() => {
      return firmen().find((eintrag) => eintrag.id === store.selectedFirmaId()) ?? null;
    });
    const filialen = computed(() => {
      const unternehmerId = store.selectedUnternehmerId();
      const firmaId = store.selectedFirmaId();
      return unternehmerId && firmaId ? stammdatenStore.getFilialen(unternehmerId, firmaId) : [];
    });
    const selectedFilialen = computed(() => {
      const selectedFilialeIds = new Set(store.selectedFilialeIds());
      return filialen().filter((eintrag) => selectedFilialeIds.has(eintrag.id));
    });
    const selectedFiliale = computed(() => {
      const auswahl = selectedFilialen();
      return auswahl.length === 1 ? auswahl[0] : null;
    });

    return {
      selectedUnternehmer,
      firmen,
      selectedFirma,
      filialen,
      selectedFilialen,
      selectedFiliale,
    };
  }),
  withMethods((store, stammdatenStore = inject(StammdatenStore)) => {
    // ===== Methoden: Sonstige Aktionen ==========

    /**
     * Initialisiert den Arbeitskontext mit dem ersten verfügbaren Unternehmer.
     */
    function initialize(): void {
      const unternehmer = stammdatenStore.unternehmer();
      if (unternehmer.length > 0) {
        selectUnternehmer(unternehmer[0]);
        return;
      }

      reset();
    }

    /**
     * Wählt einen verfügbaren Unternehmer und setzt die abhängigen Auswahlen zurück.
     *
     * @param unternehmer - Der ausgewählte Unternehmer oder `null`.
     */
    function selectUnternehmer(unternehmer: IUnternehmerEintrag | null): void {
      const selectedUnternehmer = stammdatenStore
        .unternehmer()
        .find((eintrag) => eintrag.id === unternehmer?.id);
      if (!selectedUnternehmer) {
        reset();
        return;
      }

      patchState(store, {
        selectedUnternehmerId: selectedUnternehmer.id,
        selectedFirmaId: null,
        selectedFilialeIds: [],
      });
      const firmen = stammdatenStore.getFirmen(selectedUnternehmer.id);
      if (firmen.length > 0) {
        selectFirma(firmen[0]);
      }
    }

    /**
     * Wählt eine Firma des aktuellen Unternehmers und setzt deren Filialauswahl.
     *
     * @param firma - Die ausgewählte Firma oder `null`.
     */
    function selectFirma(firma: IFirmaEintrag | null): void {
      const unternehmerId = store.selectedUnternehmerId();
      const selectedFirma = unternehmerId
        ? stammdatenStore.getFirmen(unternehmerId).find((eintrag) => eintrag.id === firma?.id)
        : null;
      if (!unternehmerId || !selectedFirma) {
        patchState(store, {
          selectedFirmaId: null,
          selectedFilialeIds: [],
        });
        return;
      }

      const filialen = stammdatenStore.getFilialen(unternehmerId, selectedFirma.id);
      patchState(store, {
        selectedFirmaId: selectedFirma.id,
        selectedFilialeIds: filialen.length > 0 ? [filialen[0].id] : [],
      });
    }

    /**
     * Wählt eine oder mehrere konkrete Filialen der aktuellen Firma.
     *
     * @param filialenAuswahl - Die ausgewählten Filialen.
     */
    function selectFilialen(filialenAuswahl: readonly IFilialeEintrag[]): void {
      const unternehmerId = store.selectedUnternehmerId();
      const firmaId = store.selectedFirmaId();
      if (!unternehmerId || !firmaId) {
        patchState(store, { selectedFilialeIds: [] });
        return;
      }

      const filialen = stammdatenStore.getFilialen(unternehmerId, firmaId);
      if (filialen.length === 0) {
        patchState(store, { selectedFilialeIds: [] });
        return;
      }

      const ausgewaehlteIds = new Set(filialenAuswahl.map((filiale) => filiale.id));
      const selectedFilialeIds = filialen
        .filter((filiale) => ausgewaehlteIds.has(filiale.id))
        .map((filiale) => filiale.id);
      patchState(store, { selectedFilialeIds });
    }

    /**
     * Setzt den vollständigen Arbeitskontext zurück.
     */
    function reset(): void {
      patchState(store, initialState);
    }

    return {
      initialize,
      selectUnternehmer,
      selectFirma,
      selectFilialen,
      reset,
    };
  }),
);
