// pur-system/src/app/commons/models/app/app-kontext-selector.types.ts

export type TAppKontextSelector = 'unternehmer' | 'firma' | 'filiale';

export type TSelectorModus = 'hidden' | 'readonly' | 'editable';

export type TAppKontextSelectorKonfiguration = Readonly<
  Record<TAppKontextSelector, TSelectorModus>
>;
