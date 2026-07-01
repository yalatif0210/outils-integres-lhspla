import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { from, switchMap, catchError, throwError } from 'rxjs';
import { environment } from '../../environments/environment';

const REFRESH_KEY = 'lhspla_refresh_token';

async function tryRefreshToken(): Promise<string> {
  const refreshToken = localStorage.getItem(REFRESH_KEY);
  if (!refreshToken) throw new Error('no refresh token');

  const res = await fetch(`${environment.mainApiUrl}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });

  if (!res.ok) throw new Error('refresh failed');
  const data = await res.json();
  if (!data.accessToken) throw new Error('no accessToken in response');

  localStorage.setItem(environment.localStorageTokenKey, data.accessToken);
  return data.accessToken;
}

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = localStorage.getItem(environment.localStorageTokenKey);
  const isApiCall = req.url.includes('/collecte-api/') || req.url.startsWith(environment.apiUrl);
  const authReq = (token && isApiCall)
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401 && isApiCall) {
        return from(tryRefreshToken()).pipe(
          switchMap(newToken => {
            const retried = req.clone({ setHeaders: { Authorization: `Bearer ${newToken}` } });
            return next(retried);
          }),
          catchError(() => {
            const returnUrl = encodeURIComponent(window.location.href);
            window.location.href = `${environment.mainAppUrl}?returnUrl=${returnUrl}`;
            return throwError(() => error);
          }),
        );
      }
      return throwError(() => error);
    }),
  );
};
