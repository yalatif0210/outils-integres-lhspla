import { CanDeactivateFn } from '@angular/router';

export interface HasUnsavedChanges {
  hasUnsavedChanges(): boolean;
}

export const unsavedChangesGuard: CanDeactivateFn<unknown> = (component) => {
  const c = component as HasUnsavedChanges;
  if (typeof c?.hasUnsavedChanges === 'function' && c.hasUnsavedChanges()) {
    return confirm('Vous avez un brouillon non soumis. Voulez-vous quitter sans enregistrer ?');
  }
  return true;
};
