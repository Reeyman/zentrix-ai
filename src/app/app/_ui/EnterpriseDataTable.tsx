'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Search,
  X,
} from 'lucide-react';
import { ActionToast } from './Primitives';

export interface EnterpriseColumn<T> {
  id: string;
  header: string;
  cell: (row: T) => React.ReactNode;
  sortValue?: (row: T) => string | number;
  align?: 'left' | 'right';
  className?: string;
  headerClassName?: string;
}

export interface EnterpriseFilter<T> {
  id: string;
  label: string;
  options: Array<{ label: string; value: string }>;
  getValue: (row: T) => string;
}

export interface EnterpriseView<T> {
  id: string;
  label: string;
  predicate?: (row: T) => boolean;
}

export interface EnterpriseRowAction<T> {
  label: string;
  tone?: 'primary' | 'ghost';
  closeOnClick?: boolean;
  pendingLabel?: string;
  onClick: (row: T) => string | void | Promise<string | void>;
}

type SortState = {
  columnId: string;
  direction: 'asc' | 'desc';
};

type Props<T extends { id: string }> = {
  data: T[];
  columns: EnterpriseColumn<T>[];
  loading?: boolean;
  searchPlaceholder?: string;
  searchFields?: Array<(row: T) => string>;
  filters?: EnterpriseFilter<T>[];
  views?: EnterpriseView<T>[];
  defaultViewId?: string;
  pageSize?: number;
  emptyTitle?: string;
  emptyMessage?: string;
  defaultSort?: SortState;
  renderDetail?: (row: T) => React.ReactNode;
  detailTitle?: (row: T) => string;
  detailSubtitle?: (row: T) => string;
  rowActions?: EnterpriseRowAction<T>[];
};

export default function EnterpriseDataTable<T extends { id: string }>({
  data,
  columns,
  loading = false,
  searchPlaceholder = 'Search records',
  searchFields,
  filters = [],
  views = [],
  defaultViewId,
  pageSize = 5,
  emptyTitle = 'No records found',
  emptyMessage = 'Try adjusting filters or search terms.',
  defaultSort,
  renderDetail,
  detailTitle,
  detailSubtitle,
  rowActions = [],
}: Props<T>) {
  const defaultView = defaultViewId ?? views[0]?.id ?? 'all';
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedViewId, setSelectedViewId] = useState(defaultView);
  const [filterValues, setFilterValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(filters.map((filter) => [filter.id, 'all'])),
  );
  const [page, setPage] = useState(1);
  const [sortState, setSortState] = useState<SortState | undefined>(defaultSort);
  const [activeRowId, setActiveRowId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | undefined>();
  const [activeActionId, setActiveActionId] = useState<string | null>(null);

  useEffect(() => {
    setFilterValues(Object.fromEntries(filters.map((filter) => [filter.id, 'all'])));
  }, [filters]);

  useEffect(() => {
    setPage(1);
  }, [searchTerm, selectedViewId, filterValues, sortState]);

  const filteredRows = useMemo(() => {
    const activeView = views.find((view) => view.id === selectedViewId);
    const normalizedSearch = searchTerm.trim().toLowerCase();

    const searched = data.filter((row) => {
      if (activeView?.predicate && !activeView.predicate(row)) {
        return false;
      }

      const matchesFilters = filters.every((filter) => {
        const selectedValue = filterValues[filter.id];
        if (!selectedValue || selectedValue === 'all') {
          return true;
        }

        return filter.getValue(row).toLowerCase() === selectedValue.toLowerCase();
      });

      if (!matchesFilters) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      const haystack = searchFields?.length
        ? searchFields.map((field) => field(row)).join(' ').toLowerCase()
        : JSON.stringify(row).toLowerCase();

      return haystack.includes(normalizedSearch);
    });

    if (!sortState) {
      return searched;
    }

    const sortableColumn = columns.find((column) => column.id === sortState.columnId);
    if (!sortableColumn?.sortValue) {
      return searched;
    }

    return [...searched].sort((left, right) => {
      const leftValue = sortableColumn.sortValue?.(left);
      const rightValue = sortableColumn.sortValue?.(right);

      if (typeof leftValue === 'number' && typeof rightValue === 'number') {
        return sortState.direction === 'asc' ? leftValue - rightValue : rightValue - leftValue;
      }

      return sortState.direction === 'asc'
        ? String(leftValue).localeCompare(String(rightValue))
        : String(rightValue).localeCompare(String(leftValue));
    });
  }, [columns, data, filterValues, filters, searchFields, searchTerm, selectedViewId, sortState, views]);

  const pageCount = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const paginatedRows = filteredRows.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const activeRow = data.find((row) => row.id === activeRowId) ?? null;
  const hasActiveControls =
    searchTerm.trim().length > 0 ||
    filters.some((filter) => filterValues[filter.id] && filterValues[filter.id] !== 'all') ||
    selectedViewId !== defaultView;

  function handleSort(column: EnterpriseColumn<T>) {
    if (!column.sortValue) {
      return;
    }

    setSortState((current) => {
      if (!current || current.columnId !== column.id) {
        return { columnId: column.id, direction: 'asc' };
      }

      return {
        columnId: column.id,
        direction: current.direction === 'asc' ? 'desc' : 'asc',
      };
    });
  }

  function resetControls() {
    setSearchTerm('');
    setSelectedViewId(defaultView);
    setFilterValues(Object.fromEntries(filters.map((filter) => [filter.id, 'all'])));
    setSortState(defaultSort);
  }

  function renderSortIcon(column: EnterpriseColumn<T>) {
    if (!column.sortValue) {
      return null;
    }

    if (sortState?.columnId !== column.id) {
      return <ArrowUpDown size={12} />;
    }

    return sortState.direction === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />;
  }

  async function handleRowAction(action: EnterpriseRowAction<T>, row: T) {
    const actionId = `${row.id}:${action.label}`;

    try {
      setActiveActionId(actionId);
      const result = await Promise.resolve(action.onClick(row));

      if (result) {
        setToastMessage(result);
      }

      if (action.closeOnClick) {
        setActiveRowId(null);
      }
    } catch (error) {
      setToastMessage(error instanceof Error ? error.message : 'Failed to complete action');
    } finally {
      setActiveActionId(null);
    }
  }

  return (
    <>
      <div className="enterprise-table-shell">
        <div className="enterprise-table-toolbar">
          <div className="enterprise-table-toolbar-left">
            {views.length ? (
              <select
                className="input enterprise-table-control"
                value={selectedViewId}
                onChange={(event) => setSelectedViewId(event.target.value)}
              >
                {views.map((view) => (
                  <option key={view.id} value={view.id}>
                    {view.label}
                  </option>
                ))}
              </select>
            ) : null}

            <div className="enterprise-table-search">
              <Search className="enterprise-table-search-icon" size={15} strokeWidth={1.8} />
              <input
                className="input enterprise-table-search-input"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder={searchPlaceholder}
              />
            </div>

            {filters.map((filter) => (
              <select
                key={filter.id}
                className="input enterprise-table-control"
                value={filterValues[filter.id] ?? 'all'}
                onChange={(event) =>
                  setFilterValues((current) => ({
                    ...current,
                    [filter.id]: event.target.value,
                  }))
                }
              >
                <option value="all">All {filter.label}</option>
                {filter.options.map((option) => (
                  <option key={`${filter.id}-${option.value}`} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            ))}
          </div>

          <div className="enterprise-table-toolbar-right">
            <span className="enterprise-table-count">{filteredRows.length} results</span>
            {hasActiveControls ? (
              <button className="btn" onClick={resetControls}>
                Reset
              </button>
            ) : null}
          </div>
        </div>

        {loading ? (
          <DataTableSkeleton columns={columns.length} />
        ) : filteredRows.length === 0 ? (
          <div className="enterprise-empty-state">
            <div className="enterprise-empty-eyebrow">No matching data</div>
            <div className="enterprise-empty-title">{emptyTitle}</div>
            <div className="enterprise-empty-copy">{emptyMessage}</div>
          </div>
        ) : (
          <>
            <div className="table-wrapper enterprise-table-wrapper">
              <table className="table enterprise-table">
                <thead>
                  <tr>
                    {columns.map((column) => (
                      <th
                        key={column.id}
                        className={`${column.headerClassName ?? ''} ${column.align === 'right' ? 'td-right' : ''}`.trim()}
                      >
                        {column.sortValue ? (
                          <button className="table-sort-button" onClick={() => handleSort(column)}>
                            <span>{column.header}</span>
                            {renderSortIcon(column)}
                          </button>
                        ) : (
                          column.header
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paginatedRows.map((row) => (
                    <tr
                      key={row.id}
                      className={renderDetail ? 'table-row-clickable' : ''}
                      onClick={() => {
                        if (renderDetail) {
                          setActiveRowId(row.id);
                        }
                      }}
                    >
                      {columns.map((column) => (
                        <td
                          key={`${row.id}-${column.id}`}
                          className={`${column.className ?? ''} ${column.align === 'right' ? 'td-right' : ''}`.trim()}
                        >
                          {column.cell(row)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="enterprise-table-footer">
              <div className="enterprise-table-page-copy">
                Showing {Math.min((currentPage - 1) * pageSize + 1, filteredRows.length)}-
                {Math.min(currentPage * pageSize, filteredRows.length)} of {filteredRows.length}
              </div>
              <div className="enterprise-table-pagination">
                <button
                  className="btn btn-ghost topbar-icon-button"
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft size={14} />
                </button>
                <span className="enterprise-table-page-indicator">
                  Page {currentPage} of {pageCount}
                </span>
                <button
                  className="btn btn-ghost topbar-icon-button"
                  onClick={() => setPage((current) => Math.min(pageCount, current + 1))}
                  disabled={currentPage === pageCount}
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {activeRow && renderDetail ? (
        <>
          <button className="detail-drawer-backdrop" onClick={() => setActiveRowId(null)} aria-label="Close details" />
          <aside className="detail-drawer" aria-label="Record details">
            <div className="detail-drawer-header">
              <div>
                <div className="detail-drawer-eyebrow">Record details</div>
                <h3 className="detail-drawer-title">
                  {detailTitle ? detailTitle(activeRow) : 'Selection details'}
                </h3>
                {detailSubtitle ? <p className="detail-drawer-subtitle">{detailSubtitle(activeRow)}</p> : null}
              </div>
              <button className="detail-drawer-close" onClick={() => setActiveRowId(null)}>
                <X size={16} />
              </button>
            </div>

            <div className="detail-drawer-body">{renderDetail(activeRow)}</div>

            {rowActions.length ? (
              <div className="detail-drawer-actions">
                {rowActions.map((action) => (
                  <button
                    key={action.label}
                    className={action.tone === 'primary' ? 'btn btn-primary' : 'btn'}
                    disabled={activeActionId !== null}
                    onClick={() => {
                      void handleRowAction(action, activeRow);
                    }}
                  >
                    {activeActionId === `${activeRow.id}:${action.label}` ? action.pendingLabel ?? 'Working...' : action.label}
                  </button>
                ))}
              </div>
            ) : null}
          </aside>
        </>
      ) : null}

      <ActionToast message={toastMessage} onDismiss={() => setToastMessage(undefined)} />
    </>
  );
}

function DataTableSkeleton({ columns }: { columns: number }) {
  return (
    <div className="enterprise-table-skeleton">
      {[...Array(5)].map((_, rowIndex) => (
        <div key={rowIndex} className="enterprise-table-skeleton-row">
          {[...Array(columns)].map((__, colIndex) => (
            <div key={colIndex} className="enterprise-table-skeleton-cell" />
          ))}
        </div>
      ))}
    </div>
  );
}
