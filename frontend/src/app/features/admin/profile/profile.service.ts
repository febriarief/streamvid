import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { User } from '../../../core/auth/auth.models';

type ApiEnvelope<T> = T | { data: T; statusCode?: number };

@Injectable({ providedIn: 'root' })
export class ProfileService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  updateProfile(username: string): Observable<User> {
    return this.http
      .patch<ApiEnvelope<User>>(`${this.apiUrl}/users/me`, { username })
      .pipe(map((response) => this.unwrap(response)));
  }

  updatePassword(newPassword: string): Observable<{ message: string }> {
    return this.http
      .patch<ApiEnvelope<{ message: string }>>(`${this.apiUrl}/users/me/password`, {
        newPassword,
      })
      .pipe(map((response) => this.unwrap(response)));
  }

  private unwrap<T>(response: ApiEnvelope<T>): T {
    if (response && typeof response === 'object' && 'data' in response) {
      return response.data;
    }

    return response;
  }
}
