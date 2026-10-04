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
  pfad: string;
  icon: string;
}

const STATUS_LABELS: Record<TDatenmigrationsstatus, string> = {
  inProgress: 'Wird migriert',
  completed: 'Abgeschlossen',
  failed: 'Fehlgeschlagen',
};
const MIGRATIONSBEREICHE: readonly IMigrationsbereichOption[] = [
  { id: 'unternehmer', label: 'Unternehmer', pfad: 'Root / unternehmer', icon: 'business' },
  { id: 'firmen', label: 'Firmen', pfad: 'unternehmer / firma', icon: 'apartment' },
  { id: 'filialen', label: 'Filialen', pfad: 'firma / filiale', icon: 'storefront' },
  { id: 'mitarbeiter', label: 'Mitarbeiter', pfad: 'firma / mitarbeiter', icon: 'groups' },
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
  readonly filialenStatus = computed(() => {
    return this.datenmigrationStore.migrationsstatus().filialen ?? null;
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
    if (this.selectedMigrationsbereich() === 'unternehmer') return 1;
    if (this.selectedMigrationsbereich() === 'firmen') {
      return (
        this.datenmigrationStore.firmenQuellDokumente() ??
        this.selectedStatus()?.quellDokumente ??
        0
      );
    }
    if (this.selectedMigrationsbereich() === 'filialen') {
      return (
        this.datenmigrationStore.filialenQuellDokumente() ??
        this.selectedStatus()?.quellDokumente ??
        0
      );
    }
    if (this.selectedMigrationsbereich() === 'mitarbeiter') {
      return (
        this.datenmigrationStore.mitarbeiterQuellDokumente() ??
        this.selectedStatus()?.quellDokumente ??
        0
      );
    }
    return 0;
  });
  readonly offeneDokumente = computed(() => {
    const migrierteDokumente = this.selectedStatus()?.migrierteDokumente ?? 0;
    return Math.max(0, this.quellDokumente() - migrierteDokumente);
  });
  readonly zielDokumente = computed(() => {
    if (this.selectedMigrationsbereich() === 'unternehmer') {
      return this.datenmigrationStore.unternehmerZielDokumente() ?? 0;
    }
    if (this.selectedMigrationsbereich() === 'firmen') {
      return this.datenmigrationStore.firmenZielDokumente() ?? 0;
    }
    if (this.selectedMigrationsbereich() === 'filialen') {
      return this.datenmigrationStore.filialenZielDokumente() ?? 0;
    }
    if (this.selectedMigrationsbereich() === 'mitarbeiter') {
      return this.datenmigrationStore.mitarbeiterZielDokumente() ?? 0;
    }
    return 0;
  });
  readonly migrationImplemented = computed(() => {
    return this.migrationsbereiche.some((bereich) => {
      return bereich.id === this.selectedMigrationsbereich();
    });
  });
  readonly migrationDisabled = computed(() => {
    const migrationsbereich = this.selectedMigrationsbereich();
    return (
      !this.selectedPurCustomer() ||
      !this.migrationImplemented() ||
      this.datenmigrationStore.download() ||
      this.datenmigrationStore.inProgress() ||
      (migrationsbereich === 'firmen' && this.unternehmerStatus()?.status !== 'completed') ||
      (migrationsbereich === 'filialen' && this.firmenStatus()?.status !== 'completed') ||
      (migrationsbereich === 'mitarbeiter' && this.filialenStatus()?.status !== 'completed')
    );
  });
  readonly migrationButtonLabel = computed(() => {
    if (this.datenmigrationStore.inProgress()) return 'Migration läuft';
    if (this.selectedStatus()?.status === 'completed') return 'Erneut migrieren';
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
    if (this.selectedMigrationsbereich() === 'unternehmer') {
      await this.datenmigrationStore.loadUnternehmerZiel().catch(() => undefined);
    }
    if (this.selectedMigrationsbereich() === 'firmen') {
      await this.datenmigrationStore.loadFirmenBestaende().catch(() => undefined);
    }
    if (this.selectedMigrationsbereich() === 'filialen') {
      await this.datenmigrationStore.loadFilialenBestaende().catch(() => undefined);
    }
    if (this.selectedMigrationsbereich() === 'mitarbeiter') {
      await this.datenmigrationStore.loadMitarbeiterBestaende().catch(() => undefined);
    }
  }

  /**
   * Wählt den auf der Seite angezeigten Migrationsbereich aus.
   *
   * @param migrationsbereich - Fachlicher Bereich der anzuzeigenden Migrationskarte.
   */
  async handleMigrationsbereichSelect(migrationsbereich: TDatenmigrationsbereich): Promise<void> {
    this.selectedMigrationsbereich.set(migrationsbereich);
    if (migrationsbereich === 'unternehmer') {
      await this.datenmigrationStore.loadUnternehmerZiel().catch(() => undefined);
    }
    if (migrationsbereich === 'firmen') {
      await this.datenmigrationStore.loadFirmenBestaende().catch(() => undefined);
    }
    if (migrationsbereich === 'filialen') {
      await this.datenmigrationStore.loadFilialenBestaende().catch(() => undefined);
    }
    if (migrationsbereich === 'mitarbeiter') {
      await this.datenmigrationStore.loadMitarbeiterBestaende().catch(() => undefined);
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
   * Migriert die Filialen des ausgewählten Legacy-Kunden.
   */
  async migrateFilialen(): Promise<void> {
    if (this.migrationDisabled()) return;
    await this.datenmigrationStore.migrateFilialen().catch(() => undefined);
  }

  /**
   * Migriert die Mitarbeiter des ausgewählten Legacy-Kunden.
   */
  async migrateMitarbeiter(): Promise<void> {
    if (this.migrationDisabled()) return;
    await this.datenmigrationStore.migrateMitarbeiter().catch(() => undefined);
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
      return;
    }
    if (this.selectedMigrationsbereich() === 'filialen') {
      await this.migrateFilialen();
      return;
    }
    if (this.selectedMigrationsbereich() === 'mitarbeiter') {
      await this.migrateMitarbeiter();
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
