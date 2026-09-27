// pur-system/src/app/commons/models/app/global-banner.types.ts

export type TGlobalBannerKind = 'info' | 'warn' | 'error';
export type TGlobalBannerSource = string;

export interface IGlobalBannerState {
  readonly active: boolean;
  readonly kind: TGlobalBannerKind;
  readonly text: string;
  readonly source?: TGlobalBannerSource;
}

export type TGlobalBannerInput = Omit<IGlobalBannerState, 'active'>;

export const GLOBAL_BANNER_DEFAULT_STATE: IGlobalBannerState = {
  active: false,
  kind: 'info',
  text: '',
};
