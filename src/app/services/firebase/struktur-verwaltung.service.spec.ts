// pur-system/src/app/services/firebase/struktur-verwaltung.service.spec.ts

import { TestBed } from '@angular/core/testing';
import { Functions } from '@angular/fire/functions';

import { HTTPS_CALLABLE } from '../../commons/tokens/firebase.tokens';
import { LoadingService } from '../core/loading.service';
import { NetzwerkStatusService } from '../core/netzwerk-status.service';
import { StrukturVerwaltungService } from './struktur-verwaltung.service';

describe('StrukturVerwaltungService', () => {
  const callableMock = vi.fn().mockResolvedValue({ data: undefined });
  const httpsCallableMock = vi.fn().mockReturnValue(callableMock);
  const trackWriteMock = vi.fn(async <T>(aktion: () => Promise<T>): Promise<T> => {
    return aktion();
  });
  const assertOnlineMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    TestBed.configureTestingModule({
      providers: [
        StrukturVerwaltungService,
        { provide: Functions, useValue: {} },
        { provide: HTTPS_CALLABLE, useValue: httpsCallableMock },
        { provide: LoadingService, useValue: { trackWrite: trackWriteMock } },
        { provide: NetzwerkStatusService, useValue: { assertOnline: assertOnlineMock } },
      ],
    });
  });

  it('should delete a structural entry through the callable function', async () => {
    const service = TestBed.inject(StrukturVerwaltungService);
    const data = { typ: 'firma' as const, unternehmerId: 'u-1', firmaId: 'f-1' };

    await service.deleteStruktureintrag(data);

    expect(assertOnlineMock).toHaveBeenCalledOnce();
    expect(httpsCallableMock).toHaveBeenCalledWith(expect.anything(), 'deleteStruktureintrag');
    expect(callableMock).toHaveBeenCalledWith(data);
    expect(trackWriteMock).toHaveBeenCalledWith(expect.any(Function));
  });
});
