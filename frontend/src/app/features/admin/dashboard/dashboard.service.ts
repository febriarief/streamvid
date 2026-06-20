import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../environments/environment';

export type VideoStatus = 'DRAFT' | 'PUBLISHED' | 'UNLISTED' | 'ARCHIVED';

export interface Stats {
  totalVideos: number;
  publishedVideos: number;
  draftVideos: number;
  totalViews: number;
  totalUsers: number;
}

export interface Video {
  id: string;
  title: string;
  slug: string;
  thumbnailUrl?: string | null;
  status: VideoStatus;
  viewCount: number;
  createdAt: string;
}

interface RecentVideosResponse {
  videos: Video[];
}

type ApiEnvelope<T> = T | { data: T; statusCode?: number };

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  getStats(): Observable<Stats> {
    return this.http
      .get<ApiEnvelope<Stats>>(`${this.apiUrl}/admin/stats`)
      .pipe(map((response) => this.unwrap(response)));
  }

  getRecentVideos(limit: number): Observable<Video[]> {
    const params = new HttpParams().set('limit', limit);

    return this.http
      .get<ApiEnvelope<RecentVideosResponse>>(`${this.apiUrl}/admin/videos`, { params })
      .pipe(map((response) => this.unwrap(response).videos));
  }

  private unwrap<T>(response: ApiEnvelope<T>): T {
    if (response && typeof response === 'object' && 'data' in response) {
      return response.data;
    }

    return response;
  }
}
