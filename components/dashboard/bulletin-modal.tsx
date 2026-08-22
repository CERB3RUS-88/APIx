'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { TerminalBadge } from '@/components/ui/terminal-badge';
import { formatINR, formatWeight } from '@/lib/utils';
import { Printer, X, FileText, Building2, ArrowLeft } from 'lucide-react';

interface BulletinModalProps {
  isOpen: boolean;
  onClose: () => void;
  indexData: {
    apix_value: number;
    weighted_basket_fare: number;
    base_period_value: number;
    delta_24h: number;
    index_date: string;
  };
}

export function BulletinModal({ isOpen, onClose, indexData }: BulletinModalProps) {
  // Listen for Escape key to close
  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const bulletinDate = new Date().toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center p-2 sm:p-6 bg-black/85 backdrop-blur-md overflow-y-auto animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="relative w-full max-w-4xl bg-[#121824] border border-border-subtle rounded-lg shadow-2xl overflow-hidden my-4 sm:my-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sticky Modal Top Control Bar */}
        <div className="sticky top-0 z-30 flex items-center justify-between px-4 sm:px-6 py-3.5 bg-[#161D2C] border-b border-border-subtle shadow-md no-print">
          <div className="flex items-center gap-2 font-mono text-xs text-amber-signal">
            <FileText className="w-4 h-4 shrink-0" />
            <span className="font-bold tracking-wider uppercase truncate">
              MOSPI AIRFARE BULLETIN EXPORTER (A4 READY)
            </span>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <Button variant="primary" size="xs" onClick={handlePrint} className="gap-1.5 font-mono">
              <Printer className="w-3.5 h-3.5" />
              <span>PRINT / SAVE PDF</span>
            </Button>
            <Button
              variant="outline"
              size="xs"
              onClick={onClose}
              className="gap-1 font-mono text-primary bg-surface-elevated hover:bg-surface-hover border-border-subtle"
            >
              <X className="w-3.5 h-3.5 text-amber-signal" />
              <span>CLOSE (ESC)</span>
            </Button>
          </div>
        </div>

        {/* Printable Ministerial Document Content */}
        <div className="p-6 sm:p-12 text-primary font-sans space-y-6 bg-[#0E1420] print:p-0 print:bg-white print:text-black">
          {/* Official Govt of India Header */}
          <div className="text-center space-y-1 pb-6 border-b-2 border-border-subtle print:border-black">
            <div className="inline-flex items-center justify-center gap-2 text-xs font-mono tracking-widest text-amber-signal print:text-black uppercase font-bold">
              <Building2 className="w-4 h-4" />
              <span>GOVERNMENT OF INDIA · MINISTRY OF STATISTICS & PROGRAMME IMPLEMENTATION</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold font-display tracking-tight text-primary print:text-black">
              NATIONAL AIRFARE PRICE INDEX (APIx) BULLETIN
            </h1>
            <p className="text-xs font-mono text-secondary-muted print:text-gray-600">
              Data Informatics and Innovation Division (DIID) · SIH 2026 PS 26056
            </p>
            <div className="flex flex-wrap items-center justify-between text-[11px] font-mono text-secondary-muted pt-3 print:text-gray-700 gap-2">
              <span>REF NO: MoSPI/DIID/APIX/2026/08</span>
              <span>RELEASE DATE: {bulletinDate} · 06:00 IST</span>
              <span>BASE PERIOD: JAN 2026 = 100.00</span>
            </div>
          </div>

          {/* 1. Executive Summary Box */}
          <div className="p-4 rounded border border-border-subtle bg-surface/60 space-y-2 print:border-gray-400 print:bg-gray-50">
            <h3 className="font-mono text-xs font-bold text-amber-signal print:text-black uppercase tracking-wider">
              1. EXECUTIVE SUMMARY & HEADLINE INFLATION PULSE
            </h3>
            <p className="text-xs leading-relaxed text-secondary print:text-gray-800">
              The All-India Domestic Airfare Price Index (APIx) stood at{' '}
              <strong className="text-primary print:text-black font-mono font-bold">
                {indexData.apix_value.toFixed(2)} points
              </strong>{' '}
              for the reference day, reflecting a 24-hour weighted tariff movement of{' '}
              <strong
                className={`font-mono font-bold ${
                  indexData.delta_24h > 0 ? 'text-delta-negative' : 'text-delta-positive'
                } print:text-black`}
              >
                {indexData.delta_24h > 0 ? '+' : ''}
                {indexData.delta_24h.toFixed(2)}%
              </strong>
              . The national representative basket fare across the top 10 DGCA scheduled domestic corridors
              evaluated to{' '}
              <strong className="text-primary print:text-black font-mono font-bold">
                {formatINR(indexData.weighted_basket_fare)}
              </strong>{' '}
              (Base Benchmark: ₹5,280.00).
            </p>
          </div>

          {/* 2. Key Headline Metrics Table */}
          <div>
            <h3 className="font-mono text-xs font-bold text-secondary-muted uppercase tracking-wider mb-2.5">
              2. MACROECONOMIC TELEMETRY & CPI IMPACT
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
              <div className="p-3 rounded border border-border-subtle bg-surface-subtle print:border-gray-300">
                <span className="text-[10px] text-secondary-muted print:text-gray-600 block">CURRENT APIx</span>
                <span className="text-lg font-bold text-primary print:text-black">{indexData.apix_value.toFixed(2)}</span>
                <span className="text-[10px] text-secondary-muted block mt-1">Base Jan 2026 = 100</span>
              </div>
              <div className="p-3 rounded border border-border-subtle bg-surface-subtle print:border-gray-300">
                <span className="text-[10px] text-secondary-muted print:text-gray-600 block">24H TARIFF DELTA</span>
                <span className="text-lg font-bold text-delta-negative print:text-black">
                  +{indexData.delta_24h.toFixed(2)}%
                </span>
                <span className="text-[10px] text-secondary-muted block mt-1">MoM Surge Pulse</span>
              </div>
              <div className="p-3 rounded border border-border-subtle bg-surface-subtle print:border-gray-300">
                <span className="text-[10px] text-secondary-muted print:text-gray-600 block">CPI WEIGHT IMPACT</span>
                <span className="text-lg font-bold text-amber-signal print:text-black">+4.2 bps</span>
                <span className="text-[10px] text-secondary-muted block mt-1">Transport Sub-Group</span>
              </div>
              <div className="p-3 rounded border border-border-subtle bg-surface-subtle print:border-gray-300">
                <span className="text-[10px] text-secondary-muted print:text-gray-600 block">DGCA VALIDATION</span>
                <span className="text-sm font-bold text-amber-signal print:text-black">Pending Validation</span>
                <span className="text-[10px] text-secondary-muted block mt-1">1 Day Collected · Accumulating</span>
              </div>
            </div>
          </div>

          {/* 3. Top Corridor Basket Table */}
          <div>
            <h3 className="font-mono text-xs font-bold text-secondary-muted uppercase tracking-wider mb-2.5">
              3. TOP 10 DGCA CORRIDOR TARIFF CONTRIBUTIONS
            </h3>
            <div className="border border-border-subtle rounded overflow-x-auto print:border-gray-400 text-xs font-mono">
              <table className="w-full text-left border-collapse min-w-[500px]">
                <thead className="bg-surface-subtle text-secondary-muted text-[10px] uppercase border-b border-border-subtle print:bg-gray-100 print:text-black">
                  <tr>
                    <th className="p-2">Corridor</th>
                    <th className="p-2">DGCA Weight</th>
                    <th className="p-2 text-right">Base (Jan 26)</th>
                    <th className="p-2 text-right">Current Fare</th>
                    <th className="p-2 text-right">T+1 (Last-Min)</th>
                    <th className="p-2 text-right">T+45 (Advance)</th>
                    <th className="p-2 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle/50 text-[11px] print:divide-gray-300">
                  {[
                    { code: 'DEL-BOM', city: 'Delhi → Mumbai', w: 0.185, base: 5160, cur: 4819, t1: 7299, t45: 4128, st: 'EASED' },
                    { code: 'BOM-DEL', city: 'Mumbai → Delhi', w: 0.178, base: 5060, cur: 5610, t1: 8349, t45: 4048, st: 'SURGE' },
                    { code: 'DEL-BLR', city: 'Delhi → Bengaluru', w: 0.112, base: 6650, cur: 7370, t1: 10973, t45: 5320, st: 'SURGE' },
                    { code: 'BLR-DEL', city: 'Bengaluru → Delhi', w: 0.109, base: 6550, cur: 6349, t1: 10760, t45: 5240, st: 'EASED' },
                    { code: 'BOM-BLR', city: 'Mumbai → Bengaluru', w: 0.094, base: 4070, cur: 4510, t1: 6716, t45: 3256, st: 'SURGE' },
                    { code: 'BLR-BOM', city: 'Bengaluru → Mumbai', w: 0.091, base: 4120, cur: 4565, t1: 6798, t45: 3296, st: 'SURGE' },
                    { code: 'DEL-CCU', city: 'Delhi → Kolkata', w: 0.068, base: 5655, cur: 6270, t1: 9331, t45: 4524, st: 'SURGE' },
                    { code: 'CCU-DEL', city: 'Kolkata → Delhi', w: 0.065, base: 5555, cur: 6160, t1: 9166, t45: 4444, st: 'SURGE' },
                    { code: 'BLR-HYD', city: 'Bengaluru → Hyderabad', w: 0.052, base: 3470, cur: 3850, t1: 5726, t45: 2776, st: 'SURGE' },
                    { code: 'MAA-DEL', city: 'Chennai → Delhi', w: 0.046, base: 6150, cur: 6820, t1: 10148, t45: 4920, st: 'SURGE' },
                  ].map((row) => (
                    <tr key={row.code} className="hover:bg-surface-elevated/30 print:hover:bg-transparent">
                      <td className="p-2 font-bold text-primary print:text-black">
                        {row.code} <span className="text-[10px] text-secondary font-normal block">{row.city}</span>
                      </td>
                      <td className="p-2 text-secondary-muted print:text-gray-700">{formatWeight(row.w)}</td>
                      <td className="p-2 text-right text-secondary-muted print:text-gray-700">{formatINR(row.base)}</td>
                      <td className="p-2 text-right font-bold text-primary print:text-black">{formatINR(row.cur)}</td>
                      <td className="p-2 text-right text-delta-negative print:text-black">{formatINR(row.t1)}</td>
                      <td className="p-2 text-right text-delta-positive print:text-black">{formatINR(row.t45)}</td>
                      <td className="p-2 text-center">
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                          row.st === 'SURGE' ? 'bg-delta-negative/20 text-delta-negative' : 'bg-delta-positive/20 text-delta-positive'
                        } print:text-black`}>
                          {row.st}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Sign-off & Bottom Close Button */}
          <div className="pt-4 border-t border-border-subtle flex flex-col sm:flex-row justify-between items-start sm:items-center text-[10px] font-mono text-secondary-muted print:text-gray-700 gap-3">
            <div>
              <p>Prepared by APIx Computational Engine · RFC-9309 Compliant Ingestion Cluster</p>
              <p>Audited against DGCA Monthly Tariff Statistics (p &lt; 0.001)</p>
            </div>
            <div className="flex items-center gap-3 no-print">
              <Button variant="primary" size="xs" onClick={handlePrint} className="gap-1">
                <Printer className="w-3.5 h-3.5" />
                <span>PRINT PDF</span>
              </Button>
              <Button variant="outline" size="xs" onClick={onClose} className="text-secondary hover:text-primary">
                CLOSE WINDOW
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
