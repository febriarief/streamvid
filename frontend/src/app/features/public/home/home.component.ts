import { CommonModule, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize, forkJoin, take } from 'rxjs';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';
import { Category, Video, VideoService } from './video.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    DatePipe,
    PaginationComponent,
  ],
  templateUrl: './home.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeComponent {
  private readonly videoService = inject(VideoService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly videos = signal<Video[]>([]);
  protected readonly categories = signal<Category[]>([]);
  protected readonly selectedCategory = signal<string | null>(null);
  protected readonly searchQuery = signal('');
  protected readonly isLoading = signal(false);
  protected readonly currentPage = signal(1);
  protected readonly totalPages = signal(1);
  protected readonly totalItems = signal(0);
  protected readonly listError = signal('');
  protected readonly readonlySkeletons = Array.from({ length: 12 }, (_, index) => index);

  protected readonly hasVideos = computed(() => this.videos().length > 0);
  protected readonly hasActiveFilters = computed(
    () => Boolean(this.selectedCategory()) || this.searchQuery().length > 0
  );
  protected readonly emptyStateImage = computed(() => {
    if (this.searchQuery()) {
      return '/empty-state/empty-search.png';
    }

    if (this.selectedCategory()) {
      return '/empty-state/empty-filter.png';
    }

    return '/empty-state/empty-video.png';
  });
  protected readonly emptyStateTitle = computed(() => {
    if (this.searchQuery()) {
      return 'Tidak ada video yang ditemukan';
    }

    if (this.selectedCategory()) {
      return 'Kategori ini masih kosong';
    }

    return 'Belum ada video';
  });
  protected readonly emptyStateDescription = computed(() => {
    if (this.searchQuery()) {
      return `Coba kata kunci lain atau jelajahi kategori yang tersedia untuk menemukan video yang cocok.`;
    }

    if (this.selectedCategory()) {
      return 'Belum ada video yang dipublish di kategori ini. Silakan coba kategori lainnya.';
    }

    return 'Video yang sudah dipublish akan muncul di sini. Katalog utama StreamVid sedang disiapkan.';
  });
  constructor() {
    this.bindRouteState();
    this.loadInitialData();
  }

  protected onCategorySelect(categoryId: string | null): void {
    if (this.selectedCategory() === categoryId && this.currentPage() === 1) {
      return;
    }

    void this.updateFilters({
      categoryId,
      page: 1,
    });
  }

  protected goToPage(page: number): void {
    if (page === this.currentPage() || page < 1 || page > this.totalPages()) {
      return;
    }

    void this.updateFilters({ page });
  }

  protected formatDuration(durationInSeconds: number | null | undefined): string {
    if (!durationInSeconds || durationInSeconds < 1) {
      return '00:00';
    }

    const totalSeconds = Math.floor(durationInSeconds);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
      return [hours, minutes, seconds].map((value) => value.toString().padStart(2, '0')).join(':');
    }

    return [minutes, seconds].map((value) => value.toString().padStart(2, '0')).join(':');
  }

  protected formatViews(viewCount: number): string {
    return new Intl.NumberFormat('id-ID', {
      notation: viewCount >= 1000 ? 'compact' : 'standard',
      maximumFractionDigits: 1,
    }).format(viewCount);
  }

  protected reloadVideos(): void {
    this.loadVideos();
  }

  protected clearFilters(): void {
    void this.updateFilters({
      categoryId: null,
      search: '',
      page: 1,
    });
  }

  private loadInitialData(): void {
    this.isLoading.set(true);
    this.listError.set('');

    forkJoin({
      categories: this.videoService.getCategories().pipe(take(1)),
      videos: this.videoService
        .getVideos(this.selectedCategory(), this.searchQuery(), this.currentPage(), 12)
        .pipe(take(1)),
    })
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: ({ categories, videos }) => {
          this.categories.set(categories);
          this.setVideoState(videos);
        },
        error: () => this.listError.set('Gagal memuat beranda. Silakan coba lagi.'),
      });
  }

  private loadVideos(): void {
    this.isLoading.set(true);
    this.listError.set('');

    this.videoService
      .getVideos(this.selectedCategory(), this.searchQuery(), this.currentPage(), 12)
      .pipe(
        take(1),
        finalize(() => this.isLoading.set(false))
      )
      .subscribe({
        next: (response) => this.setVideoState(response),
        error: () => this.listError.set('Gagal memuat video. Silakan coba lagi.'),
      });
  }

  private bindRouteState(): void {
    this.route.queryParamMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((params) => {
        const categoryId = params.get('categoryId');
        const search = (params.get('search') ?? '').trim();
        const pageParam = params.get('page');
        const parsedPage = pageParam ? Number.parseInt(pageParam, 10) : 1;
        const page = Number.isNaN(parsedPage) || parsedPage < 1 ? 1 : parsedPage;

        const categoryChanged = this.selectedCategory() !== categoryId;
        const searchChanged = this.searchQuery() !== search;
        const pageChanged = this.currentPage() !== page;

        this.selectedCategory.set(categoryId);
        this.searchQuery.set(search);
        this.currentPage.set(page);

        if (categoryChanged || searchChanged || pageChanged) {
          this.loadVideos();
        }
      });
  }

  private setVideoState(response: {
    videos: Video[];
    total: number;
    page: number;
    totalPages: number;
  }): void {
    this.videos.set(response.videos);
    this.totalItems.set(response.total);
    this.currentPage.set(response.page);
    this.totalPages.set(Math.max(response.totalPages, 1));
  }

  private updateFilters(filters: {
    categoryId?: string | null;
    search?: string;
    page?: number | null;
  }): Promise<boolean> {
    const categoryId = filters.categoryId === undefined ? this.selectedCategory() : filters.categoryId;
    const search = filters.search ?? this.searchQuery();
    const page = filters.page ?? this.currentPage();

    return this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        categoryId,
        search: search || null,
        page: page <= 1 ? null : page,
      },
      queryParamsHandling: 'merge',
    });
  }
}
