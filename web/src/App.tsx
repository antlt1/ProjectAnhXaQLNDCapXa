import { useEffect, useState } from 'react';
import { api } from './api';
import type { HealthResponse, TabKey } from './types';
import { formatDateTime } from './format';
import { HouseholdsView } from './components/HouseholdsView';
import { LogsPanel } from './components/LogsPanel';
import { ReconcileView } from './components/ReconcileView';
import {
  AlertTriangleIcon,
  DatabaseIcon,
  FileSpreadsheetIcon,
  HistoryIcon,
  InfoIcon,
  UsersIcon,
} from './components/icons';

export default function App() {
  const [tab, setTab] = useState<TabKey>('households');
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [healthError, setHealthError] = useState('');
  const [healthLoading, setHealthLoading] = useState(true);
  const [healthKey, setHealthKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setHealthLoading(true);
    setHealthError('');

    api
      .health(controller.signal)
      .then((result) => setHealth(result))
      .catch((err: Error) => {
        if (err.name !== 'AbortError') setHealthError(err.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setHealthLoading(false);
      });

    return () => controller.abort();
  }, [healthKey]);

  const connectionClass = healthError
    ? 'conn-error'
    : healthLoading
      ? 'conn-loading'
      : health?.demoMode
        ? 'conn-demo'
        : 'conn-ok';

  const connectionLabel = healthError
    ? 'Mất kết nối API'
    : healthLoading
      ? 'Đang kiểm tra API…'
      : health?.demoMode
        ? 'DEMO · dữ liệu mẫu'
        : `SQL Server · ${health?.database ?? 'NHONAI'}`;

  return (
    <div className="app">
      <div className="app-header-wrap">
        <header className="app-header">
          <div className="brand">
            <span className="brand-mark" aria-hidden="true">
              <DatabaseIcon size={24} />
            </span>
            <div>
              <span className="brand-eyebrow">NHONAI · Quản lý nhân khẩu cấp xã</span>
              <h1>Tra cứu hộ gia đình &amp; ánh xạ CCCD</h1>
            </div>
          </div>

          <div
            className={`conn-pill ${connectionClass}`}
            title={
              health?.demoMode
                ? 'Đang dùng dữ liệu mẫu trong bộ nhớ'
                : health
                  ? `${health.server ?? ''} · ${health.database ?? ''} · ${health.login ?? ''}`
                  : undefined
            }
          >
            <span className="conn-dot" aria-hidden="true" />
            {connectionLabel}
          </div>
        </header>
      </div>

      <nav className="top-nav" aria-label="Chế độ xem">
        <div className="top-nav-inner">
          <button
            type="button"
            className={`tab-button ${tab === 'households' ? 'is-active' : ''}`}
            onClick={() => setTab('households')}
            aria-current={tab === 'households' ? 'page' : undefined}
          >
            <UsersIcon size={17} />
            Hộ gia đình
          </button>
          <button
            type="button"
            className={`tab-button ${tab === 'reconcile' ? 'is-active' : ''}`}
            onClick={() => setTab('reconcile')}
            aria-current={tab === 'reconcile' ? 'page' : undefined}
          >
            <FileSpreadsheetIcon size={17} />
            Rà soát Excel
          </button>
          <button
            type="button"
            className={`tab-button ${tab === 'logs' ? 'is-active' : ''}`}
            onClick={() => setTab('logs')}
            aria-current={tab === 'logs' ? 'page' : undefined}
          >
            <HistoryIcon size={17} />
            Nhật ký CCCD
          </button>
        </div>
      </nav>

      <main className="app-main">
        {healthError && (
          <div className="alert alert-danger">
            <AlertTriangleIcon />
            <div>
              <strong>Không kết nối được API</strong>
              <p>
                {healthError}. Kiểm tra server đã chạy chưa (<code>npm run dev</code>) và cấu hình{' '}
                <code>server/.env</code>.
              </p>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setHealthKey((key) => key + 1)}
              >
                Thử kết nối lại
              </button>
            </div>
          </div>
        )}

        {!healthError && health?.demoMode && (
          <div className="alert alert-info">
            <InfoIcon />
            <div>
              <strong>Đang chạy chế độ DEMO</strong>
              <p>
                Dữ liệu là mẫu theo đúng cấu trúc bảng. Điền <code>server/.env</code> rồi chạy{' '}
                <code>npm run dev</code> để dùng SQL Server thật.
              </p>
            </div>
          </div>
        )}

        {tab === 'households' && <HouseholdsView />}
        {tab === 'reconcile' && <ReconcileView />}
        {tab === 'logs' && <LogsPanel />}
      </main>

      <footer className="app-footer">
        <span>
          Dữ liệu: NHONAI · Personal, HouseHold, Relation, Personal_CccdMapLog
        </span>
        <span>
          {health?.serverTime ? `API cập nhật: ${formatDateTime(health.serverTime)}` : 'API: —'}
        </span>
      </footer>
    </div>
  );
}
