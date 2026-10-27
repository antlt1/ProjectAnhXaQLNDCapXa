import { Fragment, useEffect, useState } from 'react';
import { api } from '../api';
import type { LogsResponse, MapLog } from '../types';
import { formatDateTime, prettyJson } from '../format';
import { Badge } from './Badge';
import {
  ArrowRightIcon,
  ChevronRightIcon,
  InfoIcon,
  RefreshIcon,
  SearchIcon,
} from './icons';
import { Pagination } from './Pagination';
import { useDebounced } from '../hooks/useDebounced';

const DEFAULT_PAGE_SIZE = 20;

function LogDetail({ log }: { log: MapLog }) {
  const details = prettyJson(log.detailsJson);

  return (
    <div className="log-expanded">
      <div className="log-expanded-grid">
        <div>
          <span className="detail-label">Batch</span>
          <span className="mono small-text">{log.batchId}</span>
        </div>
        <div>
          <span className="detail-label">TempId</span>
          <span className="mono small-text">{log.tempId}</span>
        </div>
        <div>
          <span className="detail-label">Bảng nguồn</span>
          <span>
            {log.personalTable} · {log.personalKey}
          </span>
        </div>
        <div>
          <span className="detail-label">File / Sheet</span>
          <span>
            {log.fileName ?? '—'}
            {log.sheetName ? ` · ${log.sheetName}` : ''}
          </span>
        </div>
        <div>
          <span className="detail-label">Người nhập</span>
          <span>{log.importedBy ?? '—'}</span>
        </div>
        <div>
          <span className="detail-label">Thời điểm nhập</span>
          <span>{formatDateTime(log.importedAt)}</span>
        </div>
      </div>

      <div className="log-expanded-flags">
        <Badge tone={log.cccdChanged ? 'info' : 'neutral'} dot={false}>
          CccdChanged: {log.cccdChanged ? 'true' : 'false'}
        </Badge>
        <Badge tone={log.bhytChanged ? 'violet' : 'neutral'} dot={false}>
          BhytChanged: {log.bhytChanged ? 'true' : 'false'}
        </Badge>
      </div>

      {details ? (
        <pre className="json-block">{details}</pre>
      ) : (
        <p className="muted-small">Không có DetailsJson.</p>
      )}
    </div>
  );
}

export function LogsPanel() {
  const [q, setQ] = useState('');
  const debouncedQ = useDebounced(q, 350);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [data, setData] = useState<LogsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    setPage(1);
  }, [debouncedQ, pageSize]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');

    api
      .logs(debouncedQ, page, pageSize, controller.signal)
      .then((result) => setData(result))
      .catch((err: Error) => {
        if (err.name !== 'AbortError') setError(err.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [debouncedQ, page, pageSize, reloadKey]);

  return (
    <section className="logs-view">
      <div className="view-heading">
        <div>
          <span className="eyebrow">Personal_CccdMapLog</span>
          <h1>Nhật ký ánh xạ CCCD &amp; BHYT</h1>
          <p>
            Lịch sử đổi số CCCD/BHYT theo từng lần nhập MIS. Bảng log không có khóa ngoại, dữ liệu
            được đối chiếu theo <code>PersonalKey</code> và số CCCD.
          </p>
        </div>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => setReloadKey((key) => key + 1)}
          disabled={loading}
        >
          <RefreshIcon size={16} />
          Làm mới
        </button>
      </div>

      <div className="toolbar">
        <div className="search-box">
          <SearchIcon size={18} />
          <input
            type="search"
            value={q}
            onChange={(event) => setQ(event.target.value)}
            placeholder="Tìm theo CCCD, PersonalKey, người đổi, tên file…"
            aria-label="Tìm nhật ký ánh xạ"
          />
        </div>
        <span className="toolbar-count">
          {data ? `${data.total} bản ghi` : loading ? 'Đang tải…' : '—'}
        </span>
      </div>

      {error && (
        <div className="alert alert-danger">
          <InfoIcon />
          <div>
            <strong>Không tải được nhật ký</strong>
            <p>{error}</p>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setReloadKey((key) => key + 1)}
            >
              Thử lại
            </button>
          </div>
        </div>
      )}

      <div className={`table-card ${loading && data ? 'is-loading' : ''}`}>
        <div className="table-scroll">
          <table className="data-table logs-table">
            <thead>
              <tr>
                <th>Thời gian</th>
                <th>Đối tượng / Batch</th>
                <th>Thay đổi CCCD · BHYT</th>
                <th aria-label="Chi tiết" />
              </tr>
            </thead>
            <tbody>
              {loading && !data &&
                Array.from({ length: 6 }).map((_, index) => (
                  <tr key={index} className="skeleton-row">
                    <td><span className="skeleton skeleton-line" /></td>
                    <td><span className="skeleton skeleton-line wide" /></td>
                    <td><span className="skeleton skeleton-line wide" /></td>
                    <td />
                  </tr>
                ))}

              {data?.items.map((log) => {
                const expanded = expandedId === log.id;

                return (
                  <Fragment key={log.id}>
                    <tr className="log-row">
                      <td>
                        <div className="code-cell">
                          <span className="log-time">{formatDateTime(log.changedAt)}</span>
                          <span className="muted-small">
                            #{log.id} · {log.changedBy}
                          </span>
                        </div>
                      </td>
                      <td>
                        <div className="code-cell">
                          <span className="mono log-subject">{log.personalKey}</span>
                          <span className="muted-small">{log.personalTable}</span>
                          <span className="muted-small log-file">{log.fileName ?? '—'}</span>
                        </div>
                      </td>
                      <td>
                        <div className="change-stack">
                          <div className="change-inline">
                            <span className="change-label">CCCD</span>
                            <span className={`mono ${log.oldCccd ? 'old-value' : 'muted'}`}>
                              {log.oldCccd ?? '—'}
                            </span>
                            <ArrowRightIcon size={14} />
                            <span className="mono new-value">{log.newCccd ?? '—'}</span>
                          </div>
                          {(log.oldBhyt || log.newBhyt) && (
                            <div className="change-inline">
                              <span className="change-label">BHYT</span>
                              <span className={`mono ${log.oldBhyt ? 'old-value' : 'muted'}`}>
                                {log.oldBhyt ?? '—'}
                              </span>
                              <ArrowRightIcon size={14} />
                              <span className="mono new-value">{log.newBhyt ?? '—'}</span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="align-right">
                        <button
                          type="button"
                          className={`btn btn-icon ${expanded ? 'is-open' : ''}`}
                          onClick={() => setExpandedId(expanded ? null : log.id)}
                          aria-expanded={expanded}
                          aria-label={`Chi tiết log ${log.id}`}
                        >
                          <ChevronRightIcon size={18} />
                        </button>
                      </td>
                    </tr>
                    {expanded && (
                      <tr className="expanded-row">
                        <td colSpan={4}>
                          <LogDetail log={log} />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>

        {!loading && data?.items.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon" aria-hidden="true">⌕</div>
            <h3>Không có bản ghi phù hợp</h3>
            <p>Thử số CCCD, PersonalKey hoặc tên file khác.</p>
          </div>
        )}
      </div>

      {data && data.total > 0 && (
        <Pagination
          page={page}
          pageSize={pageSize}
          total={data.total}
          onPage={setPage}
          onPageSize={setPageSize}
        />
      )}
    </section>
  );
}
