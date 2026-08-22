'use client';

import * as React from 'react';
import { Panel, PanelHeader, PanelContent } from '@/components/ui/panel';
import { Button } from '@/components/ui/button';
import { DeltaBadge } from '@/components/ui/delta-badge';
import { TerminalBadge } from '@/components/ui/terminal-badge';
import { SplitFlapDisplay } from '@/components/ui/split-flap';
import { SectionHeader } from '@/components/ui/section-header';
import { Copy, Check, Terminal, Play, Sparkles } from 'lucide-react';

export function DesignSystemPreview({ audioEnabled }: { audioEnabled: boolean }) {
  const [customFlapText, setCustomFlapText] = React.useState<string>('INDIGO 6E-204');
  const [copiedToken, setCopiedToken] = React.useState<string | null>(null);

  const tokens = [
    { name: 'Background (Ink)', hex: '#0E1420', usage: 'Canvas, background root', class: 'bg-ink' },
    { name: 'Surface (Panel)', hex: '#161D2C', usage: 'Card surfaces, table containers', class: 'bg-surface' },
    { name: 'Surface (Elevated)', hex: '#1E273A', usage: 'Modals, popovers, active tabs', class: 'bg-surface-elevated' },
    { name: 'Text Primary', hex: '#F5F3EE', usage: 'Headings, primary numbers', class: 'text-primary' },
    { name: 'Text Secondary', hex: '#9AA1B2', usage: 'Subtitles, column labels', class: 'text-secondary' },
    { name: 'Accent (Signal Amber)', hex: '#E8A33D', usage: 'Runway lighting, key indicators', class: 'bg-amber-signal text-ink' },
    { name: 'Positive Delta (Fare Down)', hex: '#4FA98C', usage: 'Deflation / passenger savings', class: 'bg-delta-positive text-ink' },
    { name: 'Negative Delta (Fare Up)', hex: '#D9634A', usage: 'Price surge / inflation warning', class: 'bg-delta-negative text-ink' },
  ];

  const handleCopy = (hex: string) => {
    navigator.clipboard?.writeText(hex);
    setCopiedToken(hex);
    setTimeout(() => setCopiedToken(null), 1500);
  };

  return (
    <div className="space-y-8">
      <SectionHeader
        kicker="[SYSTEM // 05 DESIGN SYSTEM]"
        title="APIx Terminal Design System & Primitives"
        description="Opinionated data-instrument aesthetics inspired by airport departure boards and financial index terminals. Pure monospace numerals, high-contrast tokens, zero emoji, zero generic SaaS gradients."
      />

      {/* 1. Tokens Section */}
      <Panel variant="default">
        <PanelHeader
          kicker="[TOKENS // COLOR PALETTE]"
          title="Core Token System & Contrast Values"
          statusDot="amber"
        />
        <PanelContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {tokens.map((token) => (
              <div
                key={token.hex}
                className="p-3 bg-surface-subtle border border-border-subtle rounded flex flex-col justify-between gap-3"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded border border-white/10 shrink-0 shadow-inner flex items-center justify-center font-mono text-[10px] font-bold"
                    style={{ backgroundColor: token.hex }}
                  />
                  <div className="min-w-0">
                    <h4 className="font-display text-xs font-semibold text-primary truncate">
                      {token.name}
                    </h4>
                    <p className="text-[11px] font-mono text-secondary-muted truncate">
                      {token.usage}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-border-subtle/50 font-mono text-xs">
                  <span className="text-primary font-semibold">{token.hex}</span>
                  <button
                    onClick={() => handleCopy(token.hex)}
                    className="text-secondary hover:text-amber-signal flex items-center gap-1 text-[11px]"
                  >
                    {copiedToken === token.hex ? (
                      <>
                        <Check className="w-3 h-3 text-delta-positive" />
                        <span className="text-delta-positive">COPIED</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>COPY</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </PanelContent>
      </Panel>

      {/* 2. Signature Split-Flap Board Showcase */}
      <Panel variant="highlight">
        <PanelHeader
          kicker="[SIGNATURE COMPONENT]"
          title="Solari Split-Flap Animated Numeral Display"
          statusDot="amber"
        />
        <PanelContent className="space-y-6">
          <div className="bg-surface-subtle/60 p-4 rounded border border-border-subtle flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex-1">
              <label className="block text-xs font-mono text-secondary-muted uppercase tracking-wider mb-1">
                Enter Custom Text or Number to Flip:
              </label>
              <input
                type="text"
                value={customFlapText}
                onChange={(e) => setCustomFlapText(e.target.value.toUpperCase())}
                placeholder="TYPE TO TEST FLAP..."
                className="w-full bg-[#090D15] border border-border-subtle focus:border-amber-signal text-primary font-mono text-sm px-3 py-2 rounded focus:outline-none uppercase"
                maxLength={18}
              />
            </div>
            <div className="flex items-center gap-2 self-end">
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  const demoOptions = ['APIX 109.45', 'DEL-BOM SURGE', 'FLT AI-102', 'BASKET 100.0', 'T+1 INR 8400'];
                  const next = demoOptions[Math.floor(Math.random() * demoOptions.length)];
                  setCustomFlapText(next);
                }}
              >
                <Sparkles className="w-3 h-3 mr-1" />
                SAMPLE PRESET
              </Button>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <span className="font-mono text-xs text-secondary-muted block mb-2">
                HERO SIZE (Homepage Headline APIx):
              </span>
              <SplitFlapDisplay
                value={customFlapText}
                size="hero"
                enableAudio={audioEnabled}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div>
                <span className="font-mono text-xs text-secondary-muted block mb-2">
                  LARGE SIZE (Route Highlights):
                </span>
                <SplitFlapDisplay
                  value={customFlapText.slice(0, 10)}
                  size="lg"
                  enableAudio={audioEnabled}
                />
              </div>
              <div>
                <span className="font-mono text-xs text-secondary-muted block mb-2">
                  MEDIUM SIZE (Table / Card Badges):
                </span>
                <SplitFlapDisplay
                  value={customFlapText.slice(0, 10)}
                  size="md"
                  enableAudio={audioEnabled}
                />
              </div>
            </div>
          </div>
        </PanelContent>
      </Panel>

      {/* 3. Button & Badge Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Buttons */}
        <Panel variant="default">
          <PanelHeader
            kicker="[BUTTONS // INTERACTIVE]"
            title="Terminal Button Variants & States"
          />
          <PanelContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Button variant="primary">PRIMARY AMBER</Button>
              <Button variant="secondary">SECONDARY PANEL</Button>
              <Button variant="outline">OUTLINE HAIRLINE</Button>
              <Button variant="ghost">GHOST TERMINAL</Button>
              <Button variant="danger">SURGE ALERT</Button>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border-subtle/50">
              <Button variant="secondary" size="xs">SIZE XS</Button>
              <Button variant="secondary" size="sm">SIZE SM</Button>
              <Button variant="secondary" size="md">SIZE MD</Button>
              <Button variant="secondary" size="lg">SIZE LG</Button>
              <Button variant="secondary" size="sm" active indicatorDot>ACTIVE LED</Button>
            </div>
          </PanelContent>
        </Panel>

        {/* Delta Badges & Terminal Badges */}
        <Panel variant="default">
          <PanelHeader
            kicker="[INDICATORS // SEMANTICS]"
            title="Delta Badges & Economic Direction"
          />
          <PanelContent className="space-y-4">
            <div>
              <span className="font-mono text-[11px] text-secondary-muted block mb-1.5">
                MOSPI CPI AUGMENTATION SEMANTICS (Fare drop = Green, Surge = Red):
              </span>
              <div className="flex flex-wrap gap-2">
                <DeltaBadge value={4.85} size="md" prefix="SURGE " />
                <DeltaBadge value={1.42} size="sm" />
                <DeltaBadge value={-2.15} size="sm" />
                <DeltaBadge value={-6.80} size="md" prefix="EASED " />
                <DeltaBadge value={0.00} size="sm" />
              </div>
            </div>

            <div className="pt-2 border-t border-border-subtle/50">
              <span className="font-mono text-[11px] text-secondary-muted block mb-1.5">
                TERMINAL STATUS BADGES:
              </span>
              <div className="flex flex-wrap gap-2">
                <TerminalBadge variant="default" dot>DEFAULT</TerminalBadge>
                <TerminalBadge variant="amber" dot>RUNWAY AMBER</TerminalBadge>
                <TerminalBadge variant="green" dot>HEALTH NOMINAL</TerminalBadge>
                <TerminalBadge variant="red" dot>OUTLIER DETECTED</TerminalBadge>
                <TerminalBadge variant="outline">ROBOTS.TXT STRICT</TerminalBadge>
              </div>
            </div>
          </PanelContent>
        </Panel>
      </div>

      {/* 4. Typography & Monospace Verification */}
      <Panel variant="default">
        <PanelHeader
          kicker="[TYPOGRAPHY // COMPLIANCE]"
          title="Strict Typography Roles & Numeral Verification"
        />
        <PanelContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2 p-3 bg-surface-subtle rounded border border-border-subtle">
              <span className="font-mono text-xs text-amber-signal uppercase font-bold">
                01. Geometric Display Grotesk
              </span>
              <h3 className="font-display text-xl font-bold text-primary">
                National Airfare Price Index
              </h3>
              <p className="text-xs text-secondary">
                Used strictly for main titles, instrument names, and section headers.
              </p>
            </div>

            <div className="space-y-2 p-3 bg-surface-subtle rounded border border-border-subtle">
              <span className="font-mono text-xs text-amber-signal uppercase font-bold">
                02. Humanist Sans (Inter)
              </span>
              <p className="text-sm font-sans text-primary">
                The Laspeyres weighted index computes representative daily fares across T+1..T+45 windows.
              </p>
              <p className="text-xs text-secondary">
                Used for descriptive body paragraphs and UI helper labels.
              </p>
            </div>

            <div className="space-y-2 p-3 bg-surface-subtle rounded border border-border-subtle">
              <span className="font-mono text-xs text-amber-signal uppercase font-bold">
                03. JetBrains Mono (Strict Numeral Rule)
              </span>
              <div className="font-mono text-sm text-primary font-bold space-y-1">
                <div>APIX: 104.82 · DEL-BOM: ₹5,450</div>
                <div>24H: +1.42% · WEIGHT: 18.5%</div>
                <div>06:00:00 IST · CODE: 6E-204</div>
              </div>
              <p className="text-xs text-secondary">
                All numbers, currencies, route codes, and percentages must use this face.
              </p>
            </div>
          </div>
        </PanelContent>
      </Panel>
    </div>
  );
}
