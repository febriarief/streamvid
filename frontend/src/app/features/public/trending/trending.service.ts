import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../environments/environment';

export type TrendingPeriod = 'today' | 'week' | 'month' | 'all';

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
  trendingViews: number;
  createdAt: string;
  updatedAt: string;
  categoryId?: string | null;
  category?: Category | null;
  tags: Tag[];
}

type ApiEnvelope<T> = T | { data: T; statusCode?: number };

@Injectable()
export class TrendingService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  getTrendingVideos(period: TrendingPeriod, limit = 20): Observable<Video[]> {
    const params = new HttpParams()
      .set('period', period)
      .set('limit', limit);

    return this.http
      .get<ApiEnvelope<Video[]>>(`${this.apiUrl}/videos/trending`, { params })
      .pipe(map((response) => this.unwrap(response)));
  }

  private unwrap<T>(response: ApiEnvelope<T>): T {
    if (response && typeof response === 'object' && 'data' in response) {
      return response.data;
    }

    return response;
  }
}
