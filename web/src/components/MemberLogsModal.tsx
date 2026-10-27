import { useEffect, useRef, useState } from 'react';
import { api } from '../api';
import type { Member, PersonalLogsResponse } from '../types';
import {
  formatDateTime,
  initials,
  mappingLabel,
  prettyJson,
} from '../format';
import { Badge } from './Badge';
import { ArrowRightIcon, CloseIcon, InfoIcon } from './icons';
import { Pagination } from './Pagination';

const PAGE_SIZE = 10;

interface MemberLogsModalProps {
  member: Member;
  onClose: () => void;
}

export function MemberLogsModal({ member, onClose }: MemberLogsModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState(1);
  const [data, setData] = useState<PersonalLogsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');

    api
      .personalLogs(member.personalId, page, PAGE_SIZE, controller.signal)
      .then((result) => setData(result))
      .catch((err: Error) => {
        if (err.name !== 'AbortError') setError(err.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [member.personalId, page, reloadKey]);

  useEffect(() => {
    modalRef.current?.focus();
  }, []);

  const mapping = mappingLabel(member.cccdMapped);

  return (
    <div
      className="overlay modal-overlay"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={`Lịch sử CCCD của ${member.fullName}`}
        tabIndex={-1}
        ref={modalRef}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            event.stopPropagation();
            onClose();
          }
        }}
      >
        <header className="modal-head">
          <div className="person-cell">
            <span className="avatar large" aria-hidden="true">
              {initials(member.fullName)}
            </span>
            <div>
              <span className="eyebrow">Lịch sử CCCD / BHYT</span>
              <h2>{member.fullName}</h2>
              <p className="modal-sub">
                {member.relationName ?? '—'} · Mã NK {member.personalId}
                {member.dateOfBirth ? ` · ${member.dateOfBirth}` : ''}
              </p>
            </div>
          </div>
          <button type="button" className="btn btn-icon" onClick={onClose} aria-label="Đóng">
            <CloseIcon size={20} />
          </button>
        </header>

        <div className="modal-summary">
          <div className="summary-item">
            <span className="detail-label">CCCD hiện tại</span>
            <span className="mono">{member.cccd ?? '—'}</span>
          </div>
          <div className="summary-item">
            <span className="detail-label">CCCD cũ</span>
            <span className="mono">{member.cccdOld ?? '—'}</span>
          </div>
          <div className="summary-item">
            <span className="detail-label">Ánh xạ</span>
            <Badge tone={mapping.tone}>{mapping.label}</Badge>
          </div>
        </div>

        <div className="modal-body">
          <p className="modal-note">
            <InfoIcon size={15} />
            Đối chiếu theo <code>PersonalKey</code>, CCCD hiện tại hoặc CCCD cũ. Bảng log không có
            khóa ngoại nên kết quả mang tính đối chiếu nghiệp vụ.
          </p>

          {error && !loading && (
            <div className="alert alert-danger">
              <InfoIcon />
              <div>
                <strong>Không tải được lịch sử</strong>
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

          {loading && (
            <div className="timeline-skeleton">
              <span className="skeleton skeleton-block" />
              <span className="skeleton skeleton-block" />
              <span className="skeleton skeleton-block" />
            </div>
          )}

          {!loading && data && data.items.length === 0 && (
            <div className="empty-state compact">
              <div className="empty-icon" aria-hidden="true">
                ↺
              </div>
              <h3>Chưa có lịch sử ánh xạ</h3>
              <p>Nhân khẩu này chưa có bản ghi trong Personal_CccdMapLog.</p>
            </div>
          )}

          {!loading && data && data.items.length > 0 && (
            <ol className="timeline">
              {data.items.map((log) => {
                const details = prettyJson(log.detailsJson);

                return (
                  <li key={log.id} className="timeline-item">
                    <span className="timeline-dot" aria-hidden="true" />
                    <article className="log-card">
                      <div className="log-head">
                        <div>
                          <time>{formatDateTime(log.changedAt)}</time>
                          <span className="log-actor">{log.changedBy}</span>
                        </div>
                        <div className="log-flags">
                          {log.cccdChanged && <Badge tone="info">CCCD</Badge>}
                          {log.bhytChanged && <Badge tone="violet">BHYT</Badge>}
                        </div>
                      </div>

                      <div className="change-line">
                        <span className="change-label">CCCD</span>
                        <span className={`mono ${log.oldCccd ? 'old-value' : 'muted'}`}>
                          {log.oldCccd ?? '—'}
                        </span>
                        <ArrowRightIcon size={14} />
                        <span className="mono new-value">{log.newCccd ?? '—'}</span>
                      </div>

                      {(log.oldBhyt || log.newBhyt) && (
                        <div className="change-line">
                          <span className="change-label">BHYT</span>
                          <span className={`mono ${log.oldBhyt ? 'old-value' : 'muted'}`}>
                            {log.oldBhyt ?? '—'}
                          </span>
                          <ArrowRightIcon size={14} />
                          <span className="mono new-value">{log.newBhyt ?? '—'}</span>
                        </div>
                      )}

                      <div className="log-meta">
                        {log.fileName && <span>Batch: {log.fileName}</span>}
                        {log.importedAt && <span>Nhập lúc: {formatDateTime(log.importedAt)}</span>}
                        <span>
                          {log.personalTable} · {log.personalKey}
                        </span>
                      </div>

                      {details && (
                        <details className="json-details">
                          <summary>DetailsJson</summary>
                          <pre>{details}</pre>
                        </details>
                      )}
                    </article>
                  </li>
                );
              })}
            </ol>
          )}
        </div>

        {data && data.total > 0 && (
          <footer className="modal-foot">
            <Pagination
              page={page}
              pageSize={PAGE_SIZE}
              total={data.total}
              onPage={setPage}
            />
          </footer>
        )}
      </div>
    </div>
  );
}
