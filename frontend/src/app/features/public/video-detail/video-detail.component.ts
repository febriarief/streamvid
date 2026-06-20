import { CommonModule, DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import {
  LucideCalendar,
  LucideChevronDown,
  LucideChevronUp,
  LucideEye,
} from '@lucide/angular';
import { finalize, of, switchMap } from 'rxjs';
import { Video, VideoDetailService } from './video-detail.service';

@Component({
  selector: 'app-video-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    DatePipe,
    LucideChevronDown,
    LucideChevronUp,
    LucideEye,
    LucideCalendar,
  ],
  templateUrl: './video-detail.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VideoDetailComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly title = inject(Title);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly videoService = inject(VideoDetailService);

  protected readonly video = signal<Video | null>(null);
  protected readonly relatedVideos = signal<Video[]>([]);
  protected readonly isLoading = signal(true);
  protected readonly isDescExpanded = signal(false);
  protected readonly notFound = signal(false);
  protected readonly loadError = signal('');
  protected readonly relatedSkeletons = Array.from({ length: 4 }, (_, index) => index);

  protected readonly safeEmbedUrl = computed<SafeResourceUrl | null>(() => {
    const embedUrl = this.video()?.embedUrl;

    if (!embedUrl) {
      return null;
    }

    return this.sanitizer.bypassSecurityTrustResourceUrl(embedUrl);
  });

  constructor() {
    this.bindSlugChanges();
  }

  protected toggleDescription(): void {
    this.isDescExpanded.update((value) => !value);
  }

  protected async openRelatedVideo(slug: string): Promise<void> {
    await this.router.navigate(['/video', slug]);
    window.scrollTo(0, 0);
  }

  protected formatViews(viewCount: number): string {
    return new Intl.NumberFormat('id-ID', {
      notation: viewCount >= 1000 ? 'compact' : 'standard',
      maximumFractionDigits: 1,
    }).format(viewCount);
  }

  private bindSlugChanges(): void {
    this.route.paramMap
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        switchMap((params) => {
          const slug = params.get('slug');

          this.resetState();

          if (!slug) {
            this.notFound.set(true);
            this.isLoading.set(false);
            return of(null);
          }

          return this.videoService.getVideoBySlug(slug).pipe(finalize(() => this.isLoading.set(false)));
        })
      )
      .subscribe({
        next: (video) => {
          if (!video) {
            return;
          }

          this.video.set(video);
          this.title.setTitle(`${video.title} | StreamVid`);
          this.loadRelatedVideos(video);
        },
        error: (error: HttpErrorResponse) => {
          this.isLoading.set(false);

          if (error.status === 404) {
            this.notFound.set(true);
            this.title.setTitle('Video Tidak Ditemukan | StreamVid');
            return;
          }

          this.title.setTitle('Video | StreamVid');
          this.loadError.set('Gagal memuat detail video. Silakan coba lagi.');
        },
      });
  }

  private loadRelatedVideos(video: Video): void {
    const categoryId = video.categoryId;

    if (!categoryId) {
      this.relatedVideos.set([]);
      return;
    }

    this.videoService.getRelatedVideos(categoryId).subscribe({
      next: (videos) => {
        this.relatedVideos.set(videos.filter((item) => item.slug !== video.slug).slice(0, 8));
      },
      error: () => {
        this.relatedVideos.set([]);
      },
    });
  }

  private resetState(): void {
    this.isLoading.set(true);
    this.isDescExpanded.set(false);
    this.notFound.set(false);
    this.loadError.set('');
    this.video.set(null);
    this.relatedVideos.set([]);
  }
}
