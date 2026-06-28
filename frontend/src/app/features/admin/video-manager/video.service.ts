import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../environments/environment';

export type VideoStatus = 'DRAFT' | 'PUBLISHED' | 'UNLISTED' | 'ARCHIVED';

export interface Category {
  id: string;
  name: string;
  slug: string;
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
  status: VideoStatus;
  viewCount: number;
  categoryId?: string | null;
  createdAt: string;
  updatedAt: string;
  category?: Category | null;
  tags: Tag[];
}

export interface DoodstreamMetadata {
  doodFileId: string;
  title: string;
  duration: number;
  thumbnailUrl: string;
  embedUrl: string;
  doodUrl: string;
}

export interface VideoListResponse {
  videos: Video[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface SaveVideoPayload {
  doodUrl: string;
  title: string;
  description?: string;
  thumbnailUrl?: string;
  categoryId?: string;
  tags?: string[];
  status: Exclude<VideoStatus, 'ARCHIVED'>;
}

export interface UploadedThumbnailResponse {
  fileName: string;
  url: string;
}

type ApiEnvelope<T> = T | { data: T; statusCode?: number };

@Injectable({ providedIn: 'root' })
export class VideoService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  getVideos(
    page: number,
    limit: number,
    filters?: {
      search?: string;
      categoryId?: string | null;
      status?: VideoStatus | '';
    }
  ): Observable<VideoListResponse> {
    const params = new HttpParams()
      .set('page', page)
      .set('limit', limit)
      .set('search', filters?.search?.trim() ?? '')
      .set('categoryId', filters?.categoryId ?? '')
      .set('status', filters?.status ?? '');

    return this.http
      .get<ApiEnvelope<VideoListResponse>>(`${this.apiUrl}/admin/videos`, { params })
      .pipe(map((response) => this.unwrap(response)));
  }

  createVideo(payload: SaveVideoPayload): Observable<Video> {
    return this.http
      .post<ApiEnvelope<Video>>(`${this.apiUrl}/admin/videos`, payload)
      .pipe(map((response) => this.unwrap(response)));
  }

  updateVideo(id: string, payload: Partial<SaveVideoPayload>): Observable<Video> {
    return this.http
      .put<ApiEnvelope<Video>>(`${this.apiUrl}/admin/videos/${id}`, payload)
      .pipe(map((response) => this.unwrap(response)));
  }

  deleteVideo(id: string): Observable<unknown> {
    return this.http.delete<ApiEnvelope<unknown>>(`${this.apiUrl}/admin/videos/${id}`).pipe(
      map((response) => this.unwrap(response))
    );
  }

  updateVideoStatus(id: string, status: VideoStatus): Observable<Video> {
    return this.http
      .patch<ApiEnvelope<Video>>(`${this.apiUrl}/admin/videos/${id}/status`, { status })
      .pipe(map((response) => this.unwrap(response)));
  }

  fetchDoodstreamMetadata(url: string): Observable<DoodstreamMetadata> {
    const params = new HttpParams().set('url', url);

    return this.http
      .get<ApiEnvelope<DoodstreamMetadata>>(`${this.apiUrl}/doodstream/info`, { params })
      .pipe(map((response) => this.unwrap(response)));
  }

  getCategories(): Observable<Category[]> {
    return this.http
      .get<ApiEnvelope<Category[]>>(`${this.apiUrl}/categories`)
      .pipe(map((response) => this.unwrap(response)));
  }

  uploadThumbnail(file: File): Observable<UploadedThumbnailResponse> {
    const formData = new FormData();
    formData.append('file', file);

    return this.http
      .post<ApiEnvelope<UploadedThumbnailResponse>>(`${this.apiUrl}/admin/videos/thumbnail`, formData)
      .pipe(map((response) => this.unwrap(response)));
  }

  private unwrap<T>(response: ApiEnvelope<T>): T {
    if (response && typeof response === 'object' && 'data' in response) {
      return response.data;
    }

    return response;
  }
}
