// pur-system/src/app/components/einstellungen/oeffnungszeiten-filiale/oeffnungszeiten-filiale.ts

import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  input,
  untracked,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';

import { IFilialPfad } from '../../../commons/models/app/firestore-pfad.types';
import {
  IFilialeinstellungAusnahmeEintrag,
  IFilialeinstellungSondertagEintrag,
  STANDARD_BUNDESLAND,
  TOeffnungsregel,
  TWochenoeffnungszeiten,
  TWochentag,
} from '../../../commons/models/domain/filialeinstellung';
import { IFilialeEintrag } from '../../../commons/models/domain/filiale';
import { IFilialeinstellungGrundlagen } from '../../../services/domain/filialeinstellung.service';
import { FilialeinstellungStore } from '../../../stores/domain/filialeinstellung.store';
import { BestaetigungDialog } from '../../shared/bestaetigung-dialog/bestaetigung-dialog';
import { LokalzeitEingabe } from '../../shared/lokalzeit-eingabe/lokalzeit-eingabe';
import { DatumsausnahmeBearbeitenDialog } from '../datumsausnahme-bearbeiten-dialog/datumsausnahme-bearbeiten-dialog';
import { SondertagBearbeitenDialog } from '../sondertag-bearbeiten-dialog/sondertag-bearbeiten-dialog';

// ===== Konstanten & Typen ===================

type TTagForm = FormGroup<{
  geoeffnet: FormControl<boolean>;
  beginnLokalzeit: FormControl<string>;
  endeLokalzeit: FormControl<string>;
}>;

const WOCHENTAGE: ReadonlyArray<{ value: TWochentag; label: string }> = [
  { value: 'montag', label: 'Montag' },
  { value: 'dienstag', label: 'Dienstag' },
  { value: 'mittwoch', label: 'Mittwoch' },
  { value: 'donnerstag', label: 'Donnerstag' },
  { value: 'freitag', label: 'Freitag' },
  { value: 'samstag', label: 'Samstag' },
  { value: 'sonntag', label: 'Sonntag' },
];

function oeffnungszeitValidator(control: AbstractControl): ValidationErrors | null {
  const geoeffnet = control.get('geoeffnet')?.value;
  const beginn = control.get('beginnLokalzeit')?.value;
  const ende = control.get('endeLokalzeit')?.value;
  return geoeffnet && beginn === ende ? { identischeOeffnungszeiten: true } : null;
}

function createTagForm(): TTagForm {
  return new FormGroup(
    {
      geoeffnet: new FormControl(false, { nonNullable: true }),
      beginnLokalzeit: new FormControl(
        { value: '08:00', disabled: true },
        {
          nonNullable: true,
          validators: [Validators.required],
        },
      ),
      endeLokalzeit: new FormControl(
        { value: '18:00', disabled: true },
        {
          nonNullable: true,
          validators: [Validators.required],
        },
      ),
    },
    { validators: [oeffnungszeitValidator] },
  );
}

function updateZeitfelderStatus(form: TTagForm, geoeffnet: boolean): void {
  const zeitfelder = [form.controls.beginnLokalzeit, form.controls.endeLokalzeit];
  for (const zeitfeld of zeitfelder) {
    if (geoeffnet && zeitfeld.disabled) zeitfeld.enable({ emitEvent: false });
    if (!geoeffnet && zeitfeld.enabled) zeitfeld.disable({ emitEvent: false });
  }
}

function getOeffnungsregel(form: TTagForm): TOeffnungsregel {
  const wert = form.getRawValue();
  if (!wert.geoeffnet) {
    return {
      geoeffnet: false,
      beginnLokalzeit: wert.beginnLokalzeit,
      endeLokalzeit: wert.endeLokalzeit,
      endetAmFolgetag: wert.endeLokalzeit < wert.beginnLokalzeit,
    };
  }
  return {
    geoeffnet: true,
    beginnLokalzeit: wert.beginnLokalzeit,
    endeLokalzeit: wert.endeLokalzeit,
    endetAmFolgetag: wert.endeLokalzeit < wert.beginnLokalzeit,
  };
}

@Component({
  selector: 'app-oeffnungszeiten-filiale',
  imports: [
    MatButtonModule,
    MatCheckboxModule,
    MatIconModule,
    LokalzeitEingabe,
    ReactiveFormsModule,
  ],
  templateUrl: './oeffnungszeiten-filiale.html',
  styleUrl: './oeffnungszeiten-filiale.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OeffnungszeitenFiliale {
  // ===== Interne Dependency Injection =========

  private readonly destroyRef = inject(DestroyRef);
  private readonly dialog = inject(MatDialog);
  readonly store = inject(FilialeinstellungStore);

  // ===== Öffentliche API ======================

  readonly filiale = input.required<IFilialeEintrag>();
  readonly pfad = input.required<IFilialPfad>();

  // ===== Öffentliche Werte ====================

  readonly wochentage = WOCHENTAGE;
  readonly form = new FormGroup({
    montag: createTagForm(),
    dienstag: createTagForm(),
    mittwoch: createTagForm(),
    donnerstag: createTagForm(),
    freitag: createTagForm(),
    samstag: createTagForm(),
    sonntag: createTagForm(),
  });

  // ===== Öffentliche Ableitungen ==============

  readonly kontext = computed(() => {
    return this.store.getFilialeinstellungKontext(this.pfad());
  });
  readonly bestand = computed(() => {
    return this.kontext()?.bestand ?? null;
  });
  readonly feiertage = computed(() => {
    return (
      this.bestand()?.sondertage.filter((sondertag) => {
        return sondertag.datumsregel.typ === 'gesetzlicherFeiertag';
      }) ?? []
    );
  });
  readonly sondertage = computed(() => {
    return (
      this.bestand()
        ?.sondertage.filter((sondertag) => {
          return sondertag.datumsregel.typ === 'jaehrlichFestesDatum';
        })
        .sort((a, b) => {
          return a.bezeichnung.localeCompare(b.bezeichnung, 'de');
        }) ?? []
    );
  });
  readonly ausnahmen = computed(() => {
    const ausnahmen = [...(this.bestand()?.ausnahmen ?? [])];
    return ausnahmen.sort((a, b) => {
      return a.datum.localeCompare(b.datum);
    });
  });

  constructor() {
    for (const { value } of WOCHENTAGE) {
      const tagForm = this.getTagForm(value);
      tagForm.controls.geoeffnet.valueChanges
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe((geoeffnet) => {
          updateZeitfelderStatus(tagForm, geoeffnet);
        });
    }
    effect(() => {
      const pfad = this.pfad();
      untracked(() => {
        void this.load(pfad);
      });
    });
    effect(() => {
      const inProgress = this.kontext()?.inProgress ?? false;
      if (inProgress && this.form.enabled) this.form.disable({ emitEvent: false });
      if (!inProgress && this.form.disabled) {
        this.form.enable({ emitEvent: false });
        for (const { value } of WOCHENTAGE) {
          const tagForm = this.getTagForm(value);
          updateZeitfelderStatus(tagForm, tagForm.controls.geoeffnet.value);
        }
      }
    });
  }

  // ===== Öffentliche Aktionen =================

  /**
   * Speichert die allgemeinen Einstellungen und die Wochenöffnungszeiten.
   */
  async saveGrundlagen(): Promise<void> {
    if (this.form.invalid || this.kontext()?.inProgress) return;
    const grundlagen = this.buildGrundlagen();
    try {
      if (this.bestand()) await this.store.saveGrundlagen(this.pfad(), grundlagen);
      else await this.store.initializeFilialeinstellung(this.pfad(), grundlagen);
      this.form.markAsPristine();
    } catch {
      // Der Store stellt den Fehler im Filialkontext bereit.
    }
  }

  /**
   * Öffnet den Dialog zum Anlegen eines jährlich wiederkehrenden Sondertags.
   */
  openSondertagAnlegen(): void {
    this.dialog.open(SondertagBearbeitenDialog, {
      panelClass: ['pur-dialog__panel'],
      data: { pfad: this.pfad() },
    });
  }

  /**
   * Öffnet den Dialog zum Bearbeiten eines Sondertags.
   */
  openSondertagBearbeiten(sondertag: IFilialeinstellungSondertagEintrag): void {
    this.dialog.open(SondertagBearbeitenDialog, {
      panelClass: ['pur-dialog__panel'],
      data: { pfad: this.pfad(), sondertag },
    });
  }

  /**
   * Löscht einen benutzerdefinierten Sondertag nach Bestätigung.
   */
  deleteSondertag(sondertag: IFilialeinstellungSondertagEintrag): void {
    this.dialog
      .open(BestaetigungDialog, {
        panelClass: ['pur-dialog__panel'],
        data: {
          titel: 'Jährlichen Sondertag löschen',
          nachricht: `„${sondertag.bezeichnung}“ wirklich löschen?`,
          bestaetigenText: 'Löschen',
        },
      })
      .afterClosed()
      .subscribe((bestaetigt) => {
        if (bestaetigt)
          void this.store.deleteSondertag(this.pfad(), sondertag.id).catch(() => undefined);
      });
  }

  /**
   * Öffnet den Dialog zum Anlegen einer Datumsausnahme.
   */
  openDatumsausnahmeAnlegen(): void {
    this.dialog.open(DatumsausnahmeBearbeitenDialog, {
      panelClass: ['pur-dialog__panel'],
      data: { pfad: this.pfad() },
    });
  }

  /**
   * Öffnet den Dialog zum Bearbeiten einer Datumsausnahme.
   */
  openDatumsausnahmeBearbeiten(ausnahme: IFilialeinstellungAusnahmeEintrag): void {
    this.dialog.open(DatumsausnahmeBearbeitenDialog, {
      panelClass: ['pur-dialog__panel'],
      data: { pfad: this.pfad(), ausnahme },
    });
  }

  /**
   * Löscht eine Datumsausnahme nach Bestätigung.
   */
  deleteDatumsausnahme(ausnahme: IFilialeinstellungAusnahmeEintrag): void {
    this.dialog
      .open(BestaetigungDialog, {
        panelClass: ['pur-dialog__panel'],
        data: {
          titel: 'Einmaligen Sondertag löschen',
          nachricht: `„${ausnahme.bezeichnung}“ für den ${ausnahme.datum} wirklich löschen?`,
          bestaetigenText: 'Löschen',
        },
      })
      .afterClosed()
      .subscribe((bestaetigt) => {
        if (bestaetigt)
          void this.store.deleteAusnahme(this.pfad(), ausnahme.datum).catch(() => undefined);
      });
  }

  /**
   * Liefert das Formular eines Wochentags.
   */
  getTagForm(wochentag: TWochentag): TTagForm {
    return this.form.controls[wochentag];
  }

  /**
   * Formatiert das feste Datum eines jährlich wiederkehrenden Sondertags.
   */
  getJaehrlichesDatum(sondertag: IFilialeinstellungSondertagEintrag): string {
    const datumsregel = sondertag.datumsregel;
    if (datumsregel.typ !== 'jaehrlichFestesDatum') return '';
    return `${datumsregel.tag}.${datumsregel.monat}.`;
  }

  /**
   * Formatiert das Datum eines einmaligen Sondertags für die Listendarstellung.
   */
  getEinmaligesDatum(ausnahme: IFilialeinstellungAusnahmeEintrag): string {
    const [jahr, monat, tag] = ausnahme.datum.split('-');
    return `${tag}.${monat}.${jahr}`;
  }

  /**
   * Formatiert Aktiv- und Öffnungsstatus eines besonderen Tags für die Listendarstellung.
   */
  getOeffnungsstatus(oeffnungsregel: TOeffnungsregel, aktiv = true): string {
    if (!aktiv) return 'Inaktiv · Wochentagsregel gilt';
    if (!oeffnungsregel.geoeffnet) return 'Aktiv · Geschlossen';
    return `Aktiv · Geöffnet ${oeffnungsregel.beginnLokalzeit}–${oeffnungsregel.endeLokalzeit} Uhr`;
  }

  // ===== Interne Helfer =======================

  private async load(pfad: IFilialPfad): Promise<void> {
    try {
      await this.store.loadFilialeinstellung(pfad);
      const bestand = this.store.getFilialeinstellungKontext(pfad)?.bestand;
      if (!bestand) return;
      for (const { value } of WOCHENTAGE) {
        const regel = bestand.oeffnungszeiten.wochenregeln[value];
        const tagForm = this.getTagForm(value);
        tagForm.reset(
          {
            geoeffnet: regel.geoeffnet,
            beginnLokalzeit: regel.beginnLokalzeit ?? '08:00',
            endeLokalzeit: regel.endeLokalzeit ?? '18:00',
          },
          { emitEvent: false },
        );
        updateZeitfelderStatus(tagForm, regel.geoeffnet);
      }
      this.form.markAsPristine();
    } catch {
      // Der Store stellt den Fehler im Filialkontext bereit.
    }
  }

  private buildGrundlagen(): IFilialeinstellungGrundlagen {
    const wochenregeln = Object.fromEntries(
      WOCHENTAGE.map(({ value }) => [value, getOeffnungsregel(this.getTagForm(value))]),
    ) as unknown as TWochenoeffnungszeiten;
    return { bundesland: STANDARD_BUNDESLAND, wochenregeln };
  }
}
