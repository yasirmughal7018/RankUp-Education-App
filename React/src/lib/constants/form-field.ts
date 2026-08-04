/**
 * Shared form control styles — use theme tokens so light/dark stay consistent.
 * Prefer this (or `<Input />`) over one-off border-slate / bg-white classes.
 */
export const FORM_FIELD_CLASS =
  "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50";
