'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { ChevronDown, ChevronUp, ChevronsUpDown, AlertCircle, Database } from 'lucide-react';

export interface ColumnDef<T> {
  id: string;
  header: string | React.ReactNode;
  accessorKey?: keyof T;
  cell?: (row: T, index: number) => React.ReactNode;
  align?: 'left' | 'center' | 'right';
  width?: string;
  sortable?: boolean;
  monoHeader?: boolean;
}

export interface DataTableProps<T> {
  columns: ColumnDef<T>[];
  data: T[];
  keyExtractor: (item: T, index: number) => string;
  className?: string;
  dense?: boolean;
  hoverable?: boolean;
  emptyTitle?: string;
  emptyMessage?: string;
  onRowClick?: (item: T) => void;
}

export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  className,
  dense = true,
  hoverable = true,
  emptyTitle = 'NO ACTIVE CORRIDOR OBSERVATIONS RECORDED',
  emptyMessage = "No flight quotes match the selected filter criteria. To ingest new data, execute 'npm run scrape' and 'npm run clean' in your terminal.",
  onRowClick,
}: DataTableProps<T>) {
  const [sortColumn, setSortColumn] = React.useState<string | null>(null);
  const [sortDirection, setSortDirection] = React.useState<'asc' | 'desc'>('asc');

  const handleSort = (columnId: string, sortable?: boolean) => {
    if (!sortable) return;
    if (sortColumn === columnId) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else {
        setSortColumn(null);
        setSortDirection('asc');
      }
    } else {
      setSortColumn(columnId);
      setSortDirection('asc');
    }
  };

  const sortedData = React.useMemo(() => {
    if (!sortColumn) return data;
    const col = columns.find((c) => c.id === sortColumn);
    if (!col || !col.accessorKey) return data;

    return [...data].sort((a, b) => {
      const aVal = a[col.accessorKey as keyof T];
      const bVal = b[col.accessorKey as keyof T];

      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
      }
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDirection === 'asc'
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }
      return 0;
    });
  }, [data, sortColumn, sortDirection, columns]);

  return (
    <div
      className={cn(
        'w-full overflow-x-auto border border-border-subtle rounded bg-surface shadow-panel',
        className
      )}
    >
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-border-subtle bg-surface-subtle/80 text-secondary-muted font-mono text-[11px] uppercase tracking-wider select-none">
            {columns.map((col) => {
              const isSorted = sortColumn === col.id;
              return (
                <th
                  key={col.id}
                  style={{ width: col.width }}
                  onClick={() => handleSort(col.id, col.sortable)}
                  onKeyDown={(e) => {
                    if (col.sortable && (e.key === 'Enter' || e.key === ' ')) {
                      e.preventDefault();
                      handleSort(col.id, col.sortable);
                    }
                  }}
                  tabIndex={col.sortable ? 0 : undefined}
                  className={cn(
                    'font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-amber-signal',
                    dense ? 'px-3 py-2.5' : 'px-4 py-3.5',
                    col.align === 'right' && 'text-right',
                    col.align === 'center' && 'text-center',
                    col.sortable && 'cursor-pointer hover:text-primary hover:bg-surface-elevated/40'
                  )}
                >
                  <div
                    className={cn(
                      'inline-flex items-center gap-1.5',
                      col.align === 'right' && 'justify-end',
                      col.align === 'center' && 'justify-center'
                    )}
                  >
                    <span>{col.header}</span>
                    {col.sortable && (
                      <span className="text-secondary-muted shrink-0">
                        {isSorted ? (
                          sortDirection === 'asc' ? (
                            <ChevronUp className="w-3 h-3 text-amber-signal" />
                          ) : (
                            <ChevronDown className="w-3 h-3 text-amber-signal" />
                          )
                        ) : (
                          <ChevronsUpDown className="w-3 h-3 opacity-40 hover:opacity-100" />
                        )}
                      </span>
                    )}
                  </div>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody className="divide-y divide-border-subtle/40 text-xs text-primary">
          {sortedData.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-6 py-12 text-center bg-surface-subtle/20">
                <div className="flex flex-col items-center justify-center gap-2.5 max-w-md mx-auto">
                  <div className="w-9 h-9 rounded-full bg-surface-elevated flex items-center justify-center border border-border-subtle text-amber-signal">
                    <Database className="w-4 h-4" />
                  </div>
                  <div className="font-mono text-xs font-bold text-primary tracking-wider uppercase">
                    {emptyTitle}
                  </div>
                  <p className="font-mono text-[11px] text-secondary leading-relaxed">
                    {emptyMessage}
                  </p>
                </div>
              </td>
            </tr>
          ) : (
            sortedData.map((row, index) => (
              <tr
                key={keyExtractor(row, index)}
                onClick={() => onRowClick?.(row)}
                className={cn(
                  'transition-colors duration-100',
                  hoverable && 'hover:bg-surface-elevated/60',
                  onRowClick && 'cursor-pointer',
                  index % 2 === 1 ? 'bg-surface/30' : 'bg-surface'
                )}
              >
                {columns.map((col) => {
                  let content: React.ReactNode = null;
                  if (col.cell) {
                    content = col.cell(row, index);
                  } else if (col.accessorKey) {
                    const raw = row[col.accessorKey];
                    content = typeof raw === 'number' || typeof raw === 'string' ? raw : null;
                  }

                  return (
                    <td
                      key={col.id}
                      className={cn(
                        dense ? 'px-3 py-2.5' : 'px-4 py-3',
                        col.align === 'right' && 'text-right font-mono',
                        col.align === 'center' && 'text-center',
                        col.align === 'left' && 'text-left'
                      )}
                    >
                      {content}
                    </td>
                  );
                })}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
