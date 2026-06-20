import { Injectable } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterStateSnapshot, TitleStrategy } from '@angular/router';

@Injectable()
export class AppTitleStrategy extends TitleStrategy {
  private readonly brandName = 'StreamVid';

  constructor(private readonly title: Title) {
    super();
  }

  override updateTitle(snapshot: RouterStateSnapshot): void {
    const routeTitle = this.buildTitle(snapshot);
    const nextTitle =
      routeTitle && routeTitle !== this.brandName
        ? `${routeTitle} | ${this.brandName}`
        : this.brandName;

    this.title.setTitle(nextTitle);
  }
}
