/**
 * Cultivation Service — barrel re-export
 *
 * Aggregates all cultivation sub-services into a single `cultivationService` object
 * to preserve backward compatibility with all existing imports.
 *
 * Sub-services:
 *   growRooms.service.ts       — grow room CRUD + room flip
 *   roomLayout.service.ts      — room tables, sections, and occupancy
 *   plantGroups.service.ts     — plant group lifecycle, movement, cut sessions, individual plants
 *   harvestSessions.service.ts — harvest session lifecycle, weight entries, fresh frozen
 *   dryRooms.service.ts        — dry room CRUD
 *   binningSessions.service.ts — binning session lifecycle, bin entries
 */
import { growRoomsService } from './growRooms.service';
import { roomLayoutService } from './roomLayout.service';
import { plantGroupsService } from './plantGroups.service';
import { harvestSessionsService } from './harvestSessions.service';
import { dryRoomsService } from './dryRooms.service';
import { binningSessionsService } from './binningSessions.service';

export const cultivationService = {
  ...growRoomsService,
  ...roomLayoutService,
  ...plantGroupsService,
  ...harvestSessionsService,
  ...dryRoomsService,
  ...binningSessionsService,
};
