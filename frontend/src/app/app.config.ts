import { APP_INITIALIZER, ApplicationConfig, inject, LOCALE_ID } from '@angular/core';
import { registerLocaleData } from '@angular/common';
import localeId from '@angular/common/locales/id';
import { Title } from '@angular/platform-browser';
import { provideRouter, TitleStrategy } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { Store, provideStore } from '@ngrx/store';
import { provideEffects } from '@ngrx/effects';
import { provideStoreDevtools } from '@ngrx/store-devtools';
import { firstValueFrom } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { routes } from './app.routes';
import * as AuthActions from './core/auth/auth.actions';
import { authReducer } from './core/auth/auth.reducer';
import { AuthService } from './core/auth/auth.service';
import { AuthEffects } from './core/auth/auth.effects';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { errorInterceptor } from './core/interceptors/error.interceptor';
import { AppTitleStrategy } from './core/routing/app-title.strategy';

registerLocaleData(localeId);

function initializeAuth() {
  const authService = inject(AuthService);
  const store = inject(Store);

  return async () => {
    try {
      const session = await firstValueFrom(
        authService.refresh().pipe(
          catchError(() => {
            store.dispatch(AuthActions.restoreSessionFailure());
            throw new Error('Unable to restore session');
          })
        )
      );

      store.dispatch(
        AuthActions.restoreSessionSuccess({
          user: session.user,
          accessToken: session.accessToken,
        })
      );
    } catch {
      store.dispatch(AuthActions.restoreSessionFailure());
    }
  };
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor, errorInterceptor])),
    provideStore({ auth: authReducer }),
    provideEffects([AuthEffects]),
    provideStoreDevtools({ maxAge: 25 }),
    Title,
    {
      provide: TitleStrategy,
      useClass: AppTitleStrategy,
    },
    {
      provide: LOCALE_ID,
      useValue: 'id-ID',
    },
    {
      provide: APP_INITIALIZER,
      useFactory: initializeAuth,
      multi: true,
    },
  ],
};
