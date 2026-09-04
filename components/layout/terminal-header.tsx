'use client';

import * as React from 'react';
import { TerminalBadge } from '@/components/ui/terminal-badge';
import { Button } from '@/components/ui/button';
import { Activity, Clock, Volume2, VolumeX, ShieldCheck, FileText, Sliders } from 'lucide-react';

interface TerminalHeaderProps {
  activeTab: string;
  onSelectTab: (tab: string) => void;
  audioEnabled: boolean;
  onToggleAudio: () => void;
  onOpenBulletin?: () => void;
  onOpenSimulator?: () => void;
}

export function TerminalHeader({
  activeTab,
  onSelectTab,
  audioEnabled,
  onToggleAudio,
  onOpenBulletin,
  onOpenSimulator,
}: TerminalHeaderProps) {
  const [timeStr, setTimeStr] = React.useState<string>('');

  React.useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const formatted = new Intl.DateTimeFormat('en-IN', {
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      }).format(now);
      const dateFormatted = new Intl.DateTimeFormat('en-IN', {
        timeZone: 'Asia/Kolkata',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }).format(now);

      setTimeStr(`${dateFormatted} ${formatted} IST`);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const navItems = [
    { id: 'overview', label: '01. INDEX OVERVIEW' },
    { id: 'routes', label: '02. ROUTE BASKET' },
    { id: 'elasticity', label: '03. LEAD-TIME ELASTICITY' },
    { id: 'validation', label: '04. DGCA VALIDATION' },
    { id: 'methodology', label: '05. METHODOLOGY' },
    { id: 'api-docs', label: '06. API SPECS' },
    { id: 'fare-inspector', label: '07. FARE INSPECTOR' },
  ];

  return (
    <header className="border-b border-border-subtle bg-ink sticky top-0 z-40 backdrop-blur-md bg-ink/95">
      {/* Top Telemetry Strip */}
      <div className="px-4 py-1.5 border-b border-border-subtle/40 flex items-center justify-between text-[11px] font-mono text-secondary-muted bg-surface-subtle/50">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-primary font-semibold">
            <span className="w-2 h-2 rounded-full bg-amber-signal animate-pulse-subtle" />
            <span>MOSPI / DIID · SIH 2026</span>
          </div>
          <span className="text-border-subtle">|</span>
          <span className="hidden sm:inline">PS 26056: High-Frequency Airfare CPI Augmentation</span>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-primary">
            <Clock className="w-3 h-3 text-secondary-muted" />
            <span className="tabular-nums font-mono">{timeStr || 'LIVE CLOCK...'}</span>
          </div>
          <span className="text-border-subtle hidden md:inline">|</span>
          <div className="hidden md:flex items-center gap-1 text-delta-positive">
            <ShieldCheck className="w-3 h-3" />
            <span>ETHICAL SCRAPING SAFEGUARDS: ROBOTS.TXT & RATE-LIMITED</span>
          </div>
        </div>
      </div>

      {/* Main Terminal Bar */}
      <div className="px-4 py-3 flex flex-wrap items-center justify-between gap-4">
        {/* Brand & Instrument Name */}
        <div className="flex items-center gap-3">
          <div className="px-2.5 py-1 bg-amber-signal text-ink font-mono font-bold text-sm tracking-wider rounded-sm">
            APIx
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-display font-bold text-sm md:text-base tracking-tight text-primary">
                AIRFARE PRICE INDEX
              </h1>
              <TerminalBadge variant="amber" size="xs" dot>
                NATIONAL BASKET
              </TerminalBadge>
            </div>
            <p className="text-[11px] font-mono text-secondary-muted hidden sm:block">
              DAILY WEIGHTED PASSENGER-TRAFFIC INDEX (BASE = 100.00)
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center gap-1 overflow-x-auto py-1">
          {navItems.map((item) => (
            <Button
              key={item.id}
              variant={activeTab === item.id ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => onSelectTab(item.id)}
              className={
                activeTab === item.id
                  ? 'bg-amber-signal/15 text-amber-signal border-amber-signal/40 shadow-none font-bold'
                  : 'text-secondary hover:text-primary'
              }
            >
              {item.label}
            </Button>
          ))}
        </nav>

        {/* Action Triggers: Bulletin, Simulator & Audio */}
        <div className="flex items-center gap-2">
          {onOpenBulletin && (
            <Button
              variant="outline"
              size="sm"
              onClick={onOpenBulletin}
              className="gap-1.5 text-secondary hover:text-primary border-border-subtle"
            >
              <FileText className="w-3.5 h-3.5 text-amber-signal" />
              <span className="hidden md:inline font-mono">MOSPI BULLETIN</span>
            </Button>
          )}

          {onOpenSimulator && (
            <Button
              variant="outline"
              size="sm"
              onClick={onOpenSimulator}
              className="gap-1.5 text-secondary hover:text-primary border-border-subtle"
            >
              <Sliders className="w-3.5 h-3.5 text-delta-positive" />
              <span className="hidden md:inline font-mono">POLICY SIMULATOR</span>
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={onToggleAudio}
            title={audioEnabled ? 'Mute Mechanical Flap Sounds' : 'Enable Mechanical Flap Sounds'}
            className="text-secondary"
          >
            {audioEnabled ? (
              <>
                <Volume2 className="w-3.5 h-3.5 text-amber-signal" />
                <span className="hidden xl:inline">AUDIO ON</span>
              </>
            ) : (
              <>
                <VolumeX className="w-3.5 h-3.5 text-secondary-muted" />
                <span className="hidden xl:inline">AUDIO OFF</span>
              </>
            )}
          </Button>

          <TerminalBadge variant="default" size="sm" className="hidden 2xl:inline-flex">
            <Activity className="w-3 h-3 text-delta-positive mr-1" />
            FEED: ACTIVE
          </TerminalBadge>
        </div>
      </div>
    </header>
  );
}
