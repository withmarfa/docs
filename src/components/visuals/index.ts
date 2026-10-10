import { ConnectorParts } from './connector-parts';
import { EventFlow } from './event-flow';
import { Arrow, Box, Branch, Branches, Chip, Figure, Flow, Group } from './figure';
import { FileStorage } from './file-storage';
import { ItemAnatomy } from './item-anatomy';
import { ItemLifecycle } from './item-lifecycle';
import { MarfaAtAGlance } from './marfa-at-a-glance';
import { Sequence } from './sequence';
import { TypeInheritance } from './type-inheritance';

/**
 * Everything a page can write from src/components/visuals/. `ItemLifecycle`
 * replaces the interactive diagram of that name.
 */
export const visualComponents = {
  Arrow,
  Box,
  Branch,
  Branches,
  Chip,
  ConnectorParts,
  EventFlow,
  Figure,
  FileStorage,
  Flow,
  Group,
  ItemAnatomy,
  ItemLifecycle,
  MarfaAtAGlance,
  Sequence,
  TypeInheritance,
};
