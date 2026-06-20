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

type ApiEnvelope<T> = T | { data: T; statusCode?: number };

@Injectable({ providedIn: 'root' })
export class VideoDetailService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  getVideoBySlug(slug: string): Observable<Video> {
    return this.http
      .get<ApiEnvelope<Video>>(`${this.apiUrl}/videos/${slug}`)
      .pipe(map((response) => this.unwrap(response)));
  }

  getRelatedVideos(categoryId: string, limit = 8): Observable<Video[]> {
    const params = new HttpParams()
      .set('categoryId', categoryId)
      .set('limit', limit);

    return this.http
      .get<ApiEnvelope<VideoListResponse>>(`${this.apiUrl}/videos`, { params })
      .pipe(map((response) => this.unwrap(response).videos));
  }

  private unwrap<T>(response: ApiEnvelope<T>): T {
    if (response && typeof response === 'object' && 'data' in response) {
      return response.data;
    }

    return response;
  }
}
