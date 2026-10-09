// pur-system/src/app/components/systemverwaltung/benutzer/datenzugriff-selector/datenzugriff-selector.spec.ts

import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { MatSelect } from '@angular/material/select';
import { OverlayContainer } from '@angular/cdk/overlay';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { DatenzugriffSelector } from './datenzugriff-selector';
const DATENZUGRIFF_MOCK = [
  {
    id: 'demo-unternehmer-west',
    anzeigename: 'West',
    firmen: [
      {
        id: 'demo-firma-ruhr',
        anzeigename: 'Ruhr',
        filialen: [
          { id: 'demo-bochum', anzeigename: 'Bochum' },
          { id: 'demo-herne', anzeigename: 'Herne' },
          { id: 'demo-essen', anzeigename: 'Essen' },
        ],
      },
      {
        id: 'demo-firma-rhein',
        anzeigename: 'Rhein',
        filialen: [{ id: 'demo-koeln', anzeigename: 'Köln' }],
      },
    ],
  },
  {
    id: 'demo-unternehmer-nord',
    anzeigename: 'Nord',
    firmen: [
      { id: 'demo-firma-hanse', anzeigename: 'Hanse', filialen: [] },
      { id: 'demo-firma-kueste', anzeigename: 'Küste', filialen: [] },
    ],
  },
];

function firma(id: string): string {
  return JSON.stringify([
    ['demo-firma-hanse', 'demo-firma-kueste'].includes(id)
      ? 'demo-unternehmer-nord'
      : 'demo-unternehmer-west',
    id,
  ]);
}

describe('DatenzugriffSelector', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [DatenzugriffSelector, NoopAnimationsModule] });
  });
  function setup(unternehmerMehrfach = false, firmenMehrfach = true, filialenMehrfach = true) {
    const fixture = TestBed.createComponent(DatenzugriffSelector);
    fixture.componentRef.setInput('unternehmer', DATENZUGRIFF_MOCK);
    fixture.componentRef.setInput('unternehmerMehrfach', unternehmerMehrfach);
    fixture.componentRef.setInput('firmenMehrfach', firmenMehrfach);
    fixture.componentRef.setInput('filialenMehrfach', filialenMehrfach);
    fixture.detectChanges();
    return fixture;
  }

  it('should default to single selection for entrepreneur, company and branch', () => {
    const fixture = TestBed.createComponent(DatenzugriffSelector);
    fixture.componentRef.setInput('unternehmer', DATENZUGRIFF_MOCK);
    fixture.detectChanges();
    const selects = fixture.debugElement
      .queryAll(By.directive(MatSelect))
      .map((el) => el.componentInstance as MatSelect);
    expect(selects.map((select) => select.multiple)).toEqual([false, false, false]);
    const component = fixture.componentInstance;
    component.selectUnternehmer('demo-unternehmer-west');
    component.selectFirma(firma('demo-firma-ruhr'), true);
    component.selectFiliale(firma('demo-firma-ruhr'), 'demo-bochum', true);
    component.selectFiliale(firma('demo-firma-ruhr'), 'demo-herne', true);
    expect(component.filialen()).toEqual({ [firma('demo-firma-ruhr')]: ['demo-herne'] });
    component.selectFirma(firma('demo-firma-rhein'), true);
    expect(component.firmaIds()).toEqual([firma('demo-firma-rhein')]);
    expect(component.filialAnzahl()).toBe(0);
  });

  it('should hide the branch selection when it is not required', () => {
    const fixture = TestBed.createComponent(DatenzugriffSelector);
    fixture.componentRef.setInput('unternehmer', DATENZUGRIFF_MOCK);
    fixture.componentRef.setInput('filialenSichtbar', false);
    fixture.detectChanges();

    expect(fixture.debugElement.queryAll(By.directive(MatSelect))).toHaveLength(2);
    expect(fixture.nativeElement.textContent).not.toContain('Filialen');
  });

  it('should select multiple companies and grouped branches through the selects', async () => {
    const fixture = setup();
    const selects = fixture.debugElement
      .queryAll(By.directive(MatSelect))
      .map((el) => el.componentInstance as MatSelect);
    const [unternehmer, firmen, filialen] = selects;
    const overlay = TestBed.inject(OverlayContainer).getContainerElement();
    async function render() {
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();
    }
    async function choose(select: MatSelect, label: string) {
      select.open();
      await render();
      const option = Array.from(overlay.querySelectorAll<HTMLElement>('mat-option')).find(
        (el) => el.textContent?.trim() === label,
      );
      expect(option).toBeDefined();
      option!.click();
      await render();
    }
    expect(unternehmer.multiple).toBe(false);
    expect(firmen.multiple).toBe(true);
    expect(filialen.multiple).toBe(true);
    expect(firmen.disabled).toBe(true);
    expect(filialen.disabled).toBe(true);
    await choose(unternehmer, 'West');
    await choose(firmen, 'Ruhr');
    expect(fixture.nativeElement.querySelectorAll('mat-select')[1].textContent).toContain('Ruhr');
    await choose(firmen, 'Rhein');
    firmen.close();
    await render();
    expect(fixture.nativeElement.querySelectorAll('mat-select')[1].textContent).toContain(
      '2 Firmen ausgewählt',
    );
    filialen.open();
    await render();
    expect(
      Array.from(overlay.querySelectorAll('.mat-mdc-optgroup-label')).map((el) =>
        el.textContent?.trim(),
      ),
    ).toEqual(['Ruhr', 'Rhein']);
    await choose(filialen, 'Bochum');
    await choose(filialen, 'Köln');
    filialen.close();
    await render();
    expect(fixture.componentInstance.filialAnzahl()).toBe(2);
    expect(fixture.nativeElement.querySelectorAll('mat-select')[2].textContent).toContain(
      '2 Filialen ausgewählt',
    );
    await choose(firmen, 'Ruhr');
    firmen.close();
    await render();
    expect(fixture.componentInstance.filialen()).toEqual({
      [firma('demo-firma-rhein')]: ['demo-koeln'],
    });
    expect(filialen.triggerValue).toBe('Köln');
    expect(fixture.nativeElement.querySelectorAll('mat-select')[1].textContent).toContain('Rhein');
    expect(fixture.nativeElement.querySelectorAll('mat-select')[2].textContent).toContain('Köln');
    expect(fixture.nativeElement.querySelectorAll('mat-select-trigger')).toHaveLength(0);
    await choose(unternehmer, 'Nord');
    expect(firmen.value).toEqual([]);
    expect(filialen.disabled).toBe(true);
    expect(fixture.componentInstance.filialAnzahl()).toBe(0);
  });

  it.each([
    [false, false, false],
    [false, false, true],
    [false, true, false],
    [false, true, true],
    [true, false, false],
    [true, false, true],
    [true, true, false],
    [true, true, true],
  ])(
    'should group by parent mode: entrepreneurs %s, companies %s, branches %s',
    async (unternehmerMehrfach, firmenMehrfach, filialenMehrfach) => {
      const fixture = setup(unternehmerMehrfach, firmenMehrfach, filialenMehrfach);
      const component = fixture.componentInstance;
      component.selectUnternehmer('demo-unternehmer-west');
      fixture.detectChanges();
      const selects = fixture.debugElement
        .queryAll(By.directive(MatSelect))
        .map((el) => el.componentInstance as MatSelect);
      expect(selects[1].multiple).toBe(firmenMehrfach);
      expect(selects[2].multiple).toBe(filialenMehrfach);
      const overlay = TestBed.inject(OverlayContainer).getContainerElement();
      async function choose(select: MatSelect, label: string) {
        select.open();
        fixture.detectChanges();
        await fixture.whenStable();
        expect(overlay.querySelectorAll('mat-optgroup').length > 0).toBe(
          select === selects[1]
            ? unternehmerMehrfach && component.ausgewaehlteUnternehmer().length > 1
            : firmenMehrfach && component.ausgewaehlteFirmen().length > 1,
        );
        const option = Array.from(overlay.querySelectorAll<HTMLElement>('mat-option')).find(
          (el) => el.textContent?.trim() === label,
        );
        expect(option).toBeDefined();
        option!.click();
        fixture.detectChanges();
        await fixture.whenStable();
        fixture.detectChanges();
      }
      await choose(selects[1], 'Ruhr');
      selects[1].close();
      fixture.detectChanges();
      await fixture.whenStable();
      await choose(selects[2], 'Bochum');
      await choose(selects[2], 'Herne');
      expect(component.filialAnzahl()).toBe(filialenMehrfach ? 2 : 1);
      expect(component.filialen()[firma('demo-firma-ruhr')]).toContain('demo-herne');
      selects[2].close();
      fixture.detectChanges();
      await fixture.whenStable();
      await choose(selects[1], 'Rhein');
      expect(component.firmaIds()).toHaveLength(firmenMehrfach ? 2 : 1);
      if (!firmenMehrfach) expect(component.filialAnzahl()).toBe(0);
    },
  );

  it('should allow only one branch across multiple companies in single mode', () => {
    const fixture = setup(false, true, false);
    const component = fixture.componentInstance;
    component.selectUnternehmer('demo-unternehmer-west');
    component.selectFirmen([firma('demo-firma-ruhr'), firma('demo-firma-rhein')]);
    component.selectFiliale(firma('demo-firma-ruhr'), 'demo-bochum', true);
    component.selectFiliale(firma('demo-firma-rhein'), 'demo-koeln', true);
    expect(component.filialen()).toEqual({ [firma('demo-firma-rhein')]: ['demo-koeln'] });
  });

  it('should group companies by entrepreneur and preserve remaining selections when one is removed', async () => {
    const fixture = setup(true);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    const selects = fixture.debugElement
      .queryAll(By.directive(MatSelect))
      .map((el) => el.componentInstance as MatSelect);
    const overlay = TestBed.inject(OverlayContainer).getContainerElement();
    async function render() {
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();
    }
    async function choose(select: MatSelect, label: string) {
      select.open();
      await render();
      const option = Array.from(overlay.querySelectorAll<HTMLElement>('mat-option')).find(
        (el) => el.textContent?.trim() === label,
      );
      expect(option).toBeDefined();
      option!.click();
      await render();
    }
    expect(selects[0].multiple).toBe(true);
    await choose(selects[0], 'West');
    await choose(selects[0], 'Nord');
    selects[0].close();
    await render();
    expect(fixture.nativeElement.querySelector('mat-select').textContent).toContain(
      '2 Unternehmer ausgewählt',
    );
    selects[1].open();
    await render();
    expect(
      Array.from(overlay.querySelectorAll('.mat-mdc-optgroup-label')).map((el) =>
        el.textContent?.trim(),
      ),
    ).toEqual(['West', 'Nord']);
    await choose(selects[1], 'Ruhr');
    await choose(selects[1], 'Hanse');
    selects[1].close();
    await render();
    selects[2].open();
    await render();
    expect(
      Array.from(overlay.querySelectorAll('.mat-mdc-optgroup-label')).map((el) =>
        el.textContent?.trim(),
      ),
    ).toEqual(['West / Ruhr', 'Nord / Hanse']);
    await choose(selects[2], 'Bochum');
    selects[2].close();
    await render();
    await choose(selects[0], 'Nord');
    selects[0].close();
    await render();
    expect(component.firmaIds()).toEqual([firma('demo-firma-ruhr')]);
    expect(component.filialen()).toEqual({ [firma('demo-firma-ruhr')]: ['demo-bochum'] });
    await choose(selects[0], 'West');
    selects[0].close();
    await render();
    expect(component.firmaIds()).toEqual([]);
    expect(component.filialAnzahl()).toBe(0);
    expect(selects[1].disabled).toBe(true);
    expect(selects[2].disabled).toBe(true);
  });

  it('should distinguish identical company and branch IDs under different entrepreneurs', () => {
    const fixture = setup(true);
    fixture.componentRef.setInput(
      'unternehmer',
      ['a', 'b'].map((id) => ({
        id,
        anzeigename: id,
        firmen: [
          {
            id: 'same',
            anzeigename: 'Firma',
            filialen: [{ id: 'same', anzeigename: 'Filiale' }],
          },
        ],
      })),
    );
    fixture.detectChanges();
    const component = fixture.componentInstance;
    component.selectUnternehmer(['a', 'b']);
    const a = component.getFirmaSchluessel('a', 'same');
    const b = component.getFirmaSchluessel('b', 'same');
    component.selectFirmen([a, b]);
    component.selectFiliale(a, 'same', true);
    component.selectFiliale(b, 'same', true);
    expect(component.filialAnzahl()).toBe(2);
    component.selectUnternehmer(['b']);
    expect(component.firmaIds()).toEqual([b]);
    expect(component.filialen()).toEqual({ [b]: ['same'] });
  });

  it('should support multiple entrepreneurs with single company and branch selection', () => {
    const fixture = TestBed.createComponent(DatenzugriffSelector);
    fixture.componentRef.setInput('unternehmer', DATENZUGRIFF_MOCK);
    fixture.componentRef.setInput('unternehmerMehrfach', true);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    component.selectUnternehmer(['demo-unternehmer-west', 'demo-unternehmer-nord']);
    component.selectFirmen([firma('demo-firma-ruhr'), firma('demo-firma-hanse')]);
    expect(component.firmaIds()).toEqual([firma('demo-firma-ruhr')]);
    component.selectFiliale(firma('demo-firma-ruhr'), 'demo-bochum', true);
    fixture.detectChanges();
    component.selectUnternehmer(['demo-unternehmer-west']);
    fixture.detectChanges();
    expect(component.unternehmerIds()).toEqual(['demo-unternehmer-west']);
    expect(component.filialAnzahl()).toBe(1);
    expect(
      fixture.debugElement
        .queryAll(By.directive(MatSelect))
        .map((el) => (el.componentInstance as MatSelect).multiple),
    ).toEqual([true, false, false]);
  });

  it.each([false, true])(
    'should show groups only for multiple selected parents, target multi %s',
    async (mehrfach) => {
      const fixture = setup(true, true, mehrfach);
      const component = fixture.componentInstance;
      const overlay = TestBed.inject(OverlayContainer).getContainerElement();
      async function expectGroups(index: number, count: number) {
        fixture.detectChanges();
        const select = fixture.debugElement.queryAll(By.directive(MatSelect))[index]
          .componentInstance as MatSelect;
        select.open();
        fixture.detectChanges();
        await fixture.whenStable();
        expect(overlay.querySelectorAll('mat-optgroup')).toHaveLength(count);
        select.close();
        fixture.detectChanges();
        await fixture.whenStable();
      }
      component.selectUnternehmer(['demo-unternehmer-west']);
      await expectGroups(1, 0);
      component.selectUnternehmer(['demo-unternehmer-west', 'demo-unternehmer-nord']);
      await expectGroups(1, 2);
      component.selectUnternehmer(['demo-unternehmer-west']);
      await expectGroups(1, 0);
      component.selectFirmen([firma('demo-firma-ruhr')]);
      await expectGroups(2, 0);
      component.selectFirmen([firma('demo-firma-ruhr'), firma('demo-firma-rhein')]);
      await expectGroups(2, 2);
      component.selectFirmen([firma('demo-firma-ruhr')]);
      await expectGroups(2, 0);
    },
  );

  it('should reset dependent selections when changing entrepreneur', () => {
    const component = setup().componentInstance;
    component.selectUnternehmer('demo-unternehmer-west');
    component.selectFirma(firma('demo-firma-ruhr'), true);
    component.selectFiliale(firma('demo-firma-ruhr'), 'demo-bochum', true);
    component.selectUnternehmer('demo-unternehmer-nord');
    expect(component.firmaIds()).toEqual([]);
    expect(component.filialAnzahl()).toBe(0);
    expect(component.firmen().map((firma) => firma.id)).toEqual([
      firma('demo-firma-hanse'),
      firma('demo-firma-kueste'),
    ]);
  });

  it('should remove only the branches of a deselected company', () => {
    const component = setup().componentInstance;
    component.selectUnternehmer('demo-unternehmer-west');
    component.selectFirma(firma('demo-firma-ruhr'), true);
    component.selectFirma(firma('demo-firma-rhein'), true);
    component.selectFiliale(firma('demo-firma-ruhr'), 'demo-bochum', true);
    component.selectFiliale(firma('demo-firma-rhein'), 'demo-koeln', true);
    component.selectFirma(firma('demo-firma-ruhr'), false);
    expect(component.filialen()).toEqual({ [firma('demo-firma-rhein')]: ['demo-koeln'] });
    component.selectFirma(firma('demo-firma-ruhr'), true);
    expect(component.filialen()[firma('demo-firma-ruhr')]).toBeUndefined();
  });

  it('should reject branches outside selected companies and avoid duplicates', () => {
    const component = setup().componentInstance;
    component.selectUnternehmer('demo-unternehmer-west');
    component.selectFirma(firma('demo-firma-hanse'), true);
    component.selectFiliale(firma('demo-firma-ruhr'), 'demo-bochum', true);
    expect(component.firmaIds()).toEqual([]);
    expect(component.filialAnzahl()).toBe(0);
    component.selectFirma(firma('demo-firma-ruhr'), true);
    component.selectFirma(firma('demo-firma-ruhr'), true);
    component.selectFiliale(firma('demo-firma-ruhr'), 'demo-koeln', true);
    component.selectFiliale(firma('demo-firma-ruhr'), 'demo-bochum', true);
    component.selectFiliale(firma('demo-firma-ruhr'), 'demo-bochum', true);
    expect(component.firmaIds()).toHaveLength(1);
    expect(component.filialAnzahl()).toBe(1);
    component.selectFiliale(firma('demo-firma-ruhr'), 'demo-bochum', false);
    expect(component.filialAnzahl()).toBe(0);
  });

  it('should display empty data without enabling the selects', async () => {
    const fixture = setup();
    fixture.componentRef.setInput('unternehmer', []);
    fixture.detectChanges();
    const selects = fixture.debugElement
      .queryAll(By.directive(MatSelect))
      .map((el) => el.componentInstance as MatSelect);
    expect(selects.map((select) => select.disabled)).toEqual([true, true, true]);
  });
});
