import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map, Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface Category {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
}

export interface CategoryListResponse {
  categories: Category[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

type ApiEnvelope<T> = T | { data: T; statusCode?: number };

@Injectable({ providedIn: 'root' })
export class CategoryService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  getCategories(page: number, limit: number, search?: string): Observable<CategoryListResponse> {
    const params = new HttpParams()
      .set('page', page)
      .set('limit', limit)
      .set('search', search?.trim() ?? '');

    return this.http
      .get<ApiEnvelope<CategoryListResponse>>(`${this.apiUrl}/admin/categories`, { params })
      .pipe(map((response) => this.unwrap(response)));
  }

  createCategory(name: string): Observable<Category> {
    return this.http
      .post<ApiEnvelope<Category>>(`${this.apiUrl}/admin/categories`, { name })
      .pipe(map((response) => this.unwrap(response)));
  }

  deleteCategory(id: string): Observable<unknown> {
    return this.http
      .delete<ApiEnvelope<unknown>>(`${this.apiUrl}/admin/categories/${id}`)
      .pipe(map((response) => this.unwrap(response)));
  }

  private unwrap<T>(response: ApiEnvelope<T>): T {
    if (response && typeof response === 'object' && 'data' in response) {
      return response.data;
    }

    return response;
  }
}
