import { Group, Member, Transaction } from '../models';
import { RecommendationEngine } from '../recommendation';
import { mockGroups, mockMembers, mockTransactions, mockInteractions } from '../mock_data';
import { parseOffsetParams } from '../lib/pagination';

const engine = new RecommendationEngine(mockGroups, mockInteractions);

const paginateResults = (items: any[], limit?: number, offset?: number): any[] => {
  if (!limit && !offset) return items;
  const pageParams = { limit: limit ?? 20, offset: offset ?? 0 };
  const safeOffset = Math.min(pageParams.offset, items.length);
  return items.slice(safeOffset, safeOffset + pageParams.limit);
};

// ── Resolvers ─────────────────────────────────────────────────────────────────

export const resolvers = {
  Query: {
    health: () => 'ok',

    groups: (_: unknown, { limit, offset }: { limit?: number; offset?: number }) =>
      paginateResults(mockGroups, limit, offset),
    group:  (_: unknown, { id }: { id: string }) =>
      mockGroups.find(g => g.id === id) ?? null,

    members: (_: unknown, { limit, offset }: { limit?: number; offset?: number }) =>
      paginateResults(mockMembers, limit, offset),
    member:  (_: unknown, { id }: { id: string }) =>
      mockMembers.find(m => m.id === id) ?? null,

    transactions: (_: unknown, { groupId, limit, offset }: { groupId?: string; limit?: number; offset?: number }) => {
      const filtered = groupId ? mockTransactions.filter(t => t.groupId === groupId) : mockTransactions;
      return paginateResults(filtered, limit, offset);
    },
    transaction: (_: unknown, { id }: { id: string }) =>
      mockTransactions.find(t => t.id === id) ?? null,

    recommendations: (_: unknown, { userId }: { userId: string }) => {
      const recommendations = engine.getRecommendations(userId, 'collaborative');
      return { userId, algorithm: 'collaborative', recommendations };
    },

    search: (_: unknown, { query }: { query: string }) => {
      const q = query.toLowerCase();
      return {
        groups:       mockGroups.filter(g => g.name.toLowerCase().includes(q) || g.tags.some(t => t.includes(q))),
        members:      mockMembers.filter(m => m.name.toLowerCase().includes(q) || m.address.toLowerCase().includes(q)),
        transactions: mockTransactions.filter(t => t.stellarTxHash.toLowerCase().includes(q) || t.memberAddress.toLowerCase().includes(q)),
      };
    },
  },

  Mutation: {
    setPreferences: (
      _: unknown,
      args: { userId: string; minContribution?: number; maxContribution?: number; preferredDuration?: number; tags: string[] }
    ) => {
      engine.setPreference(args);
      return true;
    },
  },

  // ── Field resolvers (nested queries) ────────────────────────────────────────

  Group: {
    members:      (group: Group) => mockMembers.filter(m => m.groupIds.includes(group.id)),
    transactions: (group: Group) => mockTransactions.filter(t => t.groupId === group.id),
  },

  Member: {
    groups: (member: Member) => mockGroups.filter(g => member.groupIds.includes(g.id)),
    transactions: (member: Member) => mockTransactions.filter(t => t.memberAddress === member.address),
  },

  Transaction: {
    group:  (tx: Transaction) => mockGroups.find(g => g.id === tx.groupId)  ?? null,
    member: (tx: Transaction) => mockMembers.find(m => m.address === tx.memberAddress) ?? null,
  },

  RecommendationResult: {
    groups: (result: { recommendations: string[] }) =>
      mockGroups.filter(g => result.recommendations.includes(g.id)),
  },
};
