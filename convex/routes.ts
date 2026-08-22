import { query, mutation } from './_generated/server';
import { v } from 'convex/values';

export const listRoutes = query({
  args: { activeOnly: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    if (args.activeOnly) {
      return await ctx.db
        .query('routes')
        .withIndex('by_active', (q) => q.eq('active', true))
        .collect();
    }
    return await ctx.db.query('routes').collect();
  },
});

export const seedRoutes = mutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db.query('routes').collect();
    if (existing.length > 0) {
      return { seeded: false, count: existing.length, message: 'Routes already seeded' };
    }

    const defaultRoutes = [
      { origin_code: 'DEL', destination_code: 'BOM', dgca_traffic_weight: 0.185, active: true },
      { origin_code: 'BOM', destination_code: 'DEL', dgca_traffic_weight: 0.178, active: true },
      { origin_code: 'DEL', destination_code: 'BLR', dgca_traffic_weight: 0.112, active: true },
      { origin_code: 'BLR', destination_code: 'DEL', dgca_traffic_weight: 0.109, active: true },
      { origin_code: 'BOM', destination_code: 'BLR', dgca_traffic_weight: 0.094, active: true },
      { origin_code: 'BLR', destination_code: 'BOM', dgca_traffic_weight: 0.091, active: true },
      { origin_code: 'DEL', destination_code: 'CCU', dgca_traffic_weight: 0.068, active: true },
      { origin_code: 'CCU', destination_code: 'DEL', dgca_traffic_weight: 0.065, active: true },
      { origin_code: 'BLR', destination_code: 'HYD', dgca_traffic_weight: 0.052, active: true },
      { origin_code: 'MAA', destination_code: 'DEL', dgca_traffic_weight: 0.046, active: true },
    ];

    const insertedIds = [];
    for (const route of defaultRoutes) {
      const id = await ctx.db.insert('routes', {
        ...route,
        created_at: new Date().toISOString(),
      });
      insertedIds.push(id);
    }

    return { seeded: true, count: insertedIds.length, message: 'Successfully seeded 10 DGCA routes' };
  },
});
