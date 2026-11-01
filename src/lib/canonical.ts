import { siteUrl } from '@/lib/shared';

/** A path without its trailing slashes. The root stays `/`. */
export function withoutTrailingSlash(pathname: string): string {
  return pathname.replace(/\/+$/, '') || '/';
}

/** The address search engines and link previews are given for a page path. */
export function canonicalUrl(pathname: string): string {
  return `${siteUrl}${withoutTrailingSlash(pathname)}`;
}
