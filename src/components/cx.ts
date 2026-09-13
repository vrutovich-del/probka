/** Joins class names, dropping falsy ones (CSS-module lookups are typed `string | undefined`). */
export function cx(...names: Array<string | false | null | undefined>): string {
  return names.filter(Boolean).join(' ');
}
