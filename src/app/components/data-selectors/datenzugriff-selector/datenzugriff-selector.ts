// pur-system/src/app/components/data-selectors/datenzugriff-selector/datenzugriff-selector.ts

import {
  ChangeDetectionStrategy,
  Component,
  booleanAttribute,
  computed,
  input,
  model,
} from '@angular/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { IUnternehmerAuswahl } from '../../../commons/models/domain/datenzugriff';

@Component({
  selector: 'app-datenzugriff-selector',
  imports: [MatFormFieldModule, MatSelectModule],
  templateUrl: './datenzugriff-selector.html',
  styleUrl: './datenzugriff-selector.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DatenzugriffSelector {
  readonly unternehmer = input.required<readonly IUnternehmerAuswahl[]>();
  readonly unternehmerMehrfach = input(false, { transform: booleanAttribute });
  readonly firmenMehrfach = input(false, { transform: booleanAttribute });
  readonly filialenMehrfach = input(false, { transform: booleanAttribute });
  readonly filialenSichtbar = input(true, { transform: booleanAttribute });
  readonly firmenLaden = input(false);
  readonly filialenLaden = input(false);
  readonly unternehmerIds = model<readonly string[]>([]);
  readonly firmaIds = model<readonly string[]>([]);
  readonly filialen = model<Readonly<Partial<Record<string, readonly string[]>>>>({});
  readonly ausgewaehlteUnternehmer = computed(() =>
    this.unternehmer().filter((eintrag) => this.unternehmerIds().includes(eintrag.id)),
  );
  readonly firmen = computed(() =>
    this.ausgewaehlteUnternehmer().flatMap((unternehmer) =>
      unternehmer.firmen.map((firma) => ({
        ...firma,
        firmaId: firma.id,
        id: this.getFirmaSchluessel(unternehmer.id, firma.id),
        unternehmerId: unternehmer.id,
        unternehmerAnzeigename: unternehmer.anzeigename,
      })),
    ),
  );
  readonly firmengruppen = computed(() =>
    this.ausgewaehlteUnternehmer().map((unternehmer) => ({
      id: unternehmer.id,
      anzeigename: unternehmer.anzeigename,
      firmen: this.firmen().filter((firma) => firma.unternehmerId === unternehmer.id),
    })),
  );
  readonly ausgewaehlteFirmen = computed(() =>
    this.firmen().filter((firma) => this.firmaIds().includes(firma.id)),
  );
  readonly filialAnzahl = computed(() =>
    Object.values(this.filialen()).reduce((anzahl, ids) => anzahl + (ids?.length ?? 0), 0),
  );

  readonly filialSchluessel = computed(() =>
    this.ausgewaehlteFirmen().flatMap((firma) =>
      (this.filialen()[firma.id] ?? []).map((id) => this.getFilialSchluessel(firma.id, id)),
    ),
  );
  readonly hatFilialen = computed(() =>
    this.ausgewaehlteFirmen().some((firma) => firma.filialen.length > 0),
  );

  getFirmaSchluessel(unternehmerId: string, firmaId: string): string {
    return JSON.stringify([unternehmerId, firmaId]);
  }

  getFilialSchluessel(firmaId: string, filialId: string): string {
    return JSON.stringify([firmaId, filialId]);
  }

  selectFirmen(auswahl: string | readonly string[] | null): void {
    const ids = typeof auswahl === 'string' ? [auswahl] : (auswahl ?? []);
    const gueltig = [...new Set(ids)].filter((id) =>
      this.firmen().some((firma) => firma.id === id),
    );
    const gewaehlt = this.firmenMehrfach() ? gueltig : gueltig.slice(0, 1);
    this.firmaIds.set(gewaehlt);
    this.filialen.update((filialen) =>
      Object.fromEntries(Object.entries(filialen).filter(([id]) => gewaehlt.includes(id))),
    );
  }

  selectFilialen(auswahl: string | readonly string[] | null): void {
    const schluessel = typeof auswahl === 'string' ? [auswahl] : (auswahl ?? []);
    const verfuegbar = this.ausgewaehlteFirmen().flatMap((firma) =>
      firma.filialen.map((filiale) => ({
        firmaId: firma.id,
        filialId: filiale.id,
        schluessel: this.getFilialSchluessel(firma.id, filiale.id),
      })),
    );
    const gueltig = [...new Set(schluessel)].flatMap((wert) => {
      const eintrag = verfuegbar.find((filiale) => filiale.schluessel === wert);
      return eintrag ? [eintrag] : [];
    });
    const gewaehlt = this.filialenMehrfach() ? gueltig : gueltig.slice(0, 1);
    const filialen: Record<string, string[]> = {};
    for (const eintrag of gewaehlt) (filialen[eintrag.firmaId] ??= []).push(eintrag.filialId);
    this.filialen.set(filialen);
  }

  selectUnternehmer(auswahl: string | readonly string[] | null): void {
    const ids = typeof auswahl === 'string' ? [auswahl] : (auswahl ?? []);
    const gueltig = [...new Set(ids)].filter((id) =>
      this.unternehmer().some((eintrag) => eintrag.id === id),
    );
    this.unternehmerIds.set(this.unternehmerMehrfach() ? gueltig : gueltig.slice(0, 1));
    this.selectFirmen(this.firmaIds());
  }

  selectFirma(id: string, ausgewaehlt: boolean): void {
    if (!this.firmen().some((firma) => firma.id === id)) return;
    this.selectFirmen(
      ausgewaehlt
        ? this.firmenMehrfach()
          ? [...this.firmaIds(), id]
          : [id]
        : this.firmaIds().filter((wert) => wert !== id),
    );
  }

  selectFiliale(firmaId: string, filialId: string, ausgewaehlt: boolean): void {
    const firma = this.ausgewaehlteFirmen().find((eintrag) => eintrag.id === firmaId);
    if (!firma?.filialen.some((filiale) => filiale.id === filialId)) return;
    const schluessel = this.getFilialSchluessel(firmaId, filialId);
    this.selectFilialen(
      ausgewaehlt
        ? this.filialenMehrfach()
          ? [...this.filialSchluessel(), schluessel]
          : [schluessel]
        : this.filialSchluessel().filter((wert) => wert !== schluessel),
    );
  }
}
