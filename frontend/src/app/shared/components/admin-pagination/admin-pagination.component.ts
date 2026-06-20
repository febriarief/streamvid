import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

@Component({
  selector: 'app-admin-pagination',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="flex flex-col gap-4 border-t border-zinc-200 px-5 py-4 dark:border-zinc-800 sm:flex-row sm:items-center sm:justify-between">
      <p class="text-sm text-gray-600 dark:text-zinc-400">
        {{ summary() }}
      </p>

      <div class="flex flex-wrap gap-2">
        @for (page of pageItems(); track page) {
          <button
            type="button"
            (click)="onPageChange(page)"
            class="inline-flex h-10 min-w-10 cursor-pointer items-center justify-center rounded-xl border px-3 text-sm font-medium transition duration-150"
            [class]="page === currentPage()
              ? 'border-cyan-400/30 bg-cyan-500 text-slate-950'
              : 'border-zinc-200 bg-white text-gray-700 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300'"
          >
            {{ page }}
          </button>
        }
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminPaginationComponent {
  readonly currentPage = input.required<number>();
  readonly totalPages = input.required<number>();
  readonly totalItems = input.required<number>();
  readonly visibleItems = input.required<number>();
  readonly itemLabel = input('item');

  readonly pageChange = output<number>();

  protected readonly pageItems = computed(() =>
    Array.from({ length: this.totalPages() }, (_, index) => index + 1)
  );

  protected readonly summary = computed(
    () => `Menampilkan ${this.visibleItems()} dari ${this.totalItems()} ${this.itemLabel()}`
  );

  protected onPageChange(page: number): void {
    if (page === this.currentPage() || page < 1 || page > this.totalPages()) {
      return;
    }

    this.pageChange.emit(page);
  }
}
