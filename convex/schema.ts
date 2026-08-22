import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

export default defineSchema({
  routes: defineTable({
    origin_code: v.string(),
    destination_code: v.string(),
    dgca_traffic_weight: v.number(),
    active: v.boolean(),
    created_at: v.optional(v.string()),
  })
    .index('by_route_pair', ['origin_code', 'destination_code'])
    .index('by_active', ['active']),

  raw_snapshots: defineTable({
    route_id: v.id('routes'),
    source: v.string(),
    booking_window: v.string(), // 'T+1', 'T+7', 'T+15', 'T+30', 'T+45'
    scraped_at: v.string(),
    raw_payload: v.any(),
  }).index('by_route_scraped', ['route_id', 'scraped_at']),

  fare_records: defineTable({
    route_id: v.id('routes'),
    source: v.string(),
    carrier: v.string(),
    flight_date: v.string(),
    booking_window: v.string(),
    base_fare: v.number(),
    taxes: v.number(),
    total_fare: v.number(),
    scraped_at: v.string(),
    is_outlier: v.boolean(),
  })
    .index('by_route_date', ['route_id', 'flight_date'])
    .index('by_scraped_at', ['scraped_at'])
    .index('by_carrier', ['carrier'])
    .index('by_window', ['booking_window']),

  daily_index: defineTable({
    index_date: v.string(),
    frequency: v.string(), // 'daily', 'weekly', 'monthly'
    apix_value: v.number(),
    base_period_value: v.number(),
    methodology_notes: v.optional(v.string()),
  }).index('by_date_freq', ['index_date', 'frequency']),

  dgca_reference_fares: defineTable({
    route_id: v.id('routes'),
    month: v.string(),
    avg_fare: v.number(),
  }).index('by_route_month', ['route_id', 'month']),
});
