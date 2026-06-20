import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  LucideBarChart2,
  LucideBookMarked,
  LucideClock,
  LucideTrash2,
  LucideX,
} from '@lucide/angular';
import { finalize, take } from 'rxjs';
import { LibraryService, MostWatched, ViewHistory } from './library.service';

@Component({
  selector: 'app-library',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    LucideBookMarked,
    LucideClock,
    LucideBarChart2,
    LucideTrash2,
    LucideX,
  ],
  templateUrl: './library.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LibraryComponent {
  private readonly libraryService = inject(LibraryService);

  protected readonly activeTab = signal<'history' | 'most-watched'>('history');
  protected readonly historyVideos = signal<ViewHistory[]>([]);
  protected readonly mostWatchedVideos = signal<MostWatched[]>([]);
  protected readonly isLoading = signal(false);
  protected readonly errorMessage = signal('');

  constructor() {
    this.loadHistory();
  }

  protected setActiveTab(tab: 'history' | 'most-watched'): void {
    if (this.activeTab() === tab) {
      return;
    }

    this.activeTab.set(tab);
    this.errorMessage.set('');

    if (tab === 'history') {
      this.loadHistory();
      return;
    }

    this.loadMostWatched();
  }

  protected removeHistoryItem(videoId: string): void {
    this.isLoading.set(true);
    this.errorMessage.set('');

    this.libraryService
      .deleteWatchHistoryItem(videoId)
      .pipe(
        take(1),
        finalize(() => this.isLoading.set(false))
      )
      .subscribe({
        next: () => {
          this.historyVideos.update((items) => items.filter((item) => item.videoId !== videoId));

          if (this.mostWatchedVideos().length > 0) {
            this.loadMostWatched();
          }
        },
        error: () => {
          this.errorMessage.set('Gagal menghapus riwayat tonton. Silakan coba lagi.');
        },
      });
  }

  protected clearHistory(): void {
    if (this.historyVideos().length === 0) {
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');

    this.libraryService
      .clearWatchHistory()
      .pipe(
        take(1),
        finalize(() => this.isLoading.set(false))
      )
      .subscribe({
        next: () => {
          this.historyVideos.set([]);
          this.mostWatchedVideos.set([]);
        },
        error: () => {
          this.errorMessage.set('Gagal menghapus semua riwayat. Silakan coba lagi.');
        },
      });
  }

  protected formatRelativeTime(date: string): string {
    const diff = Date.now() - new Date(date).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (minutes < 60) return `${minutes} menit lalu`;
    if (hours < 24) return `${hours} jam lalu`;
    if (days === 1) return 'Kemarin';
    return `${days} hari lalu`;
  }

  protected trackByHistory(_: number, item: ViewHistory): string {
    return item.id;
  }

  protected trackByMostWatched(_: number, item: MostWatched): string {
    return item.videoId;
  }

  private loadHistory(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');

    this.libraryService
      .getWatchHistory()
      .pipe(
        take(1),
        finalize(() => this.isLoading.set(false))
      )
      .subscribe({
        next: (videos) => this.historyVideos.set(videos),
        error: () => {
          this.errorMessage.set('Gagal memuat riwayat tonton. Silakan coba lagi.');
        },
      });
  }

  private loadMostWatched(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');

    this.libraryService
      .getMostWatched()
      .pipe(
        take(1),
        finalize(() => this.isLoading.set(false))
      )
      .subscribe({
        next: (videos) => this.mostWatchedVideos.set(videos),
        error: () => {
          this.errorMessage.set('Gagal memuat video yang paling sering ditonton.');
        },
      });
  }
}
