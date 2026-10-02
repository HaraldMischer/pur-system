// pur-system/src/app/pages/systemverwaltung-page/datenmigration-page/datenmigration-page.ts

import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';

import {
  TDatenmigrationsbereich,
  TDatenmigrationsstatus,
} from '../../../commons/models/domain/datenmigration';
import { DatenmigrationStore } from '../../../stores/domain/datenmigration.store';

// ===== Konstanten & Typen ===================

interface IMigrationsbereichOption {
  id: TDatenmigrationsbereich;
  label: string;
  icon: string;
}

const STATUS_LABELS: Record<TDatenmigrationsstatus, string> = {
  inProgress: 'Wird migriert',
  completed: 'Abgeschlossen',
  failed: 'Fehlgeschlagen',
  conflict: 'Konflikt',
};
const MIGRATIONSBEREICHE: readonly IMigrationsbereichOption[] = [
  { id: 'unternehmer', label: 'Unternehmer', icon: 'business' },
  { id: 'firmen', label: 'Firmen', icon: 'apartment' },
  { id: 'filialen', label: 'Filialen', icon: 'storefront' },
  { id: 'mitarbeiter', label: 'Mitarbeiter', icon: 'groups' },
];

@Component({
  selector: 'app-datenmigration-page',
  imports: [MatButtonModule, MatCardModule, MatFormFieldModule, MatIconModule, MatSelectModule],
  templateUrl: './datenmigration-page.html',
  styleUrl: './datenmigration-page.scss',
  host: { class: 'pur-page pur-page--limited' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DatenmigrationPage implements OnInit {
  // ===== Interne Dependency Injection =========

  readonly datenmigrationStore = inject(DatenmigrationStore);

  // ===== Öffentliche Werte ====================

  readonly migrationsbereiche = MIGRATIONSBEREICHE;
  readonly selectedMigrationsbereich = signal<TDatenmigrationsbereich>('unternehmer');

  // ===== Öffentliche Ableitungen ==============

  readonly selectedPurCustomer = computed(() => {
    const selectedId = this.datenmigrationStore.selectedPurCustomerId();
    return (
      this.datenmigrationStore.purCustomers().find((eintrag) => eintrag.id === selectedId) ?? null
    );
  });
  readonly unternehmerStatus = computed(() => {
    return this.datenmigrationStore.migrationsstatus().unternehmer ?? null;
  });
  readonly selectedMigrationsbereichOption = computed(() => {
    return (
      this.migrationsbereiche.find(
        (migrationsbereich) => migrationsbereich.id === this.selectedMigrationsbereich(),
      ) ?? this.migrationsbereiche[0]
    );
  });
  readonly statusLabel = computed(() => {
    if (this.datenmigrationStore.download() && this.selectedPurCustomer()) return 'Wird geladen';
    const status = this.unternehmerStatus()?.status;
    return status ? STATUS_LABELS[status] : 'Noch nicht migriert';
  });
  readonly migrationDisabled = computed(() => {
    return (
      !this.selectedPurCustomer() ||
      this.datenmigrationStore.download() ||
      this.datenmigrationStore.inProgress() ||
      this.unternehmerStatus()?.status === 'completed'
    );
  });
  readonly migrationButtonLabel = computed(() => {
    if (this.datenmigrationStore.inProgress()) return 'Migration läuft';
    if (this.unternehmerStatus()?.status === 'completed') return 'Bereits migriert';
    return 'Unternehmer migrieren';
  });

  // ===== Lifecycle Hooks ======================

  /**
   * Lädt beim Initialisieren die auswählbaren Legacy-Kunden.
   */
  ngOnInit(): void {
    void this.datenmigrationStore.loadPurCustomers().catch(() => undefined);
  }

  // ===== Öffentliche Aktionen =================

  /**
   * Wählt einen Legacy-Kunden aus und lädt dessen Migrationsstatus.
   *
   * @param purCustomerId - Dokument-ID des ausgewählten Legacy-Kunden.
   */
  async handlePurCustomerSelect(purCustomerId: string): Promise<void> {
    await this.datenmigrationStore.selectPurCustomer(purCustomerId).catch(() => undefined);
  }

  /**
   * Wählt den auf der Seite angezeigten Migrationsbereich aus.
   *
   * @param migrationsbereich - Fachlicher Bereich der anzuzeigenden Migrationskarte.
   */
  handleMigrationsbereichSelect(migrationsbereich: TDatenmigrationsbereich): void {
    this.selectedMigrationsbereich.set(migrationsbereich);
  }

  /**
   * Migriert den ausgewählten Legacy-Kunden zum Unternehmer.
   */
  async migrateUnternehmer(): Promise<void> {
    if (this.migrationDisabled()) return;
    await this.datenmigrationStore.migrateUnternehmer().catch(() => undefined);
  }

  /**
   * Wiederholt abhängig von der aktuellen Auswahl das Laden der Kunden oder ihres Status.
   */
  async retryLoad(): Promise<void> {
    const purCustomerId = this.datenmigrationStore.selectedPurCustomerId();
    if (purCustomerId) {
      await this.datenmigrationStore.selectPurCustomer(purCustomerId).catch(() => undefined);
      return;
    }
    await this.datenmigrationStore.loadPurCustomers().catch(() => undefined);
  }
}
