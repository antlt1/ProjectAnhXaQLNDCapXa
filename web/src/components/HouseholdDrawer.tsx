import { useEffect, useState } from 'react';
import { api } from '../api';
import type { HouseholdDetail } from '../types';
import {
  coverageSummary,
  householdStatusMeta,
  mappingLabel,
  personStatusMeta,
  initials,
} from '../format';
import { Badge } from './Badge';
import { CloseIcon, HistoryIcon, IdCardIcon, InfoIcon } from './icons';
import { MemberLogsModal } from './MemberLogsModal';

interface HouseholdDrawerProps {
  houseHoldId: number;
  includeInactive: boolean;
  onClose: () => void;
}

export function HouseholdDrawer({ houseHoldId, includeInactive, onClose }: HouseholdDrawerProps) {
  const [detail, setDetail] = useState<HouseholdDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [selectedMemberId, setSelectedMemberId] = useState<number | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    setDetail(null);

    api
      .household(houseHoldId, includeInactive, controller.signal)
      .then((data) => setDetail(data))
      .catch((err: Error) => {
        if (err.name !== 'AbortError') setError(err.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [houseHoldId, includeInactive, reloadKey]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  const selectedMember =
    detail?.members.find((member) => member.personalId === selectedMemberId) ?? null;

  const coverage = detail ? coverageSummary(detail) : null;
  const householdStatus = detail ? householdStatusMeta(detail.houseHoldStatus) : null;

  return (
    <div
      className="overlay"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <aside
        className="drawer"
        role="dialog"
        aria-modal="true"
        aria-label={`Chi tiết hộ ${detail?.houseHoldCode ?? ''}`}
      >
        <header className="drawer-head">
          <div className="drawer-title">
            <span className="eyebrow">
              Hộ gia đình · {detail?.houseHoldCode ?? `#${houseHoldId}`}
            </span>
            <h2>{detail?.headName ?? (loading ? 'Đang tải…' : 'Chi tiết hộ')}</h2>
            <p>{detail?.fullAddress ?? '—'}</p>
          </div>
          <button type="button" className="btn btn-icon" onClick={onClose} aria-label="Đóng">
            <CloseIcon size={20} />
          </button>
        </header>

        <div className="drawer-body">
          {loading && (
            <div className="drawer-loading">
              <span className="skeleton skeleton-block" />
              <span className="skeleton skeleton-block" />
              <span className="skeleton skeleton-block" />
            </div>
          )}

          {error && !loading && (
            <div className="alert alert-danger">
              <InfoIcon />
              <div>
                <strong>Không tải được chi tiết hộ</strong>
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

          {detail && !loading && (
            <>
              <section className="detail-grid">
                <div className="detail-item">
                  <span className="detail-label">Mã hộ</span>
                  <span className="detail-value mono">{detail.houseHoldCode}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Tên hộ trên sổ</span>
                  <span className="detail-value">{detail.houseHoldNumber ?? '—'}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Chủ hộ</span>
                  <span className="detail-value">{detail.headName ?? 'Chưa xác định'}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">CCCD chủ hộ</span>
                  <span className="detail-value mono">{detail.headCccd ?? '—'}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Khu vực</span>
                  <span className="detail-value">{detail.regionName ?? detail.regionId}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Trạng thái hộ</span>
                  {householdStatus && <Badge tone={householdStatus.tone}>{householdStatus.label}</Badge>}
                </div>
                <div className="detail-item detail-item-wide">
                  <span className="detail-label">Địa chỉ</span>
                  <span className="detail-value">{detail.fullAddress ?? '—'}</span>
                </div>
                {detail.notes && (
                  <div className="detail-item detail-item-wide">
                    <span className="detail-label">Ghi chú</span>
                    <span className="detail-value">{detail.notes}</span>
                  </div>
                )}
              </section>

              <section className="coverage-panel">
                <div className="coverage-panel-main">
                  <span className="coverage-icon" aria-hidden="true">
                    <IdCardIcon size={22} />
                  </span>
                  <div>
                    <h3>Độ phủ CCCD &amp; ánh xạ</h3>
                    <p>
                      {detail.cccdCount}/{detail.memberCount} nhân khẩu có số CCCD ·{' '}
                      {detail.mappedCount}/{detail.memberCount} đã ánh xạ
                    </p>
                  </div>
                </div>
                {coverage && <Badge tone={coverage.tone}>{coverage.label}</Badge>}
              </section>

              <section className="members-section">
                <div className="section-heading">
                  <h3>Thành viên hộ</h3>
                  <span className="muted-small">{detail.memberCount} nhân khẩu</span>
                </div>

                <div className="table-scroll">
                  <table className="data-table member-table">
                    <thead>
                      <tr>
                        <th className="align-center">#</th>
                        <th>Họ tên</th>
                        <th>Quan hệ</th>
                        <th>Giới tính</th>
                        <th>Ngày sinh</th>
                        <th>CCCD</th>
                        <th>Ánh xạ</th>
                        <th aria-label="Lịch sử" />
                      </tr>
                    </thead>
                    <tbody>
                      {detail.members.map((member, index) => {
                        const isHead = member.relationCode === '0';
                        const mapping = mappingLabel(member.cccdMapped);
                        const status = personStatusMeta(member.personStatus);

                        return (
                          <tr key={member.personalId} className={isHead ? 'is-head' : undefined}>
                            <td className="align-center muted">{index + 1}</td>
                            <td>
                              <div className="person-cell compact">
                                <span className="avatar small" aria-hidden="true">
                                  {initials(member.fullName)}
                                </span>
                                <div className="person-lines">
                                  <span className="person-name">
                                    {member.fullName}
                                    {isHead && (
                                      <span className="head-tag" title="Chủ hộ">
                                        Chủ hộ
                                      </span>
                                    )}
                                  </span>
                                  <span className="person-sub">
                                    {status.tone === 'success' ? (
                                      `Mã NK: ${member.personalId}`
                                    ) : (
                                      <Badge tone={status.tone} dot={false}>
                                        {status.label}
                                      </Badge>
                                    )}
                                    {member.notes && <span className="member-note"> · {member.notes}</span>}
                                  </span>
                                </div>
                              </div>
                            </td>
                            <td>{member.relationName ?? member.relationCode ?? '—'}</td>
                            <td>{member.sexName ?? '—'}</td>
                            <td className="mono">{member.dateOfBirth ?? '—'}</td>
                            <td>
                              <div className="cccd-cell">
                                <span className="mono">{member.cccd ?? '—'}</span>
                                {member.cccdOld && member.cccdOld !== member.cccd && (
                                  <span className="muted-small mono">Cũ: {member.cccdOld}</span>
                                )}
                              </div>
                            </td>
                            <td>
                              <Badge tone={mapping.tone}>{mapping.label}</Badge>
                            </td>
                            <td className="align-right">
                              <button
                                type="button"
                                className="btn btn-ghost btn-sm"
                                onClick={() => setSelectedMemberId(member.personalId)}
                                aria-label={`Lịch sử CCCD của ${member.fullName}`}
                              >
                                <HistoryIcon size={16} />
                                Lịch sử
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {detail.members.length === 0 && (
                  <p className="muted-small empty-inline">Hộ chưa có nhân khẩu đang theo dõi.</p>
                )}
              </section>

              <p className="drawer-note">
                <InfoIcon size={15} />
                Lịch sử ánh xạ đối chiếu theo <code>PersonalKey</code> hoặc số CCCD, vì bảng{' '}
                <code>Personal_CccdMapLog</code> không khai báo khóa ngoại.
              </p>
            </>
          )}
        </div>
      </aside>

      {selectedMember && (
        <MemberLogsModal member={selectedMember} onClose={() => setSelectedMemberId(null)} />
      )}
    </div>
  );
}
