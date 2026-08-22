'use client';

import * as React from 'react';
import { Panel, PanelHeader, PanelContent } from '@/components/ui/panel';
import { Button } from '@/components/ui/button';
import { TerminalBadge } from '@/components/ui/terminal-badge';
import { parseDgcaCsv, DgcaReferenceFareRecord, SAMPLE_DGCA_CSV_TEMPLATE } from '@/lib/validation-data';
import { Upload, Download, FileText, CheckCircle2, AlertTriangle, RefreshCw } from 'lucide-react';

interface CsvImporterProps {
  onImportRecords: (newRecords: DgcaReferenceFareRecord[]) => void;
  onResetToDefault: () => void;
}

export function CsvImporter({ onImportRecords, onResetToDefault }: CsvImporterProps) {
  const [dragActive, setDragActive] = React.useState(false);
  const [importStatus, setImportStatus] = React.useState<{
    success: boolean;
    count?: number;
    errors?: string[];
  } | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const processFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (!text) return;

      const result = parseDgcaCsv(text);
      if (result.success && result.records.length > 0) {
        onImportRecords(result.records);
        setImportStatus({ success: true, count: result.records.length });
      } else {
        setImportStatus({ success: false, errors: result.errors });
      }
    };
    reader.readAsText(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const downloadTemplate = () => {
    const blob = new Blob([SAMPLE_DGCA_CSV_TEMPLATE], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'dgca_reference_fares_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Panel variant="default" className="overflow-hidden">
      <PanelHeader
        kicker="[DATA INGESTION // DGCA BENCHMARK IMPORT]"
        title="Import DGCA Official Monthly Tariff Reports (CSV)"
        statusDot="amber"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="xs" onClick={downloadTemplate}>
              <Download className="w-3.5 h-3.5 mr-1" />
              CSV TEMPLATE
            </Button>
            <Button variant="outline" size="xs" onClick={onResetToDefault}>
              <RefreshCw className="w-3.5 h-3.5 mr-1" />
              RESET DEFAULT
            </Button>
          </div>
        }
      />

      <PanelContent className="p-4 sm:p-6 space-y-4">
        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={handleFileChange}
        />

        {/* Drag & Drop Box */}
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3 ${
            dragActive
              ? 'border-amber-signal bg-amber-signal/10 scale-[0.99]'
              : 'border-border-subtle hover:border-amber-signal/50 bg-surface-subtle/40'
          }`}
        >
          <div className="w-10 h-10 rounded-full bg-surface-elevated flex items-center justify-center border border-border-subtle">
            <Upload className="w-5 h-5 text-amber-signal" />
          </div>
          <div>
            <div className="font-mono text-xs font-semibold text-primary">
              DRAG & DROP DGCA MONTHLY FARE CSV HERE, OR <span className="text-amber-signal underline">BROWSE</span>
            </div>
            <p className="text-[11px] font-sans text-secondary-muted mt-1">
              Expected columns: <code className="font-mono text-primary">month, route_id, dgca_official_fare, source_report_ref</code>
            </p>
          </div>
        </div>

        {/* Import Feedback */}
        {importStatus && (
          <div
            className={`p-3 rounded border font-mono text-xs flex items-start gap-2.5 ${
              importStatus.success
                ? 'bg-delta-positive/10 border-delta-positive/30 text-delta-positive'
                : 'bg-delta-negative/10 border-delta-negative/30 text-delta-negative'
            }`}
          >
            {importStatus.success ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            )}
            <div className="flex-1">
              <div className="font-bold">
                {importStatus.success
                  ? `Successfully ingested ${importStatus.count} DGCA ground-truth records!`
                  : 'Failed to parse CSV file:'}
              </div>
              {importStatus.errors && importStatus.errors.length > 0 && (
                <ul className="list-disc pl-4 text-[11px] mt-1 space-y-0.5 opacity-90">
                  {importStatus.errors.map((err, idx) => (
                    <li key={idx}>{err}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </PanelContent>
    </Panel>
  );
}
