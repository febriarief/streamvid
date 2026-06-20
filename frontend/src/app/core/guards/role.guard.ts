import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { map } from 'rxjs/operators';
import { selectUser } from '../auth/auth.selectors';

export const roleGuard = (role: string): CanActivateFn => () => {
  const store = inject(Store);
  const router = inject(Router);

  return store.select(selectUser).pipe(
    map((user) => user?.role === role ? true : router.createUrlTree(['/']))
  );
};