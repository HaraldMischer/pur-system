// pur-system/src/app/components/einstellungen/oeffnungszeiten-filiale/oeffnungszeiten-filiale.ts

import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
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
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';

import { STANDARD_OEFFNUNGSREGEL } from '../../../commons/constants/filialeinstellung.constants';
import { IFilialPfad } from '../../../commons/models/app/firestore-pfad.types';
import { IFilialeEintrag } from '../../../commons/models/domain/filiale';
import {
  IFilialeinstellungSondertagEintrag,
  IGeoeffneteOeffnungsregel,
  STANDARD_BUNDESLAND,
  TSondertagsmodus,
  TOeffnungsregel,
  TWochenregeln,
  TWochentag,
  TWochentagsmodus,
} from '../../../commons/models/domain/filialeinstellung';
import {
  createInitialeSondertage,
  getBerechneterSondertagDatum,
  getGesetzlicherFeiertagDatum,
} from '../../../commons/utils/filialeinstellung/feiertag';
import {
  getSondertagsmodus as getGespeichertenSondertagsmodus,
  resolveOeffnungsregel,
  resolveWochenoeffnungsregel,
} from '../../../commons/utils/filialeinstellung/oeffnungsregel-aufloesung';
import { IFilialeinstellungGrundlagen } from '../../../services/domain/filialeinstellung.service';
import { FilialeinstellungStore } from '../../../stores/domain/filialeinstellung.store';
import { BestaetigungDialog } from '../../shared/bestaetigung-dialog/bestaetigung-dialog';
import { EingabeZeit } from '../../shared/eingabe-zeit/eingabe-zeit';
import {
  AbweichendeOeffnungszeitBearbeitenDialog,
  IAbweichendeOeffnungszeitBearbeitenDialogDaten,
  IAbweichendeOeffnungszeitBearbeitenDialogErgebnis,
} from '../abweichende-oeffnungszeit-bearbeiten-dialog/abweichende-oeffnungszeit-bearbeiten-dialog';
import { SondertagBearbeitenDialog } from '../sondertag-bearbeiten-dialog/sondertag-bearbeiten-dialog';

// ===== Konstanten & Typen ===================

type TTagForm = FormGroup<{
  modus: FormControl<TWochentagsmodus>;
  beginnLokalzeit: FormControl<string>;
  endeLokalzeit: FormControl<string>;
}>;

type TZeitfolgeForm = FormGroup<{
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
  const modus = control.get('modus')?.value;
  const beginn = control.get('beginnLokalzeit')?.value;
  const ende = control.get('endeLokalzeit')?.value;
  if (modus !== undefined && modus !== 'abweichend') return null;
  return beginn === ende ? { identischeOeffnungszeiten: true } : null;
}

function createStandardoeffnungsregelForm(): TZeitfolgeForm {
  return new FormGroup(
    {
      beginnLokalzeit: new FormControl(STANDARD_OEFFNUNGSREGEL.beginnLokalzeit, {
        nonNullable: true,
        validators: [Validators.required],
      }),
      endeLokalzeit: new FormControl(STANDARD_OEFFNUNGSREGEL.endeLokalzeit, {
        nonNullable: true,
        validators: [Validators.required],
      }),
    },
    { validators: [oeffnungszeitValidator] },
  );
}

function createTagForm(): TTagForm {
  return new FormGroup(
    {
      modus: new FormControl<TWochentagsmodus>('standard', { nonNullable: true }),
      beginnLokalzeit: new FormControl(STANDARD_OEFFNUNGSREGEL.beginnLokalzeit, {
        nonNullable: true,
        validators: [Validators.required],
      }),
      endeLokalzeit: new FormControl(STANDARD_OEFFNUNGSREGEL.endeLokalzeit, {
        nonNullable: true,
        validators: [Validators.required],
      }),
    },
    { validators: [oeffnungszeitValidator] },
  );
}

function getGeoeffneteOeffnungsregel(form: TZeitfolgeForm | TTagForm): IGeoeffneteOeffnungsregel {
  const wert = form.getRawValue();
  return {
    geoeffnet: true,
    beginnLokalzeit: wert.beginnLokalzeit,
    endeLokalzeit: wert.endeLokalzeit,
    endetAmFolgetag: wert.endeLokalzeit < wert.beginnLokalzeit,
  };
}

function updateZeitfelderStatus(form: TTagForm, modus: TWochentagsmodus): void {
  const zeitfelder = [form.controls.beginnLokalzeit, form.controls.endeLokalzeit];
  for (const zeitfeld of zeitfelder) {
    if (modus === 'abweichend' && zeitfeld.disabled) zeitfeld.enable({ emitEvent: false });
    if (modus !== 'abweichend' && zeitfeld.enabled) zeitfeld.disable({ emitEvent: false });
  }
}

function getWochenregel(form: TTagForm): TWochenregeln[TWochentag] {
  const modus = form.controls.modus.value;
  if (modus === 'standard') return { modus };
  if (modus === 'geschlossen') return { modus };
  return { modus, oeffnungsregel: getGeoeffneteOeffnungsregel(form) };
}

@Component({
  selector: 'app-oeffnungszeiten-filiale',
  imports: [
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatSelectModule,
    EingabeZeit,
    ReactiveFormsModule,
  ],
  templateUrl: './oeffnungszeiten-filiale.html',
  styleUrl: './oeffnungszeiten-filiale.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OeffnungszeitenFiliale {
  // ===== Interne Dependency Injection =========

  private readonly destroyRef = inject(DestroyRef);
  private readonly changeDetectorRef = inject(ChangeDetectorRef);
  private readonly dialog = inject(MatDialog);
  readonly store = inject(FilialeinstellungStore);

  // ===== Öffentliche API ======================

  readonly filiale = input.required<IFilialeEintrag>();
  readonly pfad = input.required<IFilialPfad>();

  // ===== Öffentliche Werte ====================

  readonly wochentage = WOCHENTAGE;
  readonly kalenderjahr = new Date().getFullYear();
  readonly form = new FormGroup({
    standardoeffnungsregel: createStandardoeffnungsregelForm(),
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
  readonly hasFehlendeSystemtage = computed(() => {
    const bestand = this.bestand();
    if (!bestand) return false;
    const vorhandeneIds = new Set(
      bestand.sondertage
        .filter((sondertag) => {
          return sondertag.herkunft === 'system';
        })
        .map((sondertag) => {
          return sondertag.id;
        }),
    );
    return createInitialeSondertage(
      bestand.allgemein.bundesland,
      bestand.oeffnungszeiten.standardoeffnungsregel,
    ).some((sondertag) => {
      return !vorhandeneIds.has(sondertag.id);
    });
  });
  readonly feiertage = computed(() => {
    return (
      this.bestand()
        ?.sondertage.filter((sondertag) => {
          return sondertag.datumsregel.typ === 'gesetzlicherFeiertag';
        })
        .sort((links, rechts) => {
          return this.getFeiertagSortierdatum(links).localeCompare(
            this.getFeiertagSortierdatum(rechts),
          );
        }) ?? []
    );
  });
  readonly sondertage = computed(() => {
    return (
      this.bestand()
        ?.sondertage.filter((sondertag) => {
          return sondertag.datumsregel.typ !== 'gesetzlicherFeiertag';
        })
        .sort((links, rechts) => {
          return (this.getSondertagIsoDatum(links) ?? '9999-12-31').localeCompare(
            this.getSondertagIsoDatum(rechts) ?? '9999-12-31',
          );
        }) ?? []
    );
  });
  constructor() {
    for (const { value } of WOCHENTAGE) {
      const tagForm = this.getTagForm(value);
      let vorherigerModus = tagForm.controls.modus.value;
      tagForm.controls.modus.valueChanges
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe((modus) => {
          if (modus === 'abweichend' && vorherigerModus === 'standard') {
            const standard = this.form.controls.standardoeffnungsregel.getRawValue();
            tagForm.patchValue(standard, { emitEvent: false });
          }
          updateZeitfelderStatus(tagForm, modus);
          vorherigerModus = modus;
        });
      updateZeitfelderStatus(tagForm, tagForm.controls.modus.value);
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
          updateZeitfelderStatus(tagForm, tagForm.controls.modus.value);
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
      (this.bestand() !== null && this.form.pristine && !this.hasFehlendeSystemtage())
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
   * Öffnet den Dialog zum Bearbeiten einer abweichenden Wochenöffnungszeit.
   */
  openWochenoeffnungszeitBearbeiten(wochentag: TWochentag): void {
    const tagForm = this.getTagForm(wochentag);
    const bezeichnung = WOCHENTAGE.find((eintrag) => {
      return eintrag.value === wochentag;
    })?.label;
    if (!bezeichnung || tagForm.controls.modus.value !== 'abweichend') return;
    this.dialog
      .open<
        AbweichendeOeffnungszeitBearbeitenDialog,
        IAbweichendeOeffnungszeitBearbeitenDialogDaten,
        IAbweichendeOeffnungszeitBearbeitenDialogErgebnis | undefined
      >(AbweichendeOeffnungszeitBearbeitenDialog, {
        panelClass: ['pur-dialog__panel'],
        data: {
          bezeichnung,
          beginnLokalzeit: tagForm.controls.beginnLokalzeit.value,
          endeLokalzeit: tagForm.controls.endeLokalzeit.value,
        },
      })
      .afterClosed()
      .subscribe((ergebnis) => {
        if (!ergebnis) return;
        tagForm.patchValue(ergebnis);
        tagForm.markAsDirty();
        this.changeDetectorRef.detectChanges();
      });
  }

  /**
   * Speichert die ausgewählte Öffnungsart eines Feiertags oder jährlichen Sondertags.
   */
  async updateSondertagsmodus(
    sondertag: IFilialeinstellungSondertagEintrag,
    modus: TSondertagsmodus,
  ): Promise<void> {
    if (this.kontext()?.inProgress || this.getSondertagsmodus(sondertag) === modus) return;
    if (modus === 'wieSonntag' && sondertag.datumsregel.typ !== 'gesetzlicherFeiertag') return;
    const zeitvorbelegung = this.getSondertagZeitvorbelegung(sondertag);
    const oeffnungsregel: TOeffnungsregel =
      modus === 'abweichend'
        ? {
            geoeffnet: true,
            beginnLokalzeit: zeitvorbelegung.beginnLokalzeit,
            endeLokalzeit: zeitvorbelegung.endeLokalzeit,
            endetAmFolgetag: zeitvorbelegung.endeLokalzeit < zeitvorbelegung.beginnLokalzeit,
          }
        : modus === 'geschlossen'
          ? {
              geoeffnet: false,
              beginnLokalzeit: zeitvorbelegung.beginnLokalzeit,
              endeLokalzeit: zeitvorbelegung.endeLokalzeit,
              endetAmFolgetag: zeitvorbelegung.endeLokalzeit < zeitvorbelegung.beginnLokalzeit,
            }
          : sondertag.oeffnungsregel;
    try {
      await this.saveSondertagOeffnungsregel(sondertag, modus, oeffnungsregel);
    } catch {
      // Der Store stellt den Fehler im Filialkontext bereit.
    }
  }

  /**
   * Öffnet den Dialog zum Bearbeiten einer abweichenden Sondertagsöffnung.
   */
  openSondertagOeffnungszeitBearbeiten(sondertag: IFilialeinstellungSondertagEintrag): void {
    if (this.getSondertagsmodus(sondertag) !== 'abweichend') return;
    const oeffnungsregel = sondertag.oeffnungsregel;
    if (!oeffnungsregel.geoeffnet) return;
    this.dialog
      .open<
        AbweichendeOeffnungszeitBearbeitenDialog,
        IAbweichendeOeffnungszeitBearbeitenDialogDaten,
        IAbweichendeOeffnungszeitBearbeitenDialogErgebnis | undefined
      >(AbweichendeOeffnungszeitBearbeitenDialog, {
        panelClass: ['pur-dialog__panel'],
        data: {
          bezeichnung: sondertag.bezeichnung,
          beginnLokalzeit: oeffnungsregel.beginnLokalzeit,
          endeLokalzeit: oeffnungsregel.endeLokalzeit,
        },
      })
      .afterClosed()
      .subscribe((ergebnis) => {
        if (!ergebnis) return;
        void this.saveSondertagOeffnungszeit(sondertag, ergebnis);
      });
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
      data: {
        pfad: this.pfad(),
        sondertag,
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
   * Liefert das Formular eines Wochentags.
   */
  getTagForm(wochentag: TWochentag): TTagForm {
    return this.form.controls[wochentag];
  }

  /**
   * Formatiert das Datum eines jährlichen Sondertags für das aktuelle Kalenderjahr.
   */
  getJaehrlichesDatum(sondertag: IFilialeinstellungSondertagEintrag): string {
    const datumsregel = sondertag.datumsregel;
    if (datumsregel.typ === 'jaehrlichFestesDatum') {
      const tag = String(datumsregel.tag).padStart(2, '0');
      const monat = String(datumsregel.monat).padStart(2, '0');
      return `${tag}.${monat}.${String(this.kalenderjahr).slice(-2)}`;
    }
    if (datumsregel.typ !== 'berechneterSondertag') return '';
    const datum = getBerechneterSondertagDatum(this.kalenderjahr, datumsregel.sondertagSchluessel);
    const [jahr, monat, tag] = datum.split('-');
    return `${tag}.${monat}.${jahr.slice(-2)}`;
  }

  /**
   * Formatiert das Datum eines gesetzlichen Feiertags für das aktuelle Kalenderjahr.
   */
  getFeiertagDatum(sondertag: IFilialeinstellungSondertagEintrag): string {
    const datumsregel = sondertag.datumsregel;
    if (datumsregel.typ !== 'gesetzlicherFeiertag') return '';
    const datum = getGesetzlicherFeiertagDatum(this.kalenderjahr, datumsregel.feiertagSchluessel);
    if (!datum) return '–';
    const [jahr, monat, tag] = datum.split('-');
    return `${tag}.${monat}.${jahr.slice(-2)}`;
  }

  /**
   * Liefert die in der Oberfläche verwendete Öffnungsart eines Feiertags oder Sondertags.
   */
  getSondertagsmodus(sondertag: IFilialeinstellungSondertagEintrag): TSondertagsmodus {
    return getGespeichertenSondertagsmodus(sondertag);
  }

  /**
   * Liefert die für die Anzeige wirksame Öffnungsregel eines Feiertags oder Sondertags.
   */
  getSondertagOeffnungsregel(sondertag: IFilialeinstellungSondertagEintrag): TOeffnungsregel {
    const modus = this.getSondertagsmodus(sondertag);
    if (modus === 'standard') return this.getSondertagStandardregel(sondertag);
    if (modus === 'wieSonntag') return this.getSonntagsregel();
    return sondertag.oeffnungsregel;
  }

  /**
   * Formatiert eine Öffnungsregel für die Listendarstellung.
   */
  getOeffnungszeit(oeffnungsregel: TOeffnungsregel): string {
    if (!oeffnungsregel.geoeffnet) return 'Keine Kundenöffnung';
    return `${oeffnungsregel.beginnLokalzeit}–${oeffnungsregel.endeLokalzeit} Uhr`;
  }

  // ===== Interne Helfer =======================

  private async load(pfad: IFilialPfad): Promise<void> {
    try {
      await this.store.loadFilialeinstellung(pfad);
      const bestand = this.store.getFilialeinstellungKontext(pfad)?.bestand;
      if (!bestand) return;
      const standardoeffnungsregel = bestand.oeffnungszeiten.standardoeffnungsregel;
      this.form.controls.standardoeffnungsregel.reset(
        {
          beginnLokalzeit: standardoeffnungsregel.beginnLokalzeit,
          endeLokalzeit: standardoeffnungsregel.endeLokalzeit,
        },
        { emitEvent: false },
      );
      for (const { value } of WOCHENTAGE) {
        const regel = bestand.oeffnungszeiten.wochenregeln[value];
        const tagForm = this.getTagForm(value);
        const abweichendeRegel =
          regel.modus === 'abweichend' ? regel.oeffnungsregel : standardoeffnungsregel;
        tagForm.reset(
          {
            modus: regel.modus,
            beginnLokalzeit: abweichendeRegel.beginnLokalzeit,
            endeLokalzeit: abweichendeRegel.endeLokalzeit,
          },
          { emitEvent: false },
        );
        updateZeitfelderStatus(tagForm, regel.modus);
      }
      this.form.updateValueAndValidity({ emitEvent: false });
      this.form.markAsPristine();
    } catch {
      // Der Store stellt den Fehler im Filialkontext bereit.
    }
  }

  private buildGrundlagen(): IFilialeinstellungGrundlagen {
    const wochenregeln = Object.fromEntries(
      WOCHENTAGE.map(({ value }) => [value, getWochenregel(this.getTagForm(value))]),
    ) as unknown as TWochenregeln;
    return {
      bundesland: STANDARD_BUNDESLAND,
      standardoeffnungsregel: getGeoeffneteOeffnungsregel(
        this.form.controls.standardoeffnungsregel,
      ),
      wochenregeln,
    };
  }

  private getFeiertagSortierdatum(sondertag: IFilialeinstellungSondertagEintrag): string {
    const datumsregel = sondertag.datumsregel;
    if (datumsregel.typ !== 'gesetzlicherFeiertag') return '9999-12-31';
    return (
      getGesetzlicherFeiertagDatum(this.kalenderjahr, datumsregel.feiertagSchluessel) ??
      '9999-12-31'
    );
  }

  private getSondertagStandardregel(
    sondertag: IFilialeinstellungSondertagEintrag,
  ): TOeffnungsregel {
    if (sondertag.datumsregel.typ === 'gesetzlicherFeiertag') {
      return getGeoeffneteOeffnungsregel(this.form.controls.standardoeffnungsregel);
    }
    const datum = this.getSondertagIsoDatum(sondertag);
    if (!datum) return { geoeffnet: false };
    const grundlagen = this.buildGrundlagen();
    return resolveOeffnungsregel({
      datum,
      standardoeffnungsregel: grundlagen.standardoeffnungsregel,
      wochenregeln: grundlagen.wochenregeln,
      sondertage: [],
    }).oeffnungsregel;
  }

  private getSonntagsregel(): TOeffnungsregel {
    const grundlagen = this.buildGrundlagen();
    return resolveWochenoeffnungsregel(
      grundlagen.standardoeffnungsregel,
      grundlagen.wochenregeln,
      'sonntag',
    );
  }

  private getSondertagZeitvorbelegung(
    sondertag: IFilialeinstellungSondertagEintrag,
  ): IGeoeffneteOeffnungsregel {
    const gespeichert = sondertag.oeffnungsregel;
    if (
      (gespeichert.geoeffnet || sondertag.aktiv) &&
      gespeichert.beginnLokalzeit &&
      gespeichert.endeLokalzeit
    ) {
      return {
        geoeffnet: true,
        beginnLokalzeit: gespeichert.beginnLokalzeit,
        endeLokalzeit: gespeichert.endeLokalzeit,
        endetAmFolgetag: gespeichert.endeLokalzeit < gespeichert.beginnLokalzeit,
      };
    }
    const standardregel = this.getSondertagStandardregel(sondertag);
    if (standardregel.geoeffnet) return standardregel;
    return getGeoeffneteOeffnungsregel(this.form.controls.standardoeffnungsregel);
  }

  private getSondertagIsoDatum(sondertag: IFilialeinstellungSondertagEintrag): string | null {
    const datumsregel = sondertag.datumsregel;
    if (datumsregel.typ === 'gesetzlicherFeiertag') {
      return getGesetzlicherFeiertagDatum(this.kalenderjahr, datumsregel.feiertagSchluessel);
    }
    if (datumsregel.typ === 'berechneterSondertag') {
      return getBerechneterSondertagDatum(this.kalenderjahr, datumsregel.sondertagSchluessel);
    }
    const pruefdatum = new Date(
      Date.UTC(this.kalenderjahr, datumsregel.monat - 1, datumsregel.tag),
    );
    if (
      pruefdatum.getUTCMonth() + 1 !== datumsregel.monat ||
      pruefdatum.getUTCDate() !== datumsregel.tag
    )
      return null;
    const monat = String(datumsregel.monat).padStart(2, '0');
    const tag = String(datumsregel.tag).padStart(2, '0');
    return `${this.kalenderjahr}-${monat}-${tag}`;
  }

  private async saveSondertagOeffnungszeit(
    sondertag: IFilialeinstellungSondertagEintrag,
    ergebnis: IAbweichendeOeffnungszeitBearbeitenDialogErgebnis,
  ): Promise<void> {
    if (this.kontext()?.inProgress) return;
    try {
      await this.saveSondertagOeffnungsregel(sondertag, 'abweichend', {
        geoeffnet: true,
        beginnLokalzeit: ergebnis.beginnLokalzeit,
        endeLokalzeit: ergebnis.endeLokalzeit,
        endetAmFolgetag: ergebnis.endeLokalzeit < ergebnis.beginnLokalzeit,
      });
    } catch {
      // Der Store stellt den Fehler im Filialkontext bereit.
    }
  }

  private async saveSondertagOeffnungsregel(
    sondertag: IFilialeinstellungSondertagEintrag,
    modus: TSondertagsmodus,
    oeffnungsregel: TOeffnungsregel,
  ): Promise<void> {
    const aktiv = modus !== 'standard';
    if (sondertag.herkunft === 'system') {
      await this.store.updateSystemSondertag(this.pfad(), sondertag.id, {
        aktiv,
        modus,
        oeffnungsregel,
      });
      return;
    }
    if (sondertag.datumsregel.typ !== 'jaehrlichFestesDatum') return;
    await this.store.updateSondertag(this.pfad(), sondertag.id, {
      bezeichnung: sondertag.bezeichnung,
      aktiv,
      datumsregel: sondertag.datumsregel,
      oeffnungsregel,
    });
  }
}
