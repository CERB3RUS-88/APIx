'use client';

import * as React from 'react';
import { TerminalHeader } from '@/components/layout/terminal-header';
import { ValidationView } from '@/components/dashboard/validation-view';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function ValidationPage() {
  const [audioEnabled, setAudioEnabled] = React.useState<boolean>(false);
  const [daysCount, setDaysCount] = React.useState<number>(2);

  React.useEffect(() => {
    fetch('/api/latest')
      .then((res) => res.json())
      .then((json) => {
        if (json.data?.current_index?.distinct_dates_count) {
          setDaysCount(json.data.current_index.distinct_dates_count);
        }
      })
      .catch(() => {});
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-ink terminal-grid selection:bg-amber-signal/20 selection:text-amber-signal">
      <TerminalHeader
        activeTab="validation"
        onSelectTab={(tab) => {
          if (tab !== 'validation') {
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

        <ValidationView initialDatesCount={daysCount} />
      </main>

      <footer className="border-t border-border-subtle bg-ink py-4 px-6 text-center text-xs font-mono text-secondary-muted mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>APIx · SMART INDIA HACKATHON 2026 · PS 26056 · MoSPI / DIID</span>
          <div className="flex items-center gap-4 text-[11px]">
            <span>DGCA GROUND TRUTH VALIDATION</span>
            <span className="text-border-subtle">|</span>
            <span className="text-amber-signal">
              VALIDATION PENDING ({daysCount} {daysCount === 1 ? 'DAY' : 'DAYS'} LIVE DATA COLLECTED)
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
