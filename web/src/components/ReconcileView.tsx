import { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../api';
import type {
  ReconcileComparison,
  ReconcileFilter,
  ReconcileIssue,
  ReconcileItem,
  ReconcilePerson,
  ReconcileResponse,
  ReconcileStatus,
  ReconcileTotals,
} from '../types';
import { compareReconcile } from '../reconcileCompare';
import {
  formatDateTime,
  formatNumber,
  initials,
  personStatusMeta,
  reconcileIssueLabel,
  reconcileStatusMeta,
} from '../format';
import { Badge } from './Badge';
import { Pagination } from './Pagination';
import { HouseholdDrawer } from './HouseholdDrawer';
import {
  AlertTriangleIcon,
  CheckCircleIcon,
  InfoIcon,
  RefreshIcon,
  SearchIcon,
} from './icons';
import { useDebounced } from '../hooks/useDebounced';

const FILTERS: { value: ReconcileFilter; label: string }[] = [
  { value: 'all', label: 'Tất cả dòng' },
  { value: 'ok', label: 'Khớp' },
  { value: 'dob', label: 'Lệch năm sinh' },
  { value: 'address', label: 'Lệch địa chỉ' },
  { value: 'name', label: 'Sai tên' },
  { value: 'sex', label: 'Sai giới tính' },
  { value: 'cccd-diff', label: 'Khác số CCCD' },
  { value: 'not-inserted', label: 'Chưa chèn CCCD' },
  { value: 'not-found', label: 'Không thấy trong CSDL' },
  { value: 'confirmed', label: 'Đã xác nhận' },
  { value: 'unconfirmed', label: 'Chưa xác nhận' },
  { value: 'duplicates', label: 'Trùng CCCD trong Excel' },
];

const ISSUE_ORDER: ReconcileIssue[] = ['name', 'dob', 'address', 'sex'];

function detailStatus(
  excelCccd: string,
  person: ReconcilePerson | null,
  comparison: ReconcileComparison | null,
): ReconcileStatus {
  if (!person) return 'not-found';

  const cccdMatched =
    Boolean(excelCccd) && (person.cccd === excelCccd || person.cccdOld === excelCccd);

  if (cccdMatched) {
    for (const issue of ISSUE_ORDER) {
      if (comparison?.issues.includes(issue)) return issue;
    }
    return 'ok';
  }

  return person.cccd ? 'cccd-diff' : 'not-inserted';
}

function verdictText(
  status: ReconcileStatus,
  item: ReconcileItem,
  person: ReconcilePerson | null,
  comparison: ReconcileComparison | null,
): string {
  if (!person) {
    return 'Không tìm thấy số CCCD hoặc người cùng tên trong phạm vi xã đang đối chiếu.';
  }

  const dob = comparison?.dob;
  const extras = (comparison?.issues ?? []).filter(
    (issue) => issue !== status && issue !== 'name',
  );

  let text = '';
  switch (status) {
    case 'ok':
      text = 'Số CCCD, họ tên, ngày sinh và địa chỉ khớp với CSDL.';
      break;
    case 'name':
      text = `Số CCCD ${item.excel.cccd} đã có trong CSDL nhưng gắn với người khác tên (${person.fullName}).`;
      break;
    case 'dob':
      text = `Khớp CCCD và họ tên, nhưng ngày sinh lệch ${
        dob?.yearDiff ? `${Math.abs(dob.yearDiff)} năm` : `${Math.abs(dob?.dayDiff ?? 0)} ngày`
      } (Excel ${item.excel.dobDisplay ?? '—'} → CSDL ${person.dobDisplay ?? '—'}).`;
      break;
    case 'address':
      text = `Khớp CCCD và họ tên, nhưng địa chỉ/ấp lệch (Excel ${
        item.excel.hamlet || '—'
      } → CSDL ${person.addressName ?? '—'}).`;
      break;
    case 'sex':
      text = `Khớp CCCD và họ tên, nhưng giới tính lệch (Excel ${
        item.excel.sexLabel ?? '—'
      } → CSDL ${person.sexLabel ?? '—'}).`;
      break;
    case 'cccd-diff':
      text =
        comparison && !comparison.name.same
          ? `Ứng viên được chọn (${person.fullName}) có số CCCD ${
              person.cccd ?? 'chưa có'
            }, khác số trong Excel; họ tên cũng chưa khớp.`
          : `Tìm thấy người cùng tên trong CSDL, nhưng số CCCD khác (CSDL: ${
              person.cccd ?? 'chưa có'
            }).`;
      break;
    case 'not-inserted':
      text =
        comparison && !comparison.name.same
          ? `Ứng viên được chọn (${person.fullName}) chưa có số CCCD trong CSDL; họ tên cũng chưa khớp.`
          : 'Tìm thấy người cùng tên trong CSDL, nhưng nhân khẩu này chưa có số CCCD.';
      break;
    default:
      text = 'Chưa xác định được kết quả đối chiếu cho dòng này.';
  }

  if (comparison?.dob?.missing) {
    text += ' CSDL chưa có ngày sinh để so sánh.';
  }

  if (comparison?.address?.missing) {
    text += ' Thiếu ấp/địa chỉ để so sánh.';
  }

  if (extras.length) {
    text += ` Ngoài ra còn: ${extras.map(reconcileIssueLabel).join(', ').toLowerCase()}.`;
  }

  return text;
}

function StatChip({
  label,
  value,
  active,
  tone,
  onClick,
}: {
  label: string;
  value: number;
  active: boolean;
  tone?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`reconcile-stat ${active ? 'is-active' : ''} ${tone ? `tone-${tone}` : ''}`}
      onClick={onClick}
      aria-pressed={active}
    >
      <span className="reconcile-stat-label">{label}</span>
      <strong>{formatNumber(value)}</strong>
    </button>
  );
}

function ComparisonTable({
  item,
  person,
  comparison,
}: {
  item: ReconcileItem;
  person: ReconcilePerson | null;
  comparison: ReconcileComparison | null;
}) {
  const cccdDiff = Boolean(
    person && item.excel.cccd && person.cccd !== item.excel.cccd,
  );
  const cccdMatchedByOld = Boolean(
    person && !cccdDiff && person.cccdOld && person.cccdOld === item.excel.cccd,
  );

  const rows: {
    label: string;
    excel: string;
    db: string;
    diff?: boolean;
    note?: string;
  }[] = [
    {
      label: 'Họ và tên',
      excel: item.excel.fullName,
      db: person?.fullName ?? '—',
      diff: Boolean(person && comparison && !comparison.name.same),
    },
    {
      label: 'Ngày sinh',
      excel: item.excel.dobDisplay ?? '—',
      db: person?.dobDisplay ?? '—',
      diff: Boolean(comparison?.dob?.issue),
      note: comparison?.dob?.issue ? comparison.dob.label : undefined,
    },
    {
      label: 'Giới tính',
      excel: item.excel.sexLabel ?? '—',
      db: person?.sexLabel ?? '—',
      diff: Boolean(person && comparison && !comparison.sex.same),
    },
    {
      label: 'Số CCCD',
      excel: item.excel.cccd || '—',
      db: person?.cccd ?? 'Chưa có',
      diff: cccdDiff,
      note: cccdMatchedByOld
        ? `Trùng CCCD cũ (${person?.cccdOld})`
        : cccdDiff
          ? 'Số CCCD trong Excel chưa có trong CSDL'
          : undefined,
    },
    {
      label: 'Ấp / địa chỉ',
      excel: item.excel.hamlet || '—',
      db: person?.addressName ?? '—',
      diff: Boolean(person && comparison && !comparison.address.same && !comparison.address.missing),
      note: comparison?.address.missing ? 'Thiếu địa chỉ để so sánh' : undefined,
    },
    {
      label: 'Mã hộ',
      excel: '—',
      db: person?.houseHoldCode ?? '—',
    },
    {
      label: 'Chủ hộ',
      excel: '—',
      db: person?.headName ?? '—',
    },
    {
      label: 'Tên hộ trên sổ',
      excel: '—',
      db: person?.houseHoldNumber ?? '—',
    },
    {
      label: 'Quan hệ',
      excel: '—',
      db: person?.relationName ?? person?.relationCode ?? '—',
    },
    {
      label: 'Địa chỉ đầy đủ',
      excel: [item.excel.hamlet, item.excel.ward, item.excel.city].filter(Boolean).join(', ') || '—',
      db: person?.fullAddress ?? '—',
    },
  ];

  return (
    <div className="compare-wrap">
      <table className="compare-table">
        <thead>
          <tr>
            <th>Trường</th>
            <th>Excel</th>
            <th>CSDL</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label} className={row.diff ? 'is-diff' : undefined}>
              <th scope="row">{row.label}</th>
              <td>{row.excel}</td>
              <td>
                <span>{row.db}</span>
                {row.note && <span className="diff-note">{row.note}</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ReconcileView() {
  const [q, setQ] = useState('');
  const debouncedQ = useDebounced(q, 320);
  const [issue, setIssue] = useState<ReconcileFilter>('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [reloadKey, setReloadKey] = useState(0);
  const refreshRef = useRef(false);

  const [data, setData] = useState<ReconcileResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [selected, setSelected] = useState<ReconcileItem | null>(null);
  const [selectedPersonalId, setSelectedPersonalId] = useState<number | null>(null);
  const [acceptDob, setAcceptDob] = useState(false);
  const [acceptAddress, setAcceptAddress] = useState(false);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saveNotice, setSaveNotice] = useState('');
  const [showHouseholdId, setShowHouseholdId] = useState<number | null>(null);

  useEffect(() => {
    setPage(1);
  }, [debouncedQ, issue, pageSize]);

  useEffect(() => {
    const controller = new AbortController();
    const refresh = refreshRef.current;
    refreshRef.current = false;

    setLoading(true);
    setError('');

    api
      .reconcile(
        { q: debouncedQ, issue, page, pageSize, refresh },
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
  }, [debouncedQ, issue, page, pageSize, reloadKey]);

  useEffect(() => {
    if (!data) return;
    setSelected((previous) => {
      if (!previous) return previous;
      return data.items.find((item) => item.stt === previous.stt) ?? previous;
    });
  }, [data]);

  useEffect(() => {
    setSaveError('');
    setSaveNotice('');
  }, [selected?.key]);

  useEffect(() => {
    if (!selected) return;
    setSelectedPersonalId(selected.confirmation?.personalId ?? selected.db?.personalId ?? null);
    setAcceptDob(Boolean(selected.confirmation?.acceptDobDiff));
    setAcceptAddress(Boolean(selected.confirmation?.acceptAddressDiff));
    setNote(selected.confirmation?.note ?? '');
    setSaveError('');
  }, [selected?.key, selected?.confirmation?.updatedAt]);

  const chosenPerson = useMemo<ReconcilePerson | null>(() => {
    if (!selected) return null;
    if (selectedPersonalId) {
      if (selected.db?.personalId === selectedPersonalId) return selected.db;
      const candidate = selected.candidates.find(
        (item) => item.personalId === selectedPersonalId,
      );
      if (candidate) return candidate;
    }
    return selected.db;
  }, [selected, selectedPersonalId]);

  const comparison = useMemo(
    () => (selected ? compareReconcile(selected.excel, chosenPerson) : null),
    [selected, chosenPerson],
  );

  const status = selected
    ? detailStatus(selected.excel.cccd, chosenPerson, comparison)
    : 'not-found';
  const statusMeta = reconcileStatusMeta(status);

  const totals: ReconcileTotals | null = data?.totals ?? null;

  function reload(force = false) {
    if (force) refreshRef.current = true;
    setReloadKey((key) => key + 1);
  }

  async function saveConfirmation(confirmed: boolean) {
    if (!selected) return;

    setSaving(true);
    setSaveError('');
    setSaveNotice('');

    try {
      await api.confirmReconcile({
        stt: selected.stt,
        cccd: selected.excel.cccd,
        confirmed,
        acceptDobDiff: confirmed ? acceptDob : false,
        acceptAddressDiff: confirmed ? acceptAddress : false,
        personalId: confirmed ? chosenPerson?.personalId ?? null : null,
        note: confirmed ? note : '',
      });

      if (confirmed) {
        setSaveNotice('Đã lưu xác nhận.');
      } else {
        setAcceptDob(false);
        setAcceptAddress(false);
        setNote('');
        setSaveNotice('Đã bỏ xác nhận.');
      }

      reload();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Không lưu được xác nhận');
    } finally {
      setSaving(false);
    }
  }

  function toggleFilter(value: ReconcileFilter) {
    setIssue((current) => (current === value ? 'all' : value));
  }

  const hasActiveFilter = issue !== 'all' || q.trim() !== '';

  return (
    <section className="reconcile-view">
      <div className="view-heading">
        <div>
          <span className="eyebrow">Excel · Personal · HouseHold</span>
          <h1>Rà soát chèn CCCD từ Excel</h1>
          <p>
            Đối chiếu danh sách dân cư trong file Excel với nhân khẩu{' '}
            {data?.region.regionName ? <strong>{data.region.regionName}</strong> : 'trong CSDL'} để
            kiểm tra CCCD đã được chèn đúng người, đúng hộ hay chưa.
          </p>
        </div>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => reload(true)}
          disabled={loading}
        >
          <RefreshIcon size={16} />
          Đọc lại Excel &amp; CSDL
        </button>
      </div>

      {error && (
        <div className="alert alert-danger">
          <AlertTriangleIcon />
          <div>
            <strong>Không tải được dữ liệu rà soát</strong>
            <p>{error}</p>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => reload(true)}
            >
              Thử lại
            </button>
          </div>
        </div>
      )}

      {totals && (
        <div className="reconcile-stats">
          <StatChip
            label="Tổng dòng Excel"
            value={totals.rows}
            active={issue === 'all'}
            onClick={() => setIssue('all')}
          />
          <StatChip
            label="Khớp"
            value={totals.ok}
            active={issue === 'ok'}
            tone="success"
            onClick={() => toggleFilter('ok')}
          />
          <StatChip
            label="Lệch năm sinh"
            value={totals.withDobIssue}
            active={issue === 'dob'}
            tone="warning"
            onClick={() => toggleFilter('dob')}
          />
          <StatChip
            label="Lệch địa chỉ"
            value={totals.withAddressIssue}
            active={issue === 'address'}
            tone="warning"
            onClick={() => toggleFilter('address')}
          />
          <StatChip
            label="Sai tên"
            value={totals.withNameIssue}
            active={issue === 'name'}
            tone="danger"
            onClick={() => toggleFilter('name')}
          />
          <StatChip
            label="Chưa chèn CCCD"
            value={totals['not-inserted']}
            active={issue === 'not-inserted'}
            tone="danger"
            onClick={() => toggleFilter('not-inserted')}
          />
          <StatChip
            label="Khác số CCCD"
            value={totals['cccd-diff']}
            active={issue === 'cccd-diff'}
            tone="violet"
            onClick={() => toggleFilter('cccd-diff')}
          />
          <StatChip
            label="Không thấy trong CSDL"
            value={totals['not-found']}
            active={issue === 'not-found'}
            tone="neutral"
            onClick={() => toggleFilter('not-found')}
          />
          <StatChip
            label="Đã xác nhận"
            value={totals.confirmed}
            active={issue === 'confirmed'}
            tone="info"
            onClick={() => toggleFilter('confirmed')}
          />
        </div>
      )}

      <div className="toolbar">
        <div className="search-box">
          <SearchIcon size={18} />
          <input
            type="search"
            value={q}
            onChange={(event) => setQ(event.target.value)}
            placeholder="STT, họ tên, CCCD, ấp hoặc mã hộ"
            aria-label="Tìm dòng Excel cần rà soát"
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
          <span>Kết quả</span>
          <select
            value={issue}
            onChange={(event) => setIssue(event.target.value as ReconcileFilter)}
            aria-label="Lọc theo kết quả đối chiếu"
          >
            {FILTERS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        {hasActiveFilter && (
          <button
            type="button"
            className="btn btn-link"
            onClick={() => {
              setQ('');
              setIssue('all');
            }}
          >
            Xóa bộ lọc
          </button>
        )}

        <span className="result-status">
          {data
            ? `${formatNumber(data.total)} dòng khớp bộ lọc · ${formatNumber(data.totals.rows)} dòng trong file`
            : 'Đang tải…'}
        </span>
      </div>

      {data && (
        <p className="reconcile-file-note">
          <InfoIcon size={15} />
          <span>
            <strong>{data.file.name}</strong> · sheet {data.file.sheetName} ·{' '}
            {formatNumber(data.file.rowCount)} dòng · cập nhật file{' '}
            {formatDateTime(data.file.modifiedAt)} · đối chiếu lúc {formatDateTime(data.builtAt)}
          </span>
        </p>
      )}

      <div className="reconcile-split">
        <div className="reconcile-list-card">
          <div className="reconcile-list-head">
            <div>
              <h2>Dòng trong Excel</h2>
              <span className="muted-small">
                {data ? `${formatNumber(data.total)} kết quả` : 'Đang tải…'}
              </span>
            </div>
            <span className="muted-small">
              {loading ? 'Đang tải…' : 'Chọn một dòng để đối chiếu'}
            </span>
          </div>

          <div className="table-scroll">
            <table className="data-table reconcile-table">
              <thead>
                <tr>
                  <th className="align-center">STT</th>
                  <th>Họ tên / CCCD</th>
                  <th>Ấp</th>
                  <th>Kết quả</th>
                </tr>
              </thead>
              <tbody>
                {loading && !data && (
                  <tr className="skeleton-row">
                    <td colSpan={4}>
                      <span className="skeleton skeleton-block" />
                    </td>
                  </tr>
                )}

                {data?.items.map((item) => {
                  const meta = reconcileStatusMeta(item.status);
                  const isSelected = selected?.stt === item.stt;

                  return (
                    <tr
                      key={item.stt}
                      className={`clickable-row ${isSelected ? 'is-selected' : ''}`}
                      tabIndex={0}
                      onClick={() => setSelected(item)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          setSelected(item);
                        }
                      }}
                    >
                      <td className="align-center mono muted">{item.stt}</td>
                      <td>
                        <div className="reconcile-name-cell">
                          <span className="person-name">
                            {item.excel.fullName}
                            {item.confirmation?.confirmed && (
                              <CheckCircleIcon
                                size={14}
                                className="confirmed-icon"
                                aria-label="Đã xác nhận"
                              />
                            )}
                          </span>
                          <span className="person-sub mono">
                            {item.excel.cccd}
                            {item.duplicateInExcel && (
                              <span className="inline-warning">
                                {' '}
                                · trùng CCCD ×{item.duplicateCount}
                              </span>
                            )}
                          </span>
                        </div>
                      </td>
                      <td>
                        <span className="muted-small">{item.excel.hamlet || '—'}</span>
                      </td>
                      <td>
                        <Badge tone={meta.tone}>{meta.label}</Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {!loading && data && data.items.length === 0 && (
            <div className="empty-state compact">
              <h3>Không có dòng phù hợp</h3>
              <p>Thử từ khóa khác hoặc bỏ bộ lọc kết quả.</p>
            </div>
          )}

          {data && data.total > 0 && (
            <Pagination
              page={page}
              pageSize={pageSize}
              total={data.total}
              onPage={setPage}
              onPageSize={setPageSize}
              pageSizes={[20, 50, 100]}
            />
          )}
        </div>

        <div className="reconcile-detail-card">
          {!selected && (
            <div className="empty-state">
              <div className="empty-icon" aria-hidden="true">
                ⇄
              </div>
              <h3>Chọn một dòng Excel</h3>
              <p>
                Bảng bên trái hiển thị kết quả dò CCCD. Chọn một dòng để xem chi tiết đối chiếu
                Excel – CSDL, kiểm tra hộ và xác nhận.
              </p>
            </div>
          )}

          {selected && (
            <>
              <header className="reconcile-detail-head">
                <div>
                  <span className="eyebrow">Dòng Excel #{selected.stt}</span>
                  <h2>{selected.excel.fullName}</h2>
                  <p>
                    {selected.excel.hamlet || '—'} · {selected.excel.ward || '—'}
                  </p>
                </div>
                <div className="reconcile-head-badges">
                  <Badge tone={statusMeta.tone}>{statusMeta.label}</Badge>
                  {selected.confirmation?.confirmed && (
                    <Badge tone="success" dot={false}>
                      Đã xác nhận
                    </Badge>
                  )}
                </div>
              </header>

              <div className={`reconcile-verdict tone-${statusMeta.tone}`}>
                <strong>{statusMeta.label}</strong>
                <p>{verdictText(status, selected, chosenPerson, comparison)}</p>
                {selected.matchedBy === 'cccd-old' && (
                  <span className="muted-small">Khớp qua CCCD cũ trong CSDL.</span>
                )}
              </div>

              {comparison && comparison.issues.length > 0 && (
                <div className="issue-chips">
                  {comparison.issues.map((issue) => (
                    <span key={issue} className={`issue-chip issue-${issue}`}>
                      {reconcileIssueLabel(issue)}
                    </span>
                  ))}
                </div>
              )}

              <ComparisonTable item={selected} person={chosenPerson} comparison={comparison} />

              {selected.candidates.length > 0 && (
                <section className="candidate-section">
                  <div className="section-heading">
                    <h3>Ứng viên trong CSDL</h3>
                    <span className="muted-small">
                      {chosenPerson ? 'Đang so sánh với người được chọn' : 'Chọn để so sánh'}
                    </span>
                  </div>

                  <div className="candidate-list">
                    {selected.candidates.map((candidate) => {
                      const active = chosenPerson?.personalId === candidate.personalId;
                      return (
                        <button
                          key={candidate.personalId}
                          type="button"
                          className={`candidate ${active ? 'is-active' : ''}`}
                          onClick={() => setSelectedPersonalId(candidate.personalId)}
                        >
                          <span className="avatar small" aria-hidden="true">
                            {initials(candidate.fullName)}
                          </span>
                          <span className="candidate-lines">
                            <span className="person-name">{candidate.fullName}</span>
                            <span className="person-sub">
                              {candidate.dobDisplay ?? '—'} · {candidate.addressName ?? '—'} · CCCD{' '}
                              <span className="mono">{candidate.cccd ?? 'chưa có'}</span> · hộ{' '}
                              {candidate.houseHoldCode}
                            </span>
                          </span>
                          <span className="candidate-score">{candidate.score} đ</span>
                        </button>
                      );
                    })}
                  </div>
                </section>
              )}

              {chosenPerson && (
                <section className="reconcile-household">
                  <div className="section-heading">
                    <h3>Hộ trong CSDL</h3>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => setShowHouseholdId(chosenPerson.houseHoldId)}
                    >
                      Xem thành viên hộ
                    </button>
                  </div>

                  <dl className="household-grid">
                    <div>
                      <dt>Mã hộ</dt>
                      <dd className="mono">{chosenPerson.houseHoldCode}</dd>
                    </div>
                    <div>
                      <dt>Chủ hộ</dt>
                      <dd>{chosenPerson.headName ?? '—'}</dd>
                    </div>
                    <div>
                      <dt>Tên hộ trên sổ</dt>
                      <dd>{chosenPerson.houseHoldNumber ?? '—'}</dd>
                    </div>
                    <div>
                      <dt>Quan hệ</dt>
                      <dd>{chosenPerson.relationName ?? chosenPerson.relationCode ?? '—'}</dd>
                    </div>
                    <div>
                      <dt>Địa chỉ</dt>
                      <dd>{chosenPerson.fullAddress ?? chosenPerson.addressName ?? '—'}</dd>
                    </div>
                    <div>
                      <dt>Trạng thái nhân khẩu</dt>
                      <dd>{personStatusMeta(chosenPerson.personStatus).label}</dd>
                    </div>
                  </dl>
                </section>
              )}

              <section className="confirm-panel">
                <div className="confirm-head">
                  <div>
                    <h3>Xác nhận đúng hộ</h3>
                    <p className="muted-small">
                      Đánh dấu sau khi đã đối chiếu dòng Excel với nhân khẩu/hộ trong CSDL.
                    </p>
                  </div>
                  {selected.confirmation?.confirmed && (
                    <Badge tone="success">Đã xác nhận</Badge>
                  )}
                </div>

                <div className="confirm-checks">
                  <label className="check-field">
                    <input
                      type="checkbox"
                      checked={acceptDob}
                      onChange={(event) => setAcceptDob(event.target.checked)}
                    />
                    <span>
                      Chấp nhận lệch năm sinh
                      {comparison?.dob?.issue && (
                        <em>
                          {' '}
                          ({Math.abs(comparison.dob.yearDiff ?? 0)} năm)
                        </em>
                      )}
                    </span>
                  </label>

                  <label className="check-field">
                    <input
                      type="checkbox"
                      checked={acceptAddress}
                      onChange={(event) => setAcceptAddress(event.target.checked)}
                    />
                    <span>
                      Chấp nhận lệch địa chỉ
                      {comparison?.address && !comparison.address.same && (
                        <em>
                          {' '}
                          ({comparison.address.excel || '—'} → {comparison.address.db || '—'})
                        </em>
                      )}
                    </span>
                  </label>
                </div>

                <label className="note-field">
                  <span>Ghi chú</span>
                  <input
                    type="text"
                    value={note}
                    maxLength={500}
                    onChange={(event) => setNote(event.target.value)}
                    placeholder="VD: đã kiểm tra giấy tờ, số hộ đúng; cần chuyển hộ…"
                  />
                </label>

                <div className="confirm-actions">
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => saveConfirmation(true)}
                    disabled={saving}
                  >
                    <CheckCircleIcon size={16} />
                    {saving
                      ? 'Đang lưu…'
                      : selected.confirmation?.confirmed
                        ? 'Cập nhật xác nhận'
                        : chosenPerson
                          ? 'Xác nhận đúng hộ'
                          : 'Xác nhận đã rà soát'}
                  </button>

                  {selected.confirmation?.confirmed && (
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => saveConfirmation(false)}
                      disabled={saving}
                    >
                      Bỏ xác nhận
                    </button>
                  )}

                  {saveNotice && <span className="save-notice">{saveNotice}</span>}
                </div>

                {selected.confirmation?.confirmed && selected.confirmation.updatedAt && (
                  <span className="muted-small">
                    Xác nhận lúc {formatDateTime(selected.confirmation.updatedAt)}
                  </span>
                )}

                {saveError && (
                  <div className="alert alert-danger compact">
                    <AlertTriangleIcon size={16} />
                    <p>{saveError}</p>
                  </div>
                )}
              </section>
            </>
          )}
        </div>
      </div>

      <p className="page-note">
        <InfoIcon size={15} />
        Dò theo số CCCD trước; nếu chưa có thì dò theo họ tên trong CSDL. Hai ô tích “Chấp nhận
        lệch” chỉ ghi nhận ngoại lệ đã kiểm tra, không sửa dữ liệu trong SQL Server. Xác nhận được
        lưu tại <code>server/data/reconcile-confirmations.json</code>.
      </p>

      {showHouseholdId !== null && (
        <HouseholdDrawer
          houseHoldId={showHouseholdId}
          includeInactive
          onClose={() => setShowHouseholdId(null)}
        />
      )}
    </section>
  );
}
