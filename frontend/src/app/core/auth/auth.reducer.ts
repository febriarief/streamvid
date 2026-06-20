import { createReducer, on } from '@ngrx/store';
import { AuthState } from './auth.models';
import * as AuthActions from './auth.actions';

const initialState: AuthState = {
  user: null,
  accessToken: null,
  isLoading: false,
  error: null,
};

export const authReducer = createReducer(
  initialState,
  on(AuthActions.login, (state) => ({ ...state, isLoading: true, error: null })),
  on(AuthActions.loginSuccess, (state, { user, accessToken }) => ({
    ...state, user, accessToken, isLoading: false, error: null,
  })),
  on(AuthActions.loginFailure, (state, { error }) => ({
    ...state, isLoading: false, error,
  })),
  on(AuthActions.restoreSessionSuccess, (state, { user, accessToken }) => ({
    ...state, user, accessToken, isLoading: false, error: null,
  })),
  on(AuthActions.restoreSessionFailure, (state) => ({
    ...state, user: null, accessToken: null, isLoading: false,
  })),
  on(AuthActions.updateAuthUser, (state, { user }) => ({
    ...state,
    user,
  })),
  on(AuthActions.logoutSuccess, () => initialState),
);
