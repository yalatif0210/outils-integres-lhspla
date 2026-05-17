import { Injectable, inject, signal } from '@angular/core';
import { ApiService } from './api.service';
import { tap } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AppConfigService {
  private api = inject(ApiService);
  private _config = signal<Record<string, string>>({});

  readonly config = this._config.asReadonly();

  load() {
    return this.api.getAppConfig().pipe(tap(c => this._config.set(c)));
  }

  get(key: string, fallback = ''): string {
    return this._config()[key] ?? fallback;
  }

  set(key: string, value: string) {
    this._config.update(c => ({ ...c, [key]: value }));
  }
}
