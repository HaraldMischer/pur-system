// pur-system/src/app/stores/app/app-kontext.store.ts

import { computed, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';

import { TFilialKontext } from '../../commons/models/app/app-kontext.types';
import { IFirmaEintrag } from '../../commons/models/domain/firma';
import { IUnternehmerEintrag } from '../../commons/models/domain/unternehmer';
import { StammdatenStore } from './stammdaten.store';

// ===== Top-Level Helper =====================

type TAppKontextState = {
  readonly selectedUnternehmerId: string | null;
  readonly selectedFirmaId: string | null;
  readonly selectedFilialeId: string | null;
  readonly alleFilialen: boolean;
};

const initialState: TAppKontextState = {
  selectedUnternehmerId: null,
  selectedFirmaId: null,
  selectedFilialeId: null,
  alleFilialen: false,
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
    const selectedFiliale = computed(() => {
      return filialen().find((eintrag) => eintrag.id === store.selectedFilialeId()) ?? null;
    });
    const filialKontext = computed<TFilialKontext>(() => {
      if (store.alleFilialen()) {
        return { typ: 'alle' };
      }

      const filiale = selectedFiliale();
      return filiale ? { typ: 'filiale', filiale } : null;
    });

    return {
      selectedUnternehmer,
      firmen,
      selectedFirma,
      filialen,
      selectedFiliale,
      filialKontext,
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
        selectedFilialeId: null,
        alleFilialen: false,
      });
      const firmen = stammdatenStore.getFirmen(selectedUnternehmer.id);
      if (firmen.length > 0) {
        selectFirma(firmen[0]);
      }
    }

    /**
     * Wählt eine Firma des aktuellen Unternehmers und setzt den Filialkontext zurück.
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
          selectedFilialeId: null,
          alleFilialen: false,
        });
        return;
      }

      patchState(store, {
        selectedFirmaId: selectedFirma.id,
        selectedFilialeId: null,
        alleFilialen: stammdatenStore.getFilialen(unternehmerId, selectedFirma.id).length > 0,
      });
    }

    /**
     * Wählt eine konkrete Filiale oder den Kontext aller Filialen der aktuellen Firma.
     *
     * @param filialKontext - Der ausgewählte Filialkontext oder `null`.
     */
    function selectFilialKontext(filialKontext: TFilialKontext): void {
      const unternehmerId = store.selectedUnternehmerId();
      const firmaId = store.selectedFirmaId();
      if (!unternehmerId || !firmaId || !filialKontext) {
        patchState(store, { selectedFilialeId: null, alleFilialen: false });
        return;
      }

      const filialen = stammdatenStore.getFilialen(unternehmerId, firmaId);
      if (filialKontext.typ === 'alle') {
        patchState(store, {
          selectedFilialeId: null,
          alleFilialen: filialen.length > 0,
        });
        return;
      }

      const selectedFiliale = filialen.find((eintrag) => eintrag.id === filialKontext.filiale.id);
      patchState(store, {
        selectedFilialeId: selectedFiliale?.id ?? null,
        alleFilialen: false,
      });
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
      selectFilialKontext,
      reset,
    };
  }),
);
