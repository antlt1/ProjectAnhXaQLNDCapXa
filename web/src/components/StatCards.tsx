import type { CccdFilter, Stats } from '../types';
import { formatNumber } from '../format';

interface StatCardsProps {
  stats: Stats | null;
  loading: boolean;
  activeFilter: CccdFilter;
  onFilter: (filter: CccdFilter) => void;
}

type Tone = 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'violet';

interface CardConfig {
  key: string;
  label: string;
  hint: string;
  value: number | undefined;
  tone: Tone;
  filter?: CccdFilter;
}

export function StatCards({ stats, loading, activeFilter, onFilter }: StatCardsProps) {
  const cards: CardConfig[] = [
    {
      key: 'total',
      label: 'Tổng số hộ',
      hint: 'Đang theo dõi',
      value: stats?.totalHouseholds,
      tone: 'neutral',
    },
    {
      key: 'with',
      label: 'Hộ có CCCD',
      hint: 'Ít nhất 1 nhân khẩu',
      value: stats?.householdsWithCccd,
      tone: 'success',
      filter: 'has',
    },
    {
      key: 'without',
      label: 'Hộ chưa có CCCD',
      hint: 'Cần rà soát',
      value: stats?.householdsWithoutCccd,
      tone: 'danger',
      filter: 'none',
    },
    {
      key: 'partial',
      label: 'Hộ thiếu CCCD',
      hint: 'Có người chưa có',
      value: stats?.householdsPartial,
      tone: 'warning',
      filter: 'partial',
    },
    {
      key: 'members',
      label: 'Tổng nhân khẩu',
      hint: 'Trong các hộ',
      value: stats?.totalMembers,
      tone: 'info',
    },
    {
      key: 'members-missing',
      label: 'Nhân khẩu chưa CCCD',
      hint: 'Chưa có số CCCD',
      value: stats?.membersWithoutCccd,
      tone: 'danger',
    },
    {
      key: 'members-unmapped',
      label: 'Chưa ánh xạ',
      hint: 'CCCD_Mapped = 0',
      value: stats?.membersUnmapped,
      tone: 'violet',
      filter: 'unmapped',
    },
  ];

  return (
    <section className="stat-grid" aria-label="Thống kê tổng quan">
      {cards.map((card) => {
        const isActive = Boolean(card.filter && activeFilter === card.filter);
        const isClickable = Boolean(card.filter);

        return (
          <button
            key={card.key}
            type="button"
            className={`stat-card tone-${card.tone} ${isClickable ? 'is-clickable' : ''} ${
              isActive ? 'is-active' : ''
            }`}
            onClick={() => card.filter && onFilter(card.filter)}
            disabled={!isClickable}
            aria-pressed={isClickable ? isActive : undefined}
            title={isClickable ? `Lọc: ${card.label}` : undefined}
          >
            <span className="stat-label">{card.label}</span>
            {loading && card.value === undefined ? (
              <span className="skeleton skeleton-value" />
            ) : (
              <span className="stat-value">
                {card.value === undefined ? '—' : formatNumber(card.value)}
              </span>
            )}
            <span className="stat-hint">{isActive ? 'Đang lọc · bấm để bỏ lọc' : card.hint}</span>
          </button>
        );
      })}
    </section>
  );
}
