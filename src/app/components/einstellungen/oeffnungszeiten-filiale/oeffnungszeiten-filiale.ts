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

import { STANDARD_SCHLIESSZEITRAUM_NRW } from '../../../commons/constants/filialeinstellung.constants';
import { IFilialPfad } from '../../../commons/models/app/firestore-pfad.types';
import { IFilialeEintrag } from '../../../commons/models/domain/filiale';
import {
  IFilialeinstellungAusnahmeEintrag,
  IFilialeinstellungSondertagEintrag,
  ISchliesszeitraum,
  STANDARD_BUNDESLAND,
  TOeffnungsregel,
  TWochenoeffnungszeiten,
  TWochentag,
} from '../../../commons/models/domain/filialeinstellung';
import {
  getMaximalerOeffnungsrahmen,
  isGueltigerSchliesszeitraum,
  isOeffnungsregelInnerhalbOeffnungsrahmen,
} from '../../../commons/utils/filialeinstellung/schliesszeitraum';
import { IFilialeinstellungGrundlagen } from '../../../services/domain/filialeinstellung.service';
import { FilialeinstellungStore } from '../../../stores/domain/filialeinstellung.store';
import { BestaetigungDialog } from '../../shared/bestaetigung-dialog/bestaetigung-dialog';
import { EingabeZeit } from '../../shared/eingabe-zeit/eingabe-zeit';
import { DatumsausnahmeBearbeitenDialog } from '../datumsausnahme-bearbeiten-dialog/datumsausnahme-bearbeiten-dialog';
import { SondertagBearbeitenDialog } from '../sondertag-bearbeiten-dialog/sondertag-bearbeiten-dialog';

// ===== Konstanten & Typen ===================

type TTagForm = FormGroup<{
  geoeffnet: FormControl<boolean>;
  beginnLokalzeit: FormControl<string>;
  endeLokalzeit: FormControl<string>;
}>;

type TSchliesszeitraumForm = FormGroup<{
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

function schliesszeitraumValidator(control: AbstractControl): ValidationErrors | null {
  const beginn = control.get('beginnLokalzeit')?.value;
  const ende = control.get('endeLokalzeit')?.value;
  return beginn === ende ? { identischeSchliesszeiten: true } : null;
}

function createSchliesszeitraumForm(): TSchliesszeitraumForm {
  return new FormGroup(
    {
      beginnLokalzeit: new FormControl(STANDARD_SCHLIESSZEITRAUM_NRW.beginnLokalzeit, {
        nonNullable: true,
        validators: [Validators.required],
      }),
      endeLokalzeit: new FormControl(STANDARD_SCHLIESSZEITRAUM_NRW.endeLokalzeit, {
        nonNullable: true,
        validators: [Validators.required],
      }),
    },
    { validators: [schliesszeitraumValidator] },
  );
}

function createTagForm(
  schliesszeitraum: ISchliesszeitraum = STANDARD_SCHLIESSZEITRAUM_NRW,
): TTagForm {
  const oeffnungsrahmen = getMaximalerOeffnungsrahmen(schliesszeitraum);
  return new FormGroup(
    {
      geoeffnet: new FormControl(true, { nonNullable: true }),
      beginnLokalzeit: new FormControl(oeffnungsrahmen.beginnLokalzeit, {
        nonNullable: true,
        validators: [Validators.required],
      }),
      endeLokalzeit: new FormControl(oeffnungsrahmen.endeLokalzeit, {
        nonNullable: true,
        validators: [Validators.required],
      }),
    },
    { validators: [oeffnungszeitValidator] },
  );
}

function getSchliesszeitraum(form: TSchliesszeitraumForm): ISchliesszeitraum {
  const wert = form.getRawValue();
  return {
    beginnLokalzeit: wert.beginnLokalzeit,
    endeLokalzeit: wert.endeLokalzeit,
    endetAmFolgetag: wert.endeLokalzeit < wert.beginnLokalzeit,
  };
}

function oeffnungszeitenFormValidator(control: AbstractControl): ValidationErrors | null {
  const schliesszeitraumForm = control.get('schliesszeitraum') as TSchliesszeitraumForm | null;
  if (!schliesszeitraumForm) return null;
  const schliesszeitraum = getSchliesszeitraum(schliesszeitraumForm);
  if (!isGueltigerSchliesszeitraum(schliesszeitraum)) return null;
  const widerspruch = WOCHENTAGE.find(({ value }) => {
    const tagForm = control.get(value) as TTagForm | null;
    return (
      tagForm !== null &&
      !isOeffnungsregelInnerhalbOeffnungsrahmen(getOeffnungsregel(tagForm), schliesszeitraum)
    );
  });
  return widerspruch ? { oeffnungsregelAusserhalbOeffnungsrahmen: widerspruch.label } : null;
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
  imports: [MatButtonModule, MatCheckboxModule, MatIconModule, EingabeZeit, ReactiveFormsModule],
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
  readonly form = new FormGroup(
    {
      schliesszeitraum: createSchliesszeitraumForm(),
      montag: createTagForm(),
      dienstag: createTagForm(),
      mittwoch: createTagForm(),
      donnerstag: createTagForm(),
      freitag: createTagForm(),
      samstag: createTagForm(),
      sonntag: createTagForm(),
    },
    { validators: [oeffnungszeitenFormValidator] },
  );

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
    if (
      this.form.invalid ||
      this.kontext()?.inProgress ||
      (this.bestand() !== null && this.form.pristine)
    )
      return;
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
      data: { pfad: this.pfad(), schliesszeitraum: this.getGespeichertenSchliesszeitraum() },
    });
  }

  /**
   * Öffnet den Dialog zum Bearbeiten eines Sondertags.
   */
  openSondertagBearbeiten(sondertag: IFilialeinstellungSondertagEintrag): void {
    this.dialog.open(SondertagBearbeitenDialog, {
      panelClass: ['pur-dialog__panel'],
      data: {
        pfad: this.pfad(),
        sondertag,
        schliesszeitraum: this.getGespeichertenSchliesszeitraum(),
      },
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
      data: { pfad: this.pfad(), schliesszeitraum: this.getGespeichertenSchliesszeitraum() },
    });
  }

  /**
   * Öffnet den Dialog zum Bearbeiten einer Datumsausnahme.
   */
  openDatumsausnahmeBearbeiten(ausnahme: IFilialeinstellungAusnahmeEintrag): void {
    this.dialog.open(DatumsausnahmeBearbeitenDialog, {
      panelClass: ['pur-dialog__panel'],
      data: {
        pfad: this.pfad(),
        ausnahme,
        schliesszeitraum: this.getGespeichertenSchliesszeitraum(),
      },
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
      this.form.controls.schliesszeitraum.reset(
        {
          beginnLokalzeit: bestand.oeffnungszeiten.schliesszeitraum.beginnLokalzeit,
          endeLokalzeit: bestand.oeffnungszeiten.schliesszeitraum.endeLokalzeit,
        },
        { emitEvent: false },
      );
      const oeffnungsrahmen = getMaximalerOeffnungsrahmen(bestand.oeffnungszeiten.schliesszeitraum);
      for (const { value } of WOCHENTAGE) {
        const regel = bestand.oeffnungszeiten.wochenregeln[value];
        const tagForm = this.getTagForm(value);
        tagForm.reset(
          {
            geoeffnet: regel.geoeffnet,
            beginnLokalzeit: regel.beginnLokalzeit ?? oeffnungsrahmen.beginnLokalzeit,
            endeLokalzeit: regel.endeLokalzeit ?? oeffnungsrahmen.endeLokalzeit,
          },
          { emitEvent: false },
        );
        updateZeitfelderStatus(tagForm, regel.geoeffnet);
      }
      this.form.updateValueAndValidity({ emitEvent: false });
      this.form.markAsPristine();
    } catch {
      // Der Store stellt den Fehler im Filialkontext bereit.
    }
  }

  private buildGrundlagen(): IFilialeinstellungGrundlagen {
    const wochenregeln = Object.fromEntries(
      WOCHENTAGE.map(({ value }) => [value, getOeffnungsregel(this.getTagForm(value))]),
    ) as unknown as TWochenoeffnungszeiten;
    return {
      bundesland: STANDARD_BUNDESLAND,
      schliesszeitraum: this.getAktuellenSchliesszeitraum(),
      wochenregeln,
    };
  }

  private getAktuellenSchliesszeitraum(): ISchliesszeitraum {
    return getSchliesszeitraum(this.form.controls.schliesszeitraum);
  }

  private getGespeichertenSchliesszeitraum(): ISchliesszeitraum {
    return this.bestand()?.oeffnungszeiten.schliesszeitraum ?? this.getAktuellenSchliesszeitraum();
  }
}
