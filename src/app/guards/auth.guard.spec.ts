// pur-system/src/app/guards/auth.guard.spec.ts

import { User } from '@angular/fire/auth';
import { TestBed } from '@angular/core/testing';
import { Router, UrlTree } from '@angular/router';
import { firstValueFrom, of } from 'rxjs';

import { AuthService } from '../services/firebase/auth.service';
import { authGuard } from './auth.guard';

describe('authGuard', () => {
  let authServiceMock: {
    getAuthState: ReturnType<typeof vi.fn>;
  };
  let routerMock: {
    createUrlTree: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    authServiceMock = {
      getAuthState: vi.fn(),
    };
    routerMock = {
      createUrlTree: vi.fn().mockReturnValue({} as UrlTree),
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: authServiceMock },
        { provide: Router, useValue: routerMock },
      ],
    });
  });

  it('should allow access when a user is signed in', async () => {
    authServiceMock.getAuthState.mockReturnValue(of({ uid: 'benutzer-123' } as User));

    const result = await TestBed.runInInjectionContext(() =>
      firstValueFrom(authGuard({} as never, {} as never) as never),
    );

    expect(result).toBe(true);
    expect(routerMock.createUrlTree).not.toHaveBeenCalled();
  });

  it('should redirect to login when no user is signed in', async () => {
    const loginUrlTree = {} as UrlTree;
    authServiceMock.getAuthState.mockReturnValue(of(null));
    routerMock.createUrlTree.mockReturnValue(loginUrlTree);

    const result = await TestBed.runInInjectionContext(() =>
      firstValueFrom(authGuard({} as never, {} as never) as never),
    );

    expect(result).toBe(loginUrlTree);
    expect(routerMock.createUrlTree).toHaveBeenCalledWith(['/login']);
  });
});
