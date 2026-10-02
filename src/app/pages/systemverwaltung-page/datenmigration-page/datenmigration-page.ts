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
  readonly firmenStatus = computed(() => {
    return this.datenmigrationStore.migrationsstatus().firmen ?? null;
  });
  readonly selectedStatus = computed(() => {
    return this.datenmigrationStore.migrationsstatus()[this.selectedMigrationsbereich()] ?? null;
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
    const status = this.selectedStatus()?.status;
    return status ? STATUS_LABELS[status] : 'Ausstehend';
  });
  readonly quellDokumente = computed(() => {
    const statusAnzahl = this.selectedStatus()?.quellDokumente;
    if (statusAnzahl !== undefined) return statusAnzahl;
    if (this.selectedMigrationsbereich() === 'unternehmer') return 1;
    if (this.selectedMigrationsbereich() === 'firmen') {
      return this.datenmigrationStore.firmenQuellDokumente() ?? 0;
    }
    return 0;
  });
  readonly migrationImplemented = computed(() => {
    const migrationsbereich = this.selectedMigrationsbereich();
    return migrationsbereich === 'unternehmer' || migrationsbereich === 'firmen';
  });
  readonly migrationDisabled = computed(() => {
    const migrationsbereich = this.selectedMigrationsbereich();
    return (
      !this.selectedPurCustomer() ||
      !this.migrationImplemented() ||
      this.datenmigrationStore.download() ||
      this.datenmigrationStore.inProgress() ||
      this.selectedStatus()?.status === 'completed' ||
      (migrationsbereich === 'firmen' && this.unternehmerStatus()?.status !== 'completed')
    );
  });
  readonly migrationButtonLabel = computed(() => {
    if (this.datenmigrationStore.inProgress()) return 'Migration läuft';
    if (this.selectedStatus()?.status === 'completed') return 'Bereits migriert';
    return `${this.selectedMigrationsbereichOption().label} migrieren`;
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
    if (this.selectedMigrationsbereich() === 'firmen') {
      await this.datenmigrationStore.loadFirmenQuelle().catch(() => undefined);
    }
  }

  /**
   * Wählt den auf der Seite angezeigten Migrationsbereich aus.
   *
   * @param migrationsbereich - Fachlicher Bereich der anzuzeigenden Migrationskarte.
   */
  async handleMigrationsbereichSelect(migrationsbereich: TDatenmigrationsbereich): Promise<void> {
    this.selectedMigrationsbereich.set(migrationsbereich);
    if (migrationsbereich === 'firmen') {
      await this.datenmigrationStore.loadFirmenQuelle().catch(() => undefined);
    }
  }

  /**
   * Migriert den ausgewählten Legacy-Kunden zum Unternehmer.
   */
  async migrateUnternehmer(): Promise<void> {
    if (this.migrationDisabled()) return;
    await this.datenmigrationStore.migrateUnternehmer().catch(() => undefined);
  }

  /**
   * Migriert die Firmen des ausgewählten Legacy-Kunden.
   */
  async migrateFirmen(): Promise<void> {
    if (this.migrationDisabled()) return;
    await this.datenmigrationStore.migrateFirmen().catch(() => undefined);
  }

  /**
   * Startet die aktuell ausgewählte und bereits umgesetzte Migration.
   */
  async migrateSelectedBereich(): Promise<void> {
    if (this.selectedMigrationsbereich() === 'unternehmer') {
      await this.migrateUnternehmer();
      return;
    }
    if (this.selectedMigrationsbereich() === 'firmen') {
      await this.migrateFirmen();
    }
  }

  /**
   * Wiederholt abhängig von der aktuellen Auswahl das Laden der Kunden oder ihres Status.
   */
  async retryLoad(): Promise<void> {
    const purCustomerId = this.datenmigrationStore.selectedPurCustomerId();
    if (purCustomerId) {
      await this.handlePurCustomerSelect(purCustomerId);
      return;
    }
    await this.datenmigrationStore.loadPurCustomers().catch(() => undefined);
  }
}
