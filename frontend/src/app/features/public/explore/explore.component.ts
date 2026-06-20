import { CommonModule, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  LucideChevronLeft,
  LucideChevronRight,
  LucideSearch,
} from '@lucide/angular';
import { finalize, forkJoin, take } from 'rxjs';
import { Category, ExploreService, ExploreSort, Video } from './explore.service';

@Component({
  selector: 'app-explore',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    DatePipe,
    LucideSearch,
    LucideChevronLeft,
    LucideChevronRight,
  ],
  providers: [ExploreService],
  templateUrl: './explore.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExploreComponent {
  private readonly exploreService = inject(ExploreService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly videos = signal<Video[]>([]);
  protected readonly categories = signal<Category[]>([]);
  protected readonly isLoading = signal(false);
  protected readonly currentPage = signal(1);
  protected readonly totalPages = signal(1);
  protected readonly searchQuery = signal('');
  protected readonly selectedCategory = signal<string | null>(null);
  protected readonly sortBy = signal<ExploreSort>('latest');

  protected readonly totalItems = signal(0);
  protected readonly listError = signal('');
  protected readonly searchControl = new FormControl('', { nonNullable: true });
  protected readonly readonlySkeletons = Array.from({ length: 12 }, (_, index) => index);
  protected readonly sortOptions: Array<{ value: ExploreSort; label: string }> = [
    { value: 'latest', label: 'Terbaru' },
    { value: 'popular', label: 'Terpopuler' },
  ];

  protected readonly hasVideos = computed(() => this.videos().length > 0);
  protected readonly hasActiveFilters = computed(
    () =>
      this.searchQuery().length > 0
      || Boolean(this.selectedCategory())
      || this.sortBy() !== 'latest'
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
  protected readonly visiblePages = computed(() => {
    const total = this.totalPages();
    const current = this.currentPage();

    if (total <= 5) {
      return Array.from({ length: total }, (_, index) => index + 1);
    }

    let start = Math.max(current - 2, 1);
    let end = Math.min(start + 4, total);

    if (end - start < 4) {
      start = Math.max(end - 4, 1);
    }

    return Array.from({ length: end - start + 1 }, (_, index) => start + index);
  });

  constructor() {
    this.bindRouteState();
    this.loadInitialData();
  }

  protected onSearchSubmit(): void {
    const nextSearch = this.searchControl.getRawValue().trim();

    if (
      nextSearch === this.searchQuery()
      && this.currentPage() === 1
    ) {
      return;
    }

    void this.updateFilters({
      search: nextSearch,
      page: 1,
    });
  }

  protected onCategoryChange(categoryId: string): void {
    const nextCategory = categoryId || null;

    if (this.selectedCategory() === nextCategory && this.currentPage() === 1) {
      return;
    }

    void this.updateFilters({
      category: nextCategory,
      page: 1,
    });
  }

  protected onSortChange(sort: string): void {
    const nextSort: ExploreSort = sort === 'popular' ? 'popular' : 'latest';

    if (this.sortBy() === nextSort && this.currentPage() === 1) {
      return;
    }

    void this.updateFilters({
      sort: nextSort,
      page: 1,
    });
  }

  protected goToPage(page: number): void {
    if (page === this.currentPage() || page < 1 || page > this.totalPages()) {
      return;
    }

    void this.updateFilters({ page });
  }

  protected clearFilters(): void {
    this.searchControl.setValue('', { emitEvent: false });
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        search: null,
        category: null,
        sort: null,
        page: null,
      },
    });
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

  private loadInitialData(): void {
    this.isLoading.set(true);
    this.listError.set('');

    forkJoin({
      categories: this.exploreService.getCategories().pipe(take(1)),
      videos: this.exploreService
        .getVideos(this.selectedCategory(), this.searchQuery(), this.sortBy(), this.currentPage(), 12)
        .pipe(take(1)),
    })
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: ({ categories, videos }) => {
          this.categories.set(categories);
          this.setVideoState(videos);
        },
        error: () => this.listError.set('Gagal memuat halaman eksplorasi. Silakan coba lagi.'),
      });
  }

  private loadVideos(): void {
    this.isLoading.set(true);
    this.listError.set('');

    this.exploreService
      .getVideos(this.selectedCategory(), this.searchQuery(), this.sortBy(), this.currentPage(), 12)
      .pipe(
        take(1),
        finalize(() => this.isLoading.set(false))
      )
      .subscribe({
        next: (response) => this.setVideoState(response),
        error: () => this.listError.set('Gagal memuat video eksplorasi. Silakan coba lagi.'),
      });
  }

  private bindRouteState(): void {
    this.route.queryParamMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((params) => {
        const search = (params.get('search') ?? '').trim();
        const category = params.get('category');
        const sortParam = params.get('sort');
        const sort: ExploreSort = sortParam === 'popular' ? 'popular' : 'latest';
        const pageParam = params.get('page');
        const parsedPage = pageParam ? Number.parseInt(pageParam, 10) : 1;
        const page = Number.isNaN(parsedPage) || parsedPage < 1 ? 1 : parsedPage;

        const searchChanged = this.searchQuery() !== search;
        const categoryChanged = this.selectedCategory() !== category;
        const sortChanged = this.sortBy() !== sort;
        const pageChanged = this.currentPage() !== page;

        this.searchQuery.set(search);
        this.selectedCategory.set(category);
        this.sortBy.set(sort);
        this.currentPage.set(page);

        if (this.searchControl.getRawValue() !== search) {
          this.searchControl.setValue(search, { emitEvent: false });
        }

        if (searchChanged || categoryChanged || sortChanged || pageChanged) {
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
    search?: string;
    category?: string | null;
    sort?: ExploreSort;
    page?: number | null;
  }): Promise<boolean> {
    const search = filters.search ?? this.searchQuery();
    const category = filters.category === undefined ? this.selectedCategory() : filters.category;
    const sort = filters.sort ?? this.sortBy();
    const page = filters.page ?? this.currentPage();

    return this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        search: search || null,
        category,
        sort: sort === 'latest' ? null : sort,
        page: page <= 1 ? null : page,
      },
    });
  }
}
