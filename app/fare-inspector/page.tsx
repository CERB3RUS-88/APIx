'use client';

import * as React from 'react';
import { TerminalHeader } from '@/components/layout/terminal-header';
import { FareInspectorView } from '@/components/dashboard/fare-inspector-view';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function FareInspectorPage() {
  const [audioEnabled, setAudioEnabled] = React.useState<boolean>(false);

  return (
    <div className="min-h-screen flex flex-col bg-ink terminal-grid selection:bg-amber-signal/20 selection:text-amber-signal">
      <TerminalHeader
        activeTab="fare-inspector"
        onSelectTab={(tab) => {
          if (tab !== 'fare-inspector') {
            window.location.href = `/?tab=${tab}`;
          }
        }}
        audioEnabled={audioEnabled}
        onToggleAudio={() => setAudioEnabled((prev) => !prev)}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        <div className="flex items-center justify-between">
          <Link href="/">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-3.5 h-3.5 mr-1" />
              BACK TO TERMINAL DASHBOARD
            </Button>
          </Link>
        </div>

        <FareInspectorView />
      </main>

      <footer className="border-t border-border-subtle bg-ink py-4 px-6 text-center text-xs font-mono text-secondary-muted mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>APIx · SMART INDIA HACKATHON 2026 · PS 26056 · MoSPI / DIID</span>
          <div className="flex items-center gap-4 text-[11px]">
            <span>MICRO-DATA AUDIT LEDGER</span>
            <span className="text-border-subtle">|</span>
            <span className="text-amber-signal">ROBOTS.TXT COMPLIANT LIVE HARVEST</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
