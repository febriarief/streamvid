import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Store } from '@ngrx/store';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import {
  LucideArrowLeft,
  LucideFolderTree,
  LucideLayoutDashboard,
  LucideLogOut,
  LucideMenu,
  LucideUser,
  LucideUsers,
  LucideVideo,
} from '@lucide/angular';
import { filter } from 'rxjs/operators';
import { logout } from '../../core/auth/auth.actions';
import { selectUser } from '../../core/auth/auth.selectors';

type AdminNavItem = {
  label: string;
  path: string;
  exact?: boolean;
  icon: 'dashboard' | 'video' | 'category' | 'users' | 'profile';
};

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    LucideArrowLeft,
    LucideFolderTree,
    LucideLayoutDashboard,
    LucideLogOut,
    LucideMenu,
    LucideUser,
    LucideUsers,
    LucideVideo,
  ],
  templateUrl: './admin-layout.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminLayoutComponent {
  private readonly store = inject(Store);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly isSidebarCollapsed = signal(false);
  protected readonly user = this.store.selectSignal(selectUser);
  protected readonly userDisplayName = computed(
    () => this.user()?.username || this.user()?.email || 'Admin'
  );
  protected readonly navigationItems: AdminNavItem[] = [
    { label: 'Dashboard', path: '/admin/dashboard', exact: true, icon: 'dashboard' },
    { label: 'Categories', path: '/admin/categories', icon: 'category' },
    { label: 'Videos', path: '/admin/videos', icon: 'video' },
    { label: 'Profile', path: '/admin/profile', icon: 'profile' },
    { label: 'Users', path: '/admin/users', icon: 'users' },
  ];

  constructor() {
    this.bindNavigationScrollReset();
  }

  protected toggleSidebar(): void {
    this.isSidebarCollapsed.update((value) => !value);
  }

  protected logout(): void {
    this.store.dispatch(logout());
  }

  private bindNavigationScrollReset(): void {
    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(() => {
        window.requestAnimationFrame(() => {
          window.scrollTo({
            top: 0,
            behavior: 'smooth',
          });
        });
      });
  }
}
