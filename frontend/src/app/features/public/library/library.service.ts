import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface LibraryCategory {
  id: string;
  name: string;
  slug: string;
}

export interface LibraryTag {
  id: string;
  name: string;
}

export interface LibraryVideo {
  id: string;
  title: string;
  slug: string;
  thumbnailUrl?: string | null;
  duration?: number | null;
  viewCount: number;
  categoryId?: string | null;
  category?: LibraryCategory | null;
  tags: LibraryTag[];
}

export interface ViewHistory {
  id: string;
  videoId: string;
  createdAt: string;
  video: LibraryVideo;
}

export interface MostWatched {
  videoId: string;
  watchCount: number;
  video: LibraryVideo;
}

type ApiEnvelope<T> = T | { data: T; statusCode?: number };

@Injectable({ providedIn: 'root' })
export class LibraryService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  getWatchHistory(): Observable<ViewHistory[]> {
    return this.http
      .get<ApiEnvelope<ViewHistory[]>>(`${this.apiUrl}/users/me/history`)
      .pipe(map((response) => this.unwrap(response)));
  }

  deleteWatchHistoryItem(videoId: string): Observable<{ message: string }> {
    return this.http
      .delete<ApiEnvelope<{ message: string }>>(`${this.apiUrl}/users/me/history/${videoId}`)
      .pipe(map((response) => this.unwrap(response)));
  }

  clearWatchHistory(): Observable<{ message: string }> {
    return this.http
      .delete<ApiEnvelope<{ message: string }>>(`${this.apiUrl}/users/me/history`)
      .pipe(map((response) => this.unwrap(response)));
  }

  getMostWatched(): Observable<MostWatched[]> {
    return this.http
      .get<ApiEnvelope<MostWatched[]>>(`${this.apiUrl}/users/me/most-watched`)
      .pipe(map((response) => this.unwrap(response)));
  }

  private unwrap<T>(response: ApiEnvelope<T>): T {
    if (response && typeof response === 'object' && 'data' in response) {
      return response.data;
    }

    return response;
  }
}
