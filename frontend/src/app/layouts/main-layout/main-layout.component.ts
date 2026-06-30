import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Store } from '@ngrx/store';
import { NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import {
  LucideBell,
  LucideBookMarked,
  LucideChevronRight,
  LucideCompass,
  LucideFlame,
  LucideHouse,
  LucideLayoutDashboard,
  LucideLogOut,
  LucideMenu,
  LucidePlaySquare,
  LucideSearch,
  LucideUser,
} from '@lucide/angular';
import { filter } from 'rxjs/operators';
import { logout } from '../../core/auth/auth.actions';
import { selectIsAdmin, selectIsLoggedIn, selectUser } from '../../core/auth/auth.selectors';

type NavItem = {
  label: string;
  icon: 'home' | 'compass' | 'flame' | 'book-marked';
  href: string;
  requiresAuth?: boolean;
};

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [
    RouterOutlet,
    RouterLink,
    ReactiveFormsModule,
    LucideMenu,
    LucideSearch,
    LucideBell,
    LucideBookMarked,
    LucideChevronRight,
    LucideLayoutDashboard,
    LucideLogOut,
    LucideHouse,
    LucideCompass,
    LucideFlame,
    LucidePlaySquare,
    LucideUser,
  ],
  templateUrl: './main-layout.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MainLayoutComponent {
  private readonly store = inject(Store);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly isSidebarOpen = signal(false);
  protected readonly currentUrl = signal(this.router.url);
  protected readonly primaryNavItems: NavItem[] = [
    { label: 'Home', icon: 'home', href: '/' },
    { label: 'Explore', icon: 'compass', href: '/explore' },
    { label: 'Trending', icon: 'flame', href: '/trending' },
    { label: 'Library', icon: 'book-marked', href: '/library', requiresAuth: true },
  ];
  protected readonly user = this.store.selectSignal(selectUser);
  protected readonly isLoggedIn = this.store.selectSignal(selectIsLoggedIn);
  protected readonly isAdmin = this.store.selectSignal(selectIsAdmin);
  protected readonly isUserMenuOpen = signal(false);
  protected readonly searchControl = new FormControl('', { nonNullable: true });
  protected readonly userInitials = computed(() => {
    const currentUser = this.user();

    if (!currentUser) {
      return 'SV';
    }

    const source = currentUser.username || currentUser.email;

    return source.slice(0, 2).toUpperCase();
  });
  protected readonly visiblePrimaryNavItems = computed(() =>
    this.primaryNavItems.filter((item) => !item.requiresAuth || this.isLoggedIn())
  );

  constructor() {
    this.syncSearchFromUrl();
  }

  protected toggleSidebar(): void {
    this.isSidebarOpen.update((value) => !value);
  }

  protected closeSidebar(): void {
    this.isSidebarOpen.set(false);
  }

  protected readonly sidebarToggleLabel = computed(() =>
    this.isSidebarOpen() ? 'Tutup navigasi' : 'Buka navigasi'
  );

  protected toggleUserMenu(): void {
    this.isUserMenuOpen.update((isOpen) => !isOpen);
  }

  protected closeUserMenu(): void {
    this.isUserMenuOpen.set(false);
  }

  protected logout(): void {
    this.closeUserMenu();
    this.store.dispatch(logout());
  }

  protected navigateToAdminDashboard(): void {
    this.closeUserMenu();
    void this.router.navigate(['/admin/dashboard']);
  }

  protected navigateToProfile(): void {
    this.closeUserMenu();
    void this.router.navigate(['/profile']);
  }

  protected navItemClass(item: NavItem, expanded: boolean): string {
    const isActive = this.isNavActive(item);
    const baseClass = expanded
      ? 'flex min-h-12 w-full cursor-pointer items-center gap-3 rounded-2xl px-4 text-sm font-medium transition duration-150'
      : 'flex min-h-16 w-full cursor-pointer flex-col items-center justify-center gap-1 rounded-2xl px-2 text-[11px] font-medium transition duration-150';

    const activeClass = isActive
      ? 'border border-cyan-400/20 bg-linear-to-r from-violet-500/20 via-blue-500/10 to-cyan-500/20 text-white shadow-[0_0_24px_rgba(124,58,237,0.18)]'
      : 'border border-transparent text-zinc-400 hover:border-zinc-800 hover:bg-zinc-900 hover:text-white';

    return `${baseClass} ${activeClass}`;
  }

  protected submitSearch(): void {
    const search = this.searchControl.getRawValue().trim();

    void this.router.navigate(['/explore'], {
      queryParams: {
        search: search || null,
      },
    });
  }

  private syncSearchFromUrl(): void {
    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((event) => {
        this.currentUrl.set(event.urlAfterRedirects);
        this.closeUserMenu();
        this.closeSidebar();
        this.scrollToTop();

        const search = this.router.routerState.snapshot.root.queryParamMap.get('search') ?? '';

        if (search !== this.searchControl.getRawValue()) {
          this.searchControl.setValue(search, { emitEvent: false });
        }
      });

    const initialSearch = this.router.routerState.snapshot.root.queryParamMap.get('search') ?? '';
    this.searchControl.setValue(initialSearch, { emitEvent: false });
  }

  private scrollToTop(): void {
    window.requestAnimationFrame(() => {
      window.scrollTo({
        top: 0,
        behavior: 'smooth',
      });
    });
  }

  protected isNavActive(item: NavItem): boolean {
    if (item.label === 'Home') {
      return this.currentUrl() === '/' || this.currentUrl().startsWith('/video/');
    }

    if (item.label === 'Explore') {
      return this.currentUrl().startsWith('/explore');
    }

    if (item.label === 'Trending') {
      return this.currentUrl().startsWith('/trending');
    }

    if (item.label === 'Library') {
      return this.currentUrl().startsWith('/library');
    }

    return false;
  }
}
