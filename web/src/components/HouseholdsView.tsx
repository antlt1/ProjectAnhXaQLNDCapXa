import { useCallback, useEffect, useState } from 'react';
import { api } from '../api';
import type { CccdFilter, HouseholdListResponse, Stats } from '../types';
import { formatNumber } from '../format';
import { StatCards } from './StatCards';
import { HouseholdTable } from './HouseholdTable';
import { HouseholdDrawer } from './HouseholdDrawer';
import { Pagination } from './Pagination';
import { InfoIcon, RefreshIcon, SearchIcon } from './icons';
import { useDebounced } from '../hooks/useDebounced';

const FILTER_OPTIONS: { value: CccdFilter; label: string }[] = [
  { value: 'all', label: 'Tất cả hộ' },
  { value: 'none', label: 'Hộ chưa có CCCD' },
  { value: 'partial', label: 'Hộ thiếu CCCD' },
  { value: 'has', label: 'Hộ có CCCD' },
  { value: 'unmapped', label: 'Còn người chưa ánh xạ' },
];

export function HouseholdsView() {
  const [q, setQ] = useState('');
  const debouncedQ = useDebounced(q, 320);
  const [cccd, setCccd] = useState<CccdFilter>('all');
  const [includeInactive, setIncludeInactive] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const [data, setData] = useState<HouseholdListResponse | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [error, setError] = useState('');
  const [statsError, setStatsError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [selectedHouseholdId, setSelectedHouseholdId] = useState<number | null>(null);

  useEffect(() => {
    setPage(1);
  }, [debouncedQ, cccd, includeInactive, pageSize]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');

    api
      .households(
        {
          q: debouncedQ,
          cccd,
          includeInactive,
          page,
          pageSize,
        },
        controller.signal,
      )
      .then((result) => setData(result))
      .catch((err: Error) => {
        if (err.name !== 'AbortError') setError(err.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [debouncedQ, cccd, includeInactive, page, pageSize, reloadKey]);

  useEffect(() => {
    const controller = new AbortController();
    setStatsLoading(true);
    setStatsError('');

    api
      .stats(includeInactive, controller.signal)
      .then((result) => setStats(result))
      .catch((err: Error) => {
        if (err.name !== 'AbortError') setStatsError(err.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setStatsLoading(false);
      });

    return () => controller.abort();
  }, [includeInactive, reloadKey]);

  const closeDrawer = useCallback(() => setSelectedHouseholdId(null), []);

  const hasActiveFilter = cccd !== 'all' || debouncedQ.trim() !== '' || includeInactive;

  function clearFilters() {
    setQ('');
    setCccd('all');
    setIncludeInactive(false);
  }

  return (
    <section className="households-view">
      <div className="view-heading">
        <div>
          <span className="eyebrow">HouseHold · Personal · Relation</span>
          <h1>Tra cứu hộ gia đình &amp; ánh xạ CCCD</h1>
          <p>
            Chủ hộ xác định theo <code>Relation_Code = '0'</code>. Cột CCCD đếm số nhân khẩu có số
            CCCD/BHYT; cột ánh xạ theo <code>CCCD_Mapped</code>.
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

      {statsError && (
        <div className="alert alert-warning">
          <InfoIcon />
          <div>
            <strong>Không tải được thống kê</strong>
            <p>{statsError}</p>
          </div>
        </div>
      )}

      <StatCards
        stats={stats}
        loading={statsLoading}
        activeFilter={cccd}
        onFilter={(filter) => setCccd((current) => (current === filter ? 'all' : filter))}
      />

      <div className="toolbar">
        <div className="search-box">
          <SearchIcon size={18} />
          <input
            type="search"
            value={q}
            onChange={(event) => setQ(event.target.value)}
            placeholder="Mã hộ, tên chủ hộ (có dấu) hoặc CCCD"
            aria-label="Tìm hộ gia đình"
          />
          {q && (
            <button
              type="button"
              className="search-clear"
              onClick={() => setQ('')}
              aria-label="Xóa nội dung tìm kiếm"
            >
              ×
            </button>
          )}
        </div>

        <label className="select-field">
          <span>Lọc CCCD</span>
          <select
            value={cccd}
            onChange={(event) => setCccd(event.target.value as CccdFilter)}
            aria-label="Lọc theo tình trạng CCCD"
          >
            {FILTER_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="switch-field">
          <input
            type="checkbox"
            checked={includeInactive}
            onChange={(event) => setIncludeInactive(event.target.checked)}
          />
          <span className="switch-track" aria-hidden="true">
            <span className="switch-thumb" />
          </span>
          <span>Gồm hộ ngừng theo dõi</span>
        </label>

        {hasActiveFilter && (
          <button type="button" className="btn btn-link" onClick={clearFilters}>
            Xóa bộ lọc
          </button>
        )}
      </div>

      <div className="result-bar">
        <div className="result-title">
          <h2>Danh sách hộ</h2>
          <span className="result-count">
            {loading && !data ? 'Đang tải…' : `${formatNumber(data?.total ?? 0)} hộ`}
          </span>
        </div>
        <span className="result-status" title="Phạm vi dữ liệu đang xem">
          {includeInactive ? 'Bao gồm hộ ngừng theo dõi' : 'Chỉ hộ đang hoạt động'}
        </span>
      </div>

      {error && (
        <div className="alert alert-danger">
          <InfoIcon />
          <div>
            <strong>Không tải được danh sách hộ</strong>
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

      <HouseholdTable
        items={data?.items ?? []}
        loading={loading}
        onOpen={setSelectedHouseholdId}
      />

      {data && data.total > 0 && (
        <Pagination
          page={page}
          pageSize={pageSize}
          total={data.total}
          onPage={setPage}
          onPageSize={setPageSize}
        />
      )}

      <p className="page-note">
        <InfoIcon size={15} />
        Hộ chưa có CCCD = không có thành viên nào có <code>Cccd_Bhyt_Code</code>. Hộ thiếu CCCD =
        có ít nhất một người chưa có số CCCD. Mặc định ẩn nhân khẩu/hộ có trạng thái D, G, R.
      </p>

      {selectedHouseholdId !== null && (
        <HouseholdDrawer
          houseHoldId={selectedHouseholdId}
          includeInactive={includeInactive}
          onClose={closeDrawer}
        />
      )}
    </section>
  );
}
