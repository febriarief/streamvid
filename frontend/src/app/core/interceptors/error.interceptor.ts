import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap } from 'rxjs/operators';
import { Store } from '@ngrx/store';
import { throwError } from 'rxjs';
import * as AuthActions from '../auth/auth.actions';
import { AuthService } from '../auth/auth.service';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const store = inject(Store);
  const authService = inject(AuthService);

  return next(req).pipe(
    catchError((err) => {
      const isRefreshRequest = req.url.endsWith('/auth/refresh');
      const shouldTryRefresh = err.status === 401 && !isRefreshRequest;

      if (shouldTryRefresh) {
        return authService.refresh().pipe(
          switchMap(({ user, accessToken }) => {
            store.dispatch(AuthActions.restoreSessionSuccess({ user, accessToken }));

            return next(
              req.clone({
                setHeaders: { Authorization: `Bearer ${accessToken}` },
              })
            );
          }),
          catchError((refreshErr) => {
            store.dispatch(AuthActions.restoreSessionFailure());
            void router.navigate(['/login']);
            return throwError(() => refreshErr);
          })
        );
      }

      if (err.status === 401) {
        store.dispatch(AuthActions.restoreSessionFailure());
        void router.navigate(['/login']);
      }
      if (err.status === 403) router.navigate(['/']);
      return throwError(() => err);
    })
  );
};
