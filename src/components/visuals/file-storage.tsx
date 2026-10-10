import { Cloud, FileImage, HardDrive, Receipt, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { Box, Branches, Figure } from './figure';

/** The hash both files name, cut short as the docs print it. */
export const hash = 'sha256:d71b…';

export type FileItem = { title: string; type: string; icon: LucideIcon };

/** Two file items of different types that hold the same bytes. */
export const files: readonly FileItem[] = [
  { title: 'Holiday photo', type: 'core.file.image', icon: FileImage },
  { title: 'Scanned receipt', type: 'app.example.receipt', icon: Receipt },
];

export type Store = { title: string; subtitle: string; icon: LucideIcon; always: boolean };

/**
 * Where a blob's copies live. The disk store is always there and takes every
 * upload (`stores/list-disk-always`, `stores/upload-locates-disk`); an object
 * store, once configured, gets a copy of every blob (`stores/replicate-every-store`).
 */
export const stores: readonly Store[] = [
  { title: 'Disk', subtitle: 'Always there, takes every upload', icon: HardDrive, always: true },
  { title: 'Object store', subtitle: 'When configured, holds a copy', icon: Cloud, always: false },
];

/**
 * Two files, one blob, and where the blob's bytes are kept: both items name
 * the same hash, so the bytes are stored once, and each store holds a copy.
 */
export function FileStorage({ caption }: { caption?: ReactNode }) {
  return (
    <Figure label="Two files sharing one blob, and the stores that hold it" caption={caption} className="marfa-fs">
      <Branches
        rootAt="bottom"
        head="root"
        root={
          <Box tone="accent" title={<>Blob <code>{hash}</code></>} subtitle="The bytes, stored once under their hash" />
        }
      >
        {files.map((file) => (
          <Box key={file.title} icon={file.icon} title={file.title} subtitle={<code>{file.type}</code>}>
            <span className="marfa-fs-ref">
              <code>blob_ref: {hash}</code>
            </span>
          </Box>
        ))}
      </Branches>
      <Branches head="child">
        {stores.map((store) => (
          <Box
            key={store.title}
            tone={store.always ? 'default' : 'dashed'}
            icon={store.icon}
            title={store.title}
            subtitle={store.subtitle}
          />
        ))}
      </Branches>
    </Figure>
  );
}
