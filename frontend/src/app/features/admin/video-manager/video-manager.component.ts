import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  LucideCheck,
  LucideEdit,
  LucideLoaderCircle,
  LucideTrash,
  LucideUpload,
  LucideX,
} from '@lucide/angular';
import { finalize, take } from 'rxjs/operators';
import { AdminPaginationComponent } from '../../../shared/components/admin-pagination/admin-pagination.component';
import {
  Category,
  SaveVideoPayload,
  Video,
  VideoService,
  VideoStatus,
} from './video.service';

type VideoForm = FormGroup<{
  doodUrl: FormControl<string>;
  title: FormControl<string>;
  description: FormControl<string>;
  categoryId: FormControl<string>;
  status: FormControl<Exclude<VideoStatus, 'ARCHIVED'>>;
  duration: FormControl<string>;
  tagsInput: FormControl<string>;
}>;

type PaginationState = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

@Component({
  selector: 'app-video-manager',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    DatePipe,
    DecimalPipe,
    LucideCheck,
    LucideEdit,
    LucideLoaderCircle,
    LucideTrash,
    LucideUpload,
    LucideX,
    AdminPaginationComponent,
  ],
  templateUrl: './video-manager.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VideoManagerComponent {
  private readonly videoService = inject(VideoService);

  protected readonly videos = signal<Video[]>([]);
  protected readonly isLoading = signal(false);
  protected readonly showUploadModal = signal(false);
  protected readonly showEditModal = signal(false);
  protected readonly selectedVideo = signal<Video | null>(null);
  protected readonly isFetchingMetadata = signal(false);
  protected readonly categories = signal<Category[]>([]);
  protected readonly tags = signal<string[]>([]);
  protected readonly isSaving = signal(false);
  protected readonly showDeleteModal = signal(false);
  protected readonly metadataError = signal('');
  protected readonly submitError = signal('');
  protected readonly listError = signal('');
  protected readonly pagination = signal<PaginationState>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });

  protected readonly form: VideoForm = new FormGroup({
    doodUrl: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    title: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    description: new FormControl('', { nonNullable: true }),
    categoryId: new FormControl('', { nonNullable: true }),
    status: new FormControl<Exclude<VideoStatus, 'ARCHIVED'>>('DRAFT', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    duration: new FormControl('', { nonNullable: true }),
    tagsInput: new FormControl('', { nonNullable: true }),
  });

  protected readonly hasVideos = computed(() => this.videos().length > 0);
  protected readonly activeModalTitle = computed(() =>
    this.showEditModal() ? 'Edit Video' : 'Upload Video'
  );
  protected readonly activeSubmitLabel = computed(() =>
    this.showEditModal() ? 'Simpan Perubahan' : 'Simpan Video'
  );
  protected readonly selectedThumbnailUrl = computed(
    () => this.selectedVideo()?.thumbnailUrl || null
  );

  constructor() {
    this.loadCategories();
    this.loadVideos();
  }

  protected loadVideos(page = this.pagination().page): void {
    this.isLoading.set(true);
    this.listError.set('');

    this.videoService
      .getVideos(page, this.pagination().limit)
      .pipe(
        take(1),
        finalize(() => this.isLoading.set(false))
      )
      .subscribe({
        next: (response) => {
          this.videos.set(response.videos);
          this.pagination.set({
            page: response.page,
            limit: response.limit,
            total: response.total,
            totalPages: Math.max(response.totalPages, 1),
          });
        },
        error: () => {
          this.videos.set([]);
          this.listError.set('Gagal memuat daftar video. Silakan coba lagi.');
        },
      });
  }

  protected openUploadModal(): void {
    this.resetModalState();
    this.form.reset({
      doodUrl: '',
      title: '',
      description: '',
      categoryId: '',
      status: 'DRAFT',
      duration: '',
      tagsInput: '',
    });
    this.showUploadModal.set(true);
  }

  protected openEditModal(video: Video): void {
    this.resetModalState();
    this.selectedVideo.set(video);
    this.tags.set(video.tags.map((tag) => tag.name));
    this.form.reset({
      doodUrl: video.doodUrl,
      title: video.title,
      description: video.description ?? '',
      categoryId: video.categoryId ?? '',
      status: this.getEditableStatus(video.status),
      duration: this.formatDuration(video.duration),
      tagsInput: '',
    });
    this.showEditModal.set(true);
  }

  protected closeVideoModal(): void {
    this.showUploadModal.set(false);
    this.showEditModal.set(false);
    this.resetModalState();
  }

  protected openDeleteModal(video: Video): void {
    this.selectedVideo.set(video);
    this.showDeleteModal.set(true);
  }

  protected closeDeleteModal(): void {
    this.showDeleteModal.set(false);
    this.selectedVideo.set(null);
  }

  protected fetchMetadataIfNeeded(): void {
    if (this.showEditModal()) {
      return;
    }

    const doodUrl = this.form.controls.doodUrl.value.trim();
    if (!doodUrl || this.isFetchingMetadata()) {
      return;
    }

    this.metadataError.set('');
    this.isFetchingMetadata.set(true);

    this.videoService
      .fetchDoodstreamMetadata(doodUrl)
      .pipe(
        take(1),
        finalize(() => this.isFetchingMetadata.set(false))
      )
      .subscribe({
        next: (metadata) => {
          this.selectedVideo.set({
            ...(this.selectedVideo() ?? this.createMetadataPreview()),
            id: this.selectedVideo()?.id ?? 'preview',
            title: metadata.title,
            description: this.form.controls.description.value,
            slug: this.selectedVideo()?.slug ?? 'preview',
            doodUrl: metadata.doodUrl,
            doodFileId: metadata.doodFileId,
            embedUrl: metadata.embedUrl,
            thumbnailUrl: metadata.thumbnailUrl,
            duration: metadata.duration,
            status: this.form.controls.status.value,
            viewCount: this.selectedVideo()?.viewCount ?? 0,
            categoryId: this.form.controls.categoryId.value || null,
            createdAt: this.selectedVideo()?.createdAt ?? new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            category: this.selectedVideo()?.category ?? null,
            tags: this.selectedVideo()?.tags ?? [],
          });

          this.form.patchValue({
            doodUrl: metadata.doodUrl,
            title: metadata.title,
            duration: this.formatDuration(metadata.duration),
          });
        },
        error: () => {
          this.metadataError.set('URL source video tidak valid atau metadata gagal diambil.');
        },
      });
  }

  protected addTagFromInput(): void {
    const rawValue = this.form.controls.tagsInput.value.trim();
    if (!rawValue) {
      return;
    }

    const nextTag = rawValue.toLowerCase();
    if (!this.tags().includes(nextTag)) {
      this.tags.update((tags) => [...tags, nextTag]);
    }

    this.form.controls.tagsInput.setValue('');
  }

  protected removeTag(tag: string): void {
    this.tags.update((tags) => tags.filter((item) => item !== tag));
  }

  protected saveVideo(): void {
    this.submitError.set('');

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    if (this.showUploadModal() && !this.selectedThumbnailUrl()) {
      this.metadataError.set('Ambil metadata video terlebih dahulu sebelum menyimpan.');
      return;
    }

    this.addTagFromInput();
    this.isSaving.set(true);

    const payload = this.buildPayload();
    const selectedVideo = this.selectedVideo();
    const request$ =
      this.showEditModal() && selectedVideo
        ? this.videoService.updateVideo(selectedVideo.id, {
            title: payload.title,
            description: payload.description,
            categoryId: payload.categoryId,
            tags: payload.tags,
            status: payload.status,
          })
        : this.videoService.createVideo(payload);

    request$
      .pipe(
        take(1),
        finalize(() => this.isSaving.set(false))
      )
      .subscribe({
        next: () => {
          this.closeVideoModal();
          this.loadVideos(this.pagination().page);
        },
        error: () => {
          this.submitError.set('Gagal menyimpan video. Periksa data lalu coba lagi.');
        },
      });
  }

  protected confirmDelete(): void {
    const video = this.selectedVideo();
    if (!video) {
      return;
    }

    this.isSaving.set(true);

    this.videoService
      .deleteVideo(video.id)
      .pipe(
        take(1),
        finalize(() => this.isSaving.set(false))
      )
      .subscribe({
        next: () => {
          this.closeDeleteModal();
          this.loadVideos(this.pagination().page);
        },
        error: () => {
          this.submitError.set('Gagal menghapus video. Silakan coba lagi.');
          this.showDeleteModal.set(false);
        },
      });
  }

  protected toggleVideoStatus(video: Video): void {
    const nextStatus: VideoStatus = video.status === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED';

    this.videoService
      .updateVideoStatus(video.id, nextStatus)
      .pipe(take(1))
      .subscribe({
        next: (updatedVideo) => {
          this.videos.update((videos) =>
            videos.map((item) => (item.id === updatedVideo.id ? { ...item, ...updatedVideo } : item))
          );
        },
      });
  }

  protected goToPage(page: number): void {
    if (page === this.pagination().page || page < 1 || page > this.pagination().totalPages) {
      return;
    }

    this.loadVideos(page);
  }

  protected trackByVideoId(_: number, video: Video): string {
    return video.id;
  }

  protected formatDuration(duration?: number | null): string {
    if (!duration || duration < 0) {
      return '00:00';
    }

    const minutes = Math.floor(duration / 60);
    const seconds = duration % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  protected getStatusLabel(status: VideoStatus): string {
    switch (status) {
      case 'PUBLISHED':
        return 'Published';
      case 'UNLISTED':
        return 'Unlisted';
      case 'ARCHIVED':
        return 'Archived';
      default:
        return 'Draft';
    }
  }

  protected getStatusClasses(status: VideoStatus): string {
    switch (status) {
      case 'PUBLISHED':
        return 'border-emerald-400/20 bg-emerald-500/10 text-emerald-300';
      case 'UNLISTED':
        return 'border-cyan-400/20 bg-cyan-500/10 text-cyan-300';
      case 'ARCHIVED':
        return 'border-amber-400/20 bg-amber-500/10 text-amber-300';
      default:
        return 'border-violet-400/20 bg-violet-500/10 text-violet-300';
    }
  }

  protected get titleError(): string {
    const control = this.form.controls.title;
    return control.invalid && (control.touched || control.dirty) ? 'Judul video wajib diisi.' : '';
  }

  protected get doodUrlError(): string {
    const control = this.form.controls.doodUrl;
    return control.invalid && (control.touched || control.dirty) ? 'URL source video wajib diisi.' : '';
  }

  private loadCategories(): void {
    this.videoService
      .getCategories()
      .pipe(take(1))
      .subscribe({
        next: (categories) => this.categories.set(categories),
        error: () => this.categories.set([]),
      });
  }

  private buildPayload(): SaveVideoPayload {
    const formValue = this.form.getRawValue();

    return {
      doodUrl: formValue.doodUrl.trim(),
      title: formValue.title.trim(),
      description: formValue.description.trim(),
      categoryId: formValue.categoryId || undefined,
      tags: this.tags(),
      status: formValue.status,
    };
  }

  private resetModalState(): void {
    this.showDeleteModal.set(false);
    this.selectedVideo.set(null);
    this.tags.set([]);
    this.metadataError.set('');
    this.submitError.set('');
  }

  private getEditableStatus(status: VideoStatus): Exclude<VideoStatus, 'ARCHIVED'> {
    return status === 'ARCHIVED' ? 'DRAFT' : status;
  }

  private createMetadataPreview(): Video {
    return {
      id: 'preview',
      title: '',
      description: '',
      slug: 'preview',
      doodUrl: '',
      doodFileId: '',
      embedUrl: '',
      thumbnailUrl: '',
      duration: 0,
      status: 'DRAFT',
      viewCount: 0,
      categoryId: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      category: null,
      tags: [],
    };
  }
}
