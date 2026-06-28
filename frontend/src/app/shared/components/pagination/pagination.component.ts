import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { LucideChevronLeft, LucideChevronRight } from '@lucide/angular';

@Component({
  selector: 'app-pagination',
  standalone: true,
  imports: [CommonModule, LucideChevronLeft, LucideChevronRight],
  template: `
    @if (totalPages() > 1) {
      <div
        class="flex flex-col gap-4 rounded-3xl border border-zinc-200/70 bg-white/80 px-4 py-4 shadow-sm backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/80 dark:shadow-[0_8px_24px_rgba(0,0,0,.35)] sm:flex-row sm:items-center sm:justify-between"
      >
        <p class="text-sm text-gray-500 dark:text-gray-400">
          Menampilkan {{ visibleItems() }} dari {{ totalItems() }} {{ itemLabel() }}
        </p>

        <div class="flex flex-wrap items-center gap-2">
          <button
            type="button"
            (click)="onPageChange(currentPage() - 1)"
            [disabled]="currentPage() === 1"
            class="inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl border border-zinc-200 bg-white text-gray-700 transition duration-150 hover:border-cyan-300 hover:text-cyan-700 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:border-cyan-400/40 dark:hover:text-cyan-300"
            aria-label="Halaman sebelumnya"
          >
            <svg lucideChevronLeft class="h-4 w-4" aria-hidden="true"></svg>
          </button>

          @for (page of visiblePages(); track page) {
            <button
              type="button"
              (click)="onPageChange(page)"
              class="inline-flex h-10 min-w-10 cursor-pointer items-center justify-center rounded-xl border px-3 text-sm font-medium transition duration-150"
              [class]="page === currentPage()
                ? 'border-cyan-400/30 bg-cyan-500 text-slate-950'
                : 'border-zinc-200 bg-white text-gray-700 hover:border-cyan-300 hover:text-cyan-700 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:border-cyan-400/40 dark:hover:text-cyan-300'"
            >
              {{ page }}
            </button>
          }

          <button
            type="button"
            (click)="onPageChange(currentPage() + 1)"
            [disabled]="currentPage() === totalPages()"
            class="inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl border border-zinc-200 bg-white text-gray-700 transition duration-150 hover:border-cyan-300 hover:text-cyan-700 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:border-cyan-400/40 dark:hover:text-cyan-300"
            aria-label="Halaman berikutnya"
          >
            <svg lucideChevronRight class="h-4 w-4" aria-hidden="true"></svg>
          </button>
        </div>
      </div>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PaginationComponent {
  readonly currentPage = input.required<number>();
  readonly totalPages = input.required<number>();
  readonly totalItems = input.required<number>();
  readonly visibleItems = input.required<number>();
  readonly itemLabel = input('item');

  readonly pageChange = output<number>();

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

  protected onPageChange(page: number): void {
    if (page === this.currentPage() || page < 1 || page > this.totalPages()) {
      return;
    }

    this.pageChange.emit(page);
  }
}
