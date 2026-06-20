import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { User } from './auth.models';

export interface AuthSessionResponse {
  accessToken: string;
  user: User;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private api = environment.apiUrl;

  constructor(private http: HttpClient) {}

  login(email: string, password: string): Observable<AuthSessionResponse> {
    return this.http.post<AuthSessionResponse>(
      `${this.api}/auth/login`,
      { email, password },
      { withCredentials: true }
    );
  }

  logout() {
    return this.http.post(`${this.api}/auth/logout`, {}, { withCredentials: true });
  }

  refresh(): Observable<AuthSessionResponse> {
    return this.http.post<AuthSessionResponse>(
      `${this.api}/auth/refresh`,
      {},
      { withCredentials: true }
    );
  }
}
