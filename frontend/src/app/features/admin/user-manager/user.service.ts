import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map, Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export type UserRole = 'USER' | 'ADMIN';

export interface ManagedUser {
  id: string;
  email: string;
  username: string;
  role: UserRole;
  avatar?: string;
  createdAt: string;
  updatedAt: string;
  watchHistoryCount: number;
}

export interface UserListResponse {
  users: ManagedUser[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface SaveUserPayload {
  email: string;
  username: string;
  role: UserRole;
  password?: string;
}

type ApiEnvelope<T> = T | { data: T; statusCode?: number };

@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  getUsers(
    page: number,
    limit: number,
    filters?: { search?: string; role?: UserRole | '' }
  ): Observable<UserListResponse> {
    let params = new HttpParams()
      .set('page', page)
      .set('limit', limit)
      .set('search', filters?.search?.trim() ?? '');

    if (filters?.role) {
      params = params.set('role', filters.role);
    }

    return this.http
      .get<ApiEnvelope<UserListResponse>>(`${this.apiUrl}/admin/users`, { params })
      .pipe(map((response) => this.unwrap(response)));
  }

  createUser(payload: SaveUserPayload): Observable<ManagedUser> {
    return this.http
      .post<ApiEnvelope<ManagedUser>>(`${this.apiUrl}/admin/users`, payload)
      .pipe(map((response) => this.unwrap(response)));
  }

  updateUser(id: string, payload: SaveUserPayload): Observable<ManagedUser> {
    return this.http
      .patch<ApiEnvelope<ManagedUser>>(`${this.apiUrl}/admin/users/${id}`, payload)
      .pipe(map((response) => this.unwrap(response)));
  }

  deleteUser(id: string): Observable<unknown> {
    return this.http
      .delete<ApiEnvelope<unknown>>(`${this.apiUrl}/admin/users/${id}`)
      .pipe(map((response) => this.unwrap(response)));
  }

  private unwrap<T>(response: ApiEnvelope<T>): T {
    if (response && typeof response === 'object' && 'data' in response) {
      return response.data;
    }

    return response;
  }
}
