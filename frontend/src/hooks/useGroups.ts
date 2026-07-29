import { useGroupsQuery } from './useGroupsQuery';
import type { UseGroupsQueryOptions } from './useGroupsQuery';

/**
 * @deprecated Use useGroupsQuery for reads and useGroupMutations for writes.
 * Kept so existing imports keep resolving while call sites migrate.
 */
export const useGroups = useGroupsQuery;

export type UseGroupsOptions = UseGroupsQueryOptions;

// Keep backward-compat export for tests
export function clearGroupsCache() {
  // no-op — React Query manages its own cache
}
