import { createAction, props } from '@ngrx/store';
import { User } from './auth.models';

export const login = createAction(
  '[Auth] Login',
  props<{ email: string; password: string }>()
);

export const loginSuccess = createAction(
  '[Auth] Login Success',
  props<{ user: User; accessToken: string }>()
);

export const loginFailure = createAction(
  '[Auth] Login Failure',
  props<{ error: string }>()
);

export const logout = createAction('[Auth] Logout');
export const logoutSuccess = createAction('[Auth] Logout Success');

export const restoreSession = createAction('[Auth] Restore Session');
export const restoreSessionSuccess = createAction(
  '[Auth] Restore Session Success',
  props<{ user: User; accessToken: string }>()
);
export const restoreSessionFailure = createAction('[Auth] Restore Session Failure');

export const updateAuthUser = createAction(
  '[Auth] Update Auth User',
  props<{ user: User }>()
);
