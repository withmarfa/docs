import type { IconData } from '@/lib/icons';
import { cn } from '@/lib/cn';

/**
 * An icon drawn from SVG that was resolved while the page was compiled. It
 * means something where it stands (a Catalog type's own icon, a connector's
 * mark), so it is hidden from assistive technology and carries no label of its own.
 */
export function Icon({ body, width, height, className }: IconData & { className?: string }) {
  return (
    <svg
      className={cn('marfa-icon', className)}
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${width} ${height}`}
      width="1em"
      height="1em"
      aria-hidden="true"
      focusable="false"
      dangerouslySetInnerHTML={{ __html: body }}
    />
  );
}
