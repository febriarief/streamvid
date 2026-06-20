import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface Category {
  id: string;
  name: string;
  slug: string;
  createdAt?: string;
}

export interface Tag {
  id: string;
  name: string;
}

export interface Video {
  id: string;
  title: string;
  description?: string | null;
  slug: string;
  doodUrl: string;
  doodFileId: string;
  embedUrl: string;
  thumbnailUrl?: string | null;
  duration?: number | null;
  viewCount: number;
  createdAt: string;
  updatedAt: string;
  categoryId?: string | null;
  category?: Category | null;
  tags: Tag[];
}

export interface VideoListResponse {
  videos: Video[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export type ExploreSort = 'latest' | 'popular';

type ApiEnvelope<T> = T | { data: T; statusCode?: number };

@Injectable()
export class ExploreService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  getVideos(
    categoryId: string | null,
    search: string,
    sort: ExploreSort,
    page: number,
    limit: number
  ): Observable<VideoListResponse> {
    let params = new HttpParams()
      .set('page', page)
      .set('limit', limit)
      .set('sort', sort);

    if (categoryId) {
      params = params.set('categoryId', categoryId);
    }

    if (search) {
      params = params.set('search', search);
    }

    return this.http
      .get<ApiEnvelope<VideoListResponse>>(`${this.apiUrl}/videos`, { params })
      .pipe(map((response) => this.unwrap(response)));
  }

  getCategories(): Observable<Category[]> {
    return this.http
      .get<ApiEnvelope<Category[]>>(`${this.apiUrl}/categories`)
      .pipe(map((response) => this.unwrap(response)));
  }

  private unwrap<T>(response: ApiEnvelope<T>): T {
    if (response && typeof response === 'object' && 'data' in response) {
      return response.data;
    }

    return response;
  }
}
