'use client';

import * as React from 'react';
import { TerminalHeader } from '@/components/layout/terminal-header';
import { IndexOverview } from '@/components/dashboard/index-overview';
import { RouteHeatmap } from '@/components/dashboard/route-heatmap';
import { ElasticityView } from '@/components/dashboard/elasticity-view';
import { ValidationView } from '@/components/dashboard/validation-view';
import { MethodologyView } from '@/components/dashboard/methodology-view';
import { ApiDocsView } from '@/components/dashboard/api-docs-view';
import { DesignSystemPreview } from '@/components/dashboard/design-system-preview';
import { CURRENT_LIVE_INDEX } from '@/lib/mock-data';

export default function HomePage() {
  const [activeTab, setActiveTab] = React.useState<string>('overview');
  const [audioEnabled, setAudioEnabled] = React.useState<boolean>(false);

  return (
    <div className="min-h-screen flex flex-col bg-ink terminal-grid selection:bg-amber-signal/20 selection:text-amber-signal">
      {/* Terminal Top Navigation Header */}
      <TerminalHeader
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        audioEnabled={audioEnabled}
        onToggleAudio={() => setAudioEnabled((prev) => !prev)}
      />

      {/* Main Terminal Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        {activeTab === 'overview' && (
          <IndexOverview
            currentIndex={CURRENT_LIVE_INDEX}
            audioEnabled={audioEnabled}
          />
        )}

        {activeTab === 'routes' && <RouteHeatmap />}

        {activeTab === 'elasticity' && <ElasticityView />}

        {activeTab === 'validation' && <ValidationView />}

        {activeTab === 'methodology' && (
          <MethodologyView
            methodologyNotes={CURRENT_LIVE_INDEX.methodology_notes}
          />
        )}

        {activeTab === 'api-docs' && <ApiDocsView />}

        {activeTab === 'design-system' && (
          <DesignSystemPreview audioEnabled={audioEnabled} />
        )}
      </main>

      {/* Terminal Footer */}
      <footer className="border-t border-border-subtle bg-ink py-4 px-6 text-center text-xs font-mono text-secondary-muted mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>APIx · SMART INDIA HACKATHON 2026 · PROBLEM STATEMENT 26056 · MoSPI / DIID</span>
          <div className="flex items-center gap-4 text-[11px]">
            <span>DGCA EMPIRICALLY VALIDATED (r = 0.968)</span>
            <span className="text-border-subtle">|</span>
            <span className="text-amber-signal">LASPEYRES WEIGHTED BASELINE (JAN 2026 = 100.00)</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
