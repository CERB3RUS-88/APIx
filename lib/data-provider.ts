import { DailyIndex, RouteIndexSummary } from '@/types';
import { CURRENT_LIVE_INDEX, MOCK_ROUTE_SUMMARIES, DGCA_ROUTE_BASKET } from './mock-data';

export interface TimeSeriesPoint {
  date: string;
  apix: number;
  delta24h: number;
  rawFare: number;
  sampledRecords: number;
}

export interface RouteHeatmapItem {
  id: string;
  origin_code: string;
  origin_city: string;
  destination_code: string;
  destination_city: string;
  dgca_traffic_weight: number;
  current_fare: number;
  baseline_fare: number; // Jan 2026 Base
  delta_amount: number;
  delta_percent: number;
  t1_fare: number;
  t7_fare: number;
  t15_fare: number;
  t30_fare: number;
  t45_fare: number;
  status: 'SURGE' | 'EASED' | 'STABLE' | 'NORMAL';
  carriers: string[];
}

export interface RouteElasticityPoint {
  window: string;
  days: number;
  fare: number;
  multiplierVsT45: number;
  discountVsT1: number;
}

export interface RouteElasticityCurve {
  route_id: string;
  origin_city: string;
  destination_city: string;
  points: RouteElasticityPoint[];
  escalation_ratio: number; // T+1 / T+45
  avg_daily_climb_inr: number;
}

/**
 * Deterministic pseudo-random number generator (Mulberry32) for SSR hydration safety
 */
function seededRandom(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Generates deterministic historical time series calibrated against DGCA monthly yields
 */
function generateHistoricalTimeSeries(days: number): TimeSeriesPoint[] {
  const points: TimeSeriesPoint[] = [];
  const rng = seededRandom(20260822);
  
  // Anchor on fixed calendar base date: 2026-08-22
  const anchorDate = new Date(Date.UTC(2026, 7, 22, 0, 0, 0));
  
  let currentApix = 100.0;
  let currentFare = 5280.0;

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(anchorDate);
    d.setUTCDate(d.getUTCDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const dayOfWeek = d.getUTCDay(); // 0 = Sun, 5 = Fri, 6 = Sat

    // Weekend dynamic pricing effect (Fri/Sun fares higher)
    const randVal1 = rng();
    const weekendBump = (dayOfWeek === 5 || dayOfWeek === 0) ? (0.6 + randVal1 * 0.8) : 0;
    
    // Seasonal wave (Summer peak in May/June, Festive peak in Oct/Nov, Monsoon dip in July/Aug)
    const month = d.getUTCMonth();
    const seasonalTrend = 
      (month === 4 || month === 5) ? 0.08 : // Summer
      (month === 6 || month === 7) ? -0.12 : // Monsoon
      (month === 9 || month === 10) ? 0.15 : // Festive / Diwali
      0.02;

    const randVal2 = rng();
    const dailyDrift = (randVal2 - 0.48) * 0.9 + seasonalTrend + (weekendBump * 0.2);
    
    const prevApix = currentApix;
    currentApix = Math.max(92.0, Math.min(124.0, Number((currentApix + dailyDrift).toFixed(2))));
    const delta24h = Number((((currentApix - prevApix) / prevApix) * 100).toFixed(2));
    currentFare = Math.round(5280 * (currentApix / 100));

    points.push({
      date: dateStr,
      apix: currentApix,
      delta24h,
      rawFare: currentFare,
      sampledRecords: Math.floor(1200 + rng() * 400),
    });
  }

  // Ensure latest point matches current live index
  if (points.length > 0) {
    points[points.length - 1].apix = CURRENT_LIVE_INDEX.apix_value;
    points[points.length - 1].delta24h = CURRENT_LIVE_INDEX.delta_24h;
    points[points.length - 1].rawFare = CURRENT_LIVE_INDEX.weighted_basket_fare;
  }

  return points;
}

export const TIME_SERIES_365D = generateHistoricalTimeSeries(365);
export const TIME_SERIES_90D = TIME_SERIES_365D.slice(-90);
export const TIME_SERIES_30D = TIME_SERIES_365D.slice(-30);

export const ROUTE_HEATMAP_DATA: RouteHeatmapItem[] = [
  {
    id: 'DEL-BOM',
    origin_code: 'DEL',
    origin_city: 'Delhi',
    destination_code: 'BOM',
    destination_city: 'Mumbai',
    dgca_traffic_weight: 0.185,
    current_fare: 5450,
    baseline_fare: 5200,
    delta_amount: 250,
    delta_percent: 4.81,
    t1_fare: 8900,
    t7_fare: 5800,
    t15_fare: 5100,
    t30_fare: 4400,
    t45_fare: 4100,
    status: 'SURGE',
    carriers: ['6E', 'AI', 'QP', 'SG'],
  },
  {
    id: 'BOM-DEL',
    origin_code: 'BOM',
    origin_city: 'Mumbai',
    destination_code: 'DEL',
    destination_city: 'Delhi',
    dgca_traffic_weight: 0.178,
    current_fare: 5320,
    baseline_fare: 5100,
    delta_amount: 220,
    delta_percent: 4.31,
    t1_fare: 8650,
    t7_fare: 5600,
    t15_fare: 4950,
    t30_fare: 4350,
    t45_fare: 4050,
    status: 'SURGE',
    carriers: ['6E', 'AI', 'QP', 'SG'],
  },
  {
    id: 'DEL-BLR',
    origin_code: 'DEL',
    origin_city: 'Delhi',
    destination_code: 'BLR',
    destination_city: 'Bengaluru',
    dgca_traffic_weight: 0.112,
    current_fare: 6920,
    baseline_fare: 6700,
    delta_amount: 220,
    delta_percent: 3.28,
    t1_fare: 11500,
    t7_fare: 7550,
    t15_fare: 6500,
    t30_fare: 5850,
    t45_fare: 5450,
    status: 'NORMAL',
    carriers: ['6E', 'AI', 'IX'],
  },
  {
    id: 'BLR-DEL',
    origin_code: 'BLR',
    origin_city: 'Bengaluru',
    destination_code: 'DEL',
    destination_city: 'Delhi',
    dgca_traffic_weight: 0.109,
    current_fare: 6850,
    baseline_fare: 6600,
    delta_amount: 250,
    delta_percent: 3.79,
    t1_fare: 11200,
    t7_fare: 7400,
    t15_fare: 6400,
    t30_fare: 5800,
    t45_fare: 5400,
    status: 'NORMAL',
    carriers: ['6E', 'AI', 'IX'],
  },
  {
    id: 'BOM-BLR',
    origin_code: 'BOM',
    origin_city: 'Mumbai',
    destination_code: 'BLR',
    destination_city: 'Bengaluru',
    dgca_traffic_weight: 0.094,
    current_fare: 4150,
    baseline_fare: 4100,
    delta_amount: 50,
    delta_percent: 1.22,
    t1_fare: 6800,
    t7_fare: 4400,
    t15_fare: 3900,
    t30_fare: 3450,
    t45_fare: 3200,
    status: 'STABLE',
    carriers: ['6E', 'AI', 'QP'],
  },
  {
    id: 'BLR-BOM',
    origin_code: 'BLR',
    origin_city: 'Bengaluru',
    destination_code: 'BOM',
    destination_city: 'Mumbai',
    dgca_traffic_weight: 0.091,
    current_fare: 4200,
    baseline_fare: 4150,
    delta_amount: 50,
    delta_percent: 1.20,
    t1_fare: 6950,
    t7_fare: 4500,
    t15_fare: 3950,
    t30_fare: 3500,
    t45_fare: 3250,
    status: 'STABLE',
    carriers: ['6E', 'AI', 'QP'],
  },
  {
    id: 'DEL-CCU',
    origin_code: 'DEL',
    origin_city: 'Delhi',
    destination_code: 'CCU',
    destination_city: 'Kolkata',
    dgca_traffic_weight: 0.068,
    current_fare: 5850,
    baseline_fare: 5700,
    delta_amount: 150,
    delta_percent: 2.63,
    t1_fare: 9800,
    t7_fare: 6200,
    t15_fare: 5400,
    t30_fare: 4800,
    t45_fare: 4500,
    status: 'SURGE',
    carriers: ['6E', 'AI', 'SG'],
  },
  {
    id: 'CCU-DEL',
    origin_code: 'CCU',
    origin_city: 'Kolkata',
    destination_code: 'DEL',
    destination_city: 'Delhi',
    dgca_traffic_weight: 0.065,
    current_fare: 5700,
    baseline_fare: 5600,
    delta_amount: 100,
    delta_percent: 1.79,
    t1_fare: 9400,
    t7_fare: 6050,
    t15_fare: 5300,
    t30_fare: 4750,
    t45_fare: 4450,
    status: 'NORMAL',
    carriers: ['6E', 'AI', 'SG'],
  },
  {
    id: 'BLR-HYD',
    origin_code: 'BLR',
    origin_city: 'Bengaluru',
    destination_code: 'HYD',
    destination_city: 'Hyderabad',
    dgca_traffic_weight: 0.052,
    current_fare: 3420,
    baseline_fare: 3500,
    delta_amount: -80,
    delta_percent: -2.29,
    t1_fare: 5600,
    t7_fare: 3800,
    t15_fare: 3300,
    t30_fare: 2950,
    t45_fare: 2750,
    status: 'EASED',
    carriers: ['6E', 'AI'],
  },
  {
    id: 'MAA-DEL',
    origin_code: 'MAA',
    origin_city: 'Chennai',
    destination_code: 'DEL',
    destination_city: 'Delhi',
    dgca_traffic_weight: 0.046,
    current_fare: 6150,
    baseline_fare: 6200,
    delta_amount: -50,
    delta_percent: -0.81,
    t1_fare: 9900,
    t7_fare: 6800,
    t15_fare: 5900,
    t30_fare: 5300,
    t45_fare: 4950,
    status: 'EASED',
    carriers: ['6E', 'AI'],
  },
];

export const ROUTE_ELASTICITY_DATA: Record<string, RouteElasticityCurve> = {
  'DEL-BOM': {
    route_id: 'DEL-BOM',
    origin_city: 'Delhi',
    destination_city: 'Mumbai',
    escalation_ratio: 2.17,
    avg_daily_climb_inr: 109.1,
    points: [
      { window: 'T+45', days: 45, fare: 4100, multiplierVsT45: 1.0, discountVsT1: 53.9 },
      { window: 'T+30', days: 30, fare: 4400, multiplierVsT45: 1.07, discountVsT1: 50.6 },
      { window: 'T+15', days: 15, fare: 5100, multiplierVsT45: 1.24, discountVsT1: 42.7 },
      { window: 'T+7', days: 7, fare: 5800, multiplierVsT45: 1.41, discountVsT1: 34.8 },
      { window: 'T+1', days: 1, fare: 8900, multiplierVsT45: 2.17, discountVsT1: 0.0 },
    ],
  },
  'BLR-DEL': {
    route_id: 'BLR-DEL',
    origin_city: 'Bengaluru',
    destination_city: 'Delhi',
    escalation_ratio: 2.07,
    avg_daily_climb_inr: 131.8,
    points: [
      { window: 'T+45', days: 45, fare: 5400, multiplierVsT45: 1.0, discountVsT1: 51.8 },
      { window: 'T+30', days: 30, fare: 5800, multiplierVsT45: 1.07, discountVsT1: 48.2 },
      { window: 'T+15', days: 15, fare: 6400, multiplierVsT45: 1.19, discountVsT1: 42.9 },
      { window: 'T+7', days: 7, fare: 7400, multiplierVsT45: 1.37, discountVsT1: 33.9 },
      { window: 'T+1', days: 1, fare: 11200, multiplierVsT45: 2.07, discountVsT1: 0.0 },
    ],
  },
  'BOM-BLR': {
    route_id: 'BOM-BLR',
    origin_city: 'Mumbai',
    destination_city: 'Bengaluru',
    escalation_ratio: 2.13,
    avg_daily_climb_inr: 81.8,
    points: [
      { window: 'T+45', days: 45, fare: 3200, multiplierVsT45: 1.0, discountVsT1: 52.9 },
      { window: 'T+30', days: 30, fare: 3450, multiplierVsT45: 1.08, discountVsT1: 49.3 },
      { window: 'T+15', days: 15, fare: 3900, multiplierVsT45: 1.22, discountVsT1: 42.6 },
      { window: 'T+7', days: 7, fare: 4400, multiplierVsT45: 1.38, discountVsT1: 35.3 },
      { window: 'T+1', days: 1, fare: 6800, multiplierVsT45: 2.13, discountVsT1: 0.0 },
    ],
  },
  'DEL-CCU': {
    route_id: 'DEL-CCU',
    origin_city: 'Delhi',
    destination_city: 'Kolkata',
    escalation_ratio: 2.18,
    avg_daily_climb_inr: 120.5,
    points: [
      { window: 'T+45', days: 45, fare: 4500, multiplierVsT45: 1.0, discountVsT1: 54.1 },
      { window: 'T+30', days: 30, fare: 4800, multiplierVsT45: 1.07, discountVsT1: 51.0 },
      { window: 'T+15', days: 15, fare: 5400, multiplierVsT45: 1.20, discountVsT1: 44.9 },
      { window: 'T+7', days: 7, fare: 6200, multiplierVsT45: 1.38, discountVsT1: 36.7 },
      { window: 'T+1', days: 1, fare: 9800, multiplierVsT45: 2.18, discountVsT1: 0.0 },
    ],
  },
  'BLR-HYD': {
    route_id: 'BLR-HYD',
    origin_city: 'Bengaluru',
    destination_city: 'Hyderabad',
    escalation_ratio: 2.04,
    avg_daily_climb_inr: 64.8,
    points: [
      { window: 'T+45', days: 45, fare: 2750, multiplierVsT45: 1.0, discountVsT1: 50.9 },
      { window: 'T+30', days: 30, fare: 2950, multiplierVsT45: 1.07, discountVsT1: 47.3 },
      { window: 'T+15', days: 15, fare: 3300, multiplierVsT45: 1.20, discountVsT1: 41.1 },
      { window: 'T+7', days: 7, fare: 3800, multiplierVsT45: 1.38, discountVsT1: 32.1 },
      { window: 'T+1', days: 1, fare: 5600, multiplierVsT45: 2.04, discountVsT1: 0.0 },
    ],
  },
};
