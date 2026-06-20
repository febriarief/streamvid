import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideEye, LucideFilm, LucideTrendingUp, LucideUsers } from '@lucide/angular';
import { forkJoin } from 'rxjs';
import { finalize, take } from 'rxjs/operators';
import { DashboardService, Stats, Video } from './dashboard.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    DatePipe,
    DecimalPipe,
    LucideEye,
    LucideFilm,
    LucideTrendingUp,
    LucideUsers,
  ],
  templateUrl: './dashboard.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardComponent {
  private readonly dashboardService = inject(DashboardService);

  protected readonly stats = signal<Stats | null>(null);
  protected readonly recentVideos = signal<Video[]>([]);
  protected readonly isLoading = signal(true);
  protected readonly loadError = signal('');

  protected readonly statCards = computed(() => {
    const stats = this.stats();

    return [
      {
        label: 'Total Video',
        value: stats?.totalVideos ?? 0,
        tone: 'violet',
      },
      {
        label: 'Video Published',
        value: stats?.publishedVideos ?? 0,
        tone: 'cyan',
      },
      {
        label: 'Video Draft',
        value: stats?.draftVideos ?? 0,
        tone: 'amber',
      },
      {
        label: 'Total Views',
        value: stats?.totalViews ?? 0,
        tone: 'blue',
      },
      {
        label: 'Total User',
        value: stats?.totalUsers ?? 0,
        tone: 'emerald',
      },
    ];
  });

  protected readonly hasRecentVideos = computed(() => this.recentVideos().length > 0);

  constructor() {
    this.loadDashboard();
  }

  protected loadDashboard(): void {
    this.isLoading.set(true);
    this.loadError.set('');

    forkJoin({
      stats: this.dashboardService.getStats(),
      recentVideos: this.dashboardService.getRecentVideos(5),
    })
      .pipe(
        take(1),
        finalize(() => this.isLoading.set(false))
      )
      .subscribe({
        next: ({ stats, recentVideos }) => {
          this.stats.set(stats);
          this.recentVideos.set(recentVideos);
        },
        error: () => {
          this.stats.set(null);
          this.recentVideos.set([]);
          this.loadError.set('Gagal memuat dashboard admin. Silakan coba lagi.');
        },
      });
  }

  protected getStatusLabel(status: Video['status']): string {
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

  protected getStatusClasses(status: Video['status']): string {
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

  protected getStatCardClasses(tone: string): string {
    switch (tone) {
      case 'cyan':
        return 'border-cyan-400/20 bg-cyan-500/[0.08]';
      case 'amber':
        return 'border-amber-400/20 bg-amber-500/[0.08]';
      case 'blue':
        return 'border-blue-400/20 bg-blue-500/[0.08]';
      case 'emerald':
        return 'border-emerald-400/20 bg-emerald-500/[0.08]';
      default:
        return 'border-violet-400/20 bg-violet-500/[0.08]';
    }
  }

  protected getStatIconClasses(tone: string): string {
    switch (tone) {
      case 'cyan':
        return 'border-cyan-400/20 bg-cyan-500/10 text-cyan-300';
      case 'amber':
        return 'border-amber-400/20 bg-amber-500/10 text-amber-300';
      case 'blue':
        return 'border-blue-400/20 bg-blue-500/10 text-blue-300';
      case 'emerald':
        return 'border-emerald-400/20 bg-emerald-500/10 text-emerald-300';
      default:
        return 'border-violet-400/20 bg-violet-500/10 text-violet-300';
    }
  }
}
