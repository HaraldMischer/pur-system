// pur-system/src/app/commons/models/app/firestore-lesestrategie.types.ts

export type TFirestoreCacheArt = 'memory' | 'persistent';
export type TFirestoreLesestrategie = 'cacheFirst' | 'networkOnly' | 'networkFirst' | 'cacheOnly';

export type TFirestoreLesestrategien = {
  readonly benutzerprofil: TFirestoreLesestrategie;
  readonly stammdaten: TFirestoreLesestrategie;
};
