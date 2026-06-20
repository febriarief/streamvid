import { CommonModule, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  LucideClock,
  LucideEye,
  LucideTrendingUp,
  LucideTrophy,
} from '@lucide/angular';
import { finalize, take } from 'rxjs';
import { TrendingPeriod, TrendingService, Video } from './trending.service';

@Component({
  selector: 'app-trending',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    DatePipe,
    LucideTrendingUp,
    LucideEye,
    LucideClock,
    LucideTrophy,
  ],
  providers: [TrendingService],
  templateUrl: './trending.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TrendingComponent {
  private readonly trendingService = inject(TrendingService);

  protected readonly videos = signal<Video[]>([]);
  protected readonly isLoading = signal(false);
  protected readonly activePeriod = signal<TrendingPeriod>('week');
  protected readonly listError = signal('');
  protected readonly skeletons = Array.from({ length: 8 }, (_, index) => index);
  protected readonly periodOptions: Array<{ value: TrendingPeriod; label: string }> = [
    { value: 'today', label: 'Hari Ini' },
    { value: 'week', label: 'Minggu Ini' },
    { value: 'month', label: 'Bulan Ini' },
    { value: 'all', label: 'Semua Waktu' },
  ];

  protected readonly hasVideos = computed(() => this.videos().length > 0);
  protected readonly periodLabel = computed(() => {
    const current = this.periodOptions.find((option) => option.value === this.activePeriod());
    return current?.label ?? 'Minggu Ini';
  });

  constructor() {
    effect(() => {
      this.loadTrendingVideos(this.activePeriod());
    });
  }

  protected setPeriod(period: TrendingPeriod): void {
    if (period === this.activePeriod()) {
      return;
    }

    this.activePeriod.set(period);
  }

  protected formatViews(count: number): string {
    if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
    if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`;
    return count.toString();
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

  protected rankingClass(index: number): string {
    if (index === 0) {
      return 'text-yellow-500 dark:text-yellow-400';
    }

    if (index === 1) {
      return 'text-gray-400 dark:text-gray-300';
    }

    if (index === 2) {
      return 'text-amber-700 dark:text-amber-600';
    }

    return 'text-zinc-600 dark:text-zinc-600';
  }

  protected rankingSurfaceClass(index: number): string {
    if (index === 0) {
      return 'border-yellow-300/40 bg-yellow-500/10 dark:border-yellow-400/20 dark:bg-yellow-400/8';
    }

    if (index === 1) {
      return 'border-gray-300/40 bg-gray-400/10 dark:border-gray-300/20 dark:bg-gray-300/8';
    }

    if (index === 2) {
      return 'border-amber-400/40 bg-amber-500/10 dark:border-amber-600/25 dark:bg-amber-600/8';
    }

    return 'border-zinc-200/70 bg-white/80 dark:border-zinc-800 dark:bg-zinc-900/82';
  }

  protected trackByVideoId(_: number, video: Video): string {
    return video.id;
  }

  private loadTrendingVideos(period: TrendingPeriod): void {
    this.isLoading.set(true);
    this.listError.set('');

    this.trendingService
      .getTrendingVideos(period, 20)
      .pipe(
        take(1),
        finalize(() => this.isLoading.set(false))
      )
      .subscribe({
        next: (videos) => this.videos.set(videos),
        error: () => this.listError.set('Gagal memuat video trending. Silakan coba lagi.'),
      });
  }
}
