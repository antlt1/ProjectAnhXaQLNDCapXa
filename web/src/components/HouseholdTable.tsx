import type { HouseholdSummary } from '../types';
import type { StatusMeta } from '../format';
import { initials } from '../format';
import { Badge } from './Badge';
import { ChevronRightIcon } from './icons';

interface HouseholdTableProps {
  items: HouseholdSummary[];
  loading: boolean;
  onOpen: (id: number) => void;
}

function coverageMeta(item: HouseholdSummary): StatusMeta {
  if (item.memberCount === 0) return { label: 'Không có nhân khẩu', tone: 'neutral' };
  if (item.cccdCount === 0) return { label: 'Chưa có CCCD', tone: 'danger' };
  if (item.missingCccdCount > 0) {
    return { label: `Thiếu ${item.missingCccdCount} người`, tone: 'warning' };
  }
  return { label: 'Đủ CCCD', tone: 'success' };
}

function SkeletonRows() {
  return (
    <>
      {Array.from({ length: 6 }).map((_, index) => (
        <tr key={index} className="skeleton-row">
          <td>
            <span className="skeleton skeleton-line" />
          </td>
          <td>
            <span className="skeleton skeleton-line wide" />
          </td>
          <td>
            <span className="skeleton skeleton-line wide" />
          </td>
          <td>
            <span className="skeleton skeleton-line short" />
          </td>
          <td>
            <span className="skeleton skeleton-line" />
          </td>
          <td>
            <span className="skeleton skeleton-line" />
          </td>
          <td />
        </tr>
      ))}
    </>
  );
}

export function HouseholdTable({ items, loading, onOpen }: HouseholdTableProps) {
  const showSkeleton = loading && items.length === 0;

  return (
    <div className={`table-card ${loading && items.length > 0 ? 'is-loading' : ''}`}>
      <div className="table-scroll">
        <table className="data-table household-table">
          <thead>
            <tr>
              <th>Mã hộ</th>
              <th>Chủ hộ</th>
              <th>Địa chỉ</th>
              <th className="align-center">Nhân khẩu</th>
              <th>CCCD</th>
              <th>Ánh xạ</th>
              <th aria-label="Thao tác" />
            </tr>
          </thead>
          <tbody>
            {showSkeleton && <SkeletonRows />}

            {!showSkeleton &&
              items.map((item) => {
                const coverage = coverageMeta(item);
                const percent =
                  item.memberCount > 0
                    ? Math.round((item.mappedCount / item.memberCount) * 100)
                    : 0;

                return (
                  <tr
                    key={item.houseHoldId}
                    className="clickable-row"
                    tabIndex={0}
                    onClick={() => onOpen(item.houseHoldId)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        onOpen(item.houseHoldId);
                      }
                    }}
                  >
                    <td>
                      <div className="code-cell">
                        <span className="household-code">{item.houseHoldCode}</span>
                        {item.houseHoldNumber &&
                          item.houseHoldNumber.toLocaleLowerCase('vi') !==
                            (item.headName ?? '').toLocaleLowerCase('vi') && (
                            <span className="muted-small">Sổ hộ: {item.houseHoldNumber}</span>
                          )}
                      </div>
                    </td>

                    <td>
                      <div className="person-cell">
                        <span className="avatar" aria-hidden="true">
                          {initials(item.headName)}
                        </span>
                        <div className="person-lines">
                          <span className="person-name">
                            {item.headName ?? 'Chưa xác định chủ hộ'}
                          </span>
                          <span className="person-sub">
                            {item.headRelationName ?? '—'}
                            {item.headCccd ? ` · ${item.headCccd}` : ''}
                            {item.headCccd && item.headCccdMapped === false && (
                              <span className="inline-warning"> · chưa ánh xạ</span>
                            )}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td>
                      <div className="address-cell">
                        <span>{item.fullAddress ?? item.addressName ?? '—'}</span>
                        {item.regionName && <span className="muted-small">{item.regionName}</span>}
                      </div>
                    </td>

                    <td className="align-center">
                      <span className="member-count">{item.memberCount}</span>
                    </td>

                    <td>
                      <div className="coverage-cell">
                        <span className="cccd-ratio">
                          <strong>{item.cccdCount}</strong>/{item.memberCount}
                        </span>
                        <Badge tone={coverage.tone}>{coverage.label}</Badge>
                      </div>
                    </td>

                    <td>
                      <div className="mapping-cell">
                        <span className="mapping-text">
                          {item.mappedCount}/{item.memberCount}
                        </span>
                        <span
                          className="progress"
                          role="img"
                          aria-label={`Đã ánh xạ ${percent}%`}
                        >
                          <span
                            className={`progress-fill ${percent === 100 ? 'is-done' : ''}`}
                            style={{ width: `${percent}%` }}
                          />
                        </span>
                      </div>
                    </td>

                    <td className="align-right">
                      <button
                        type="button"
                        className="btn btn-ghost"
                        onClick={(event) => {
                          event.stopPropagation();
                          onOpen(item.houseHoldId);
                        }}
                        aria-label={`Xem hộ ${item.houseHoldCode}`}
                      >
                        Xem
                        <ChevronRightIcon size={16} />
                      </button>
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>

      {!loading && items.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon" aria-hidden="true">
            ⌕
          </div>
          <h3>Không tìm thấy hộ phù hợp</h3>
          <p>Thử mã hộ khác, tên chủ hộ hoặc bỏ bộ lọc CCCD.</p>
        </div>
      )}
    </div>
  );
}
