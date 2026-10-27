import { ChevronLeftIcon, ChevronRightIcon } from './icons';

interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onPage: (page: number) => void;
  onPageSize?: (pageSize: number) => void;
  pageSizes?: number[];
}

export function Pagination({
  page,
  pageSize,
  total,
  onPage,
  onPageSize,
  pageSizes = [10, 20, 50, 100],
}: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);

  return (
    <div className="pagination">
      <div className="pagination-info">
        Hiển thị <strong>{from}</strong>–<strong>{to}</strong> trên <strong>{total}</strong>
      </div>

      <div className="pagination-controls">
        {onPageSize && (
          <label className="page-size">
            <span>Số dòng</span>
            <select
              value={pageSize}
              onChange={(event) => onPageSize(Number(event.target.value))}
              aria-label="Số dòng mỗi trang"
            >
              {pageSizes.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </label>
        )}

        <button
          type="button"
          className="btn btn-icon"
          onClick={() => onPage(page - 1)}
          disabled={page <= 1}
          aria-label="Trang trước"
        >
          <ChevronLeftIcon />
        </button>

        <span className="page-indicator">
          Trang {page} / {totalPages}
        </span>

        <button
          type="button"
          className="btn btn-icon"
          onClick={() => onPage(page + 1)}
          disabled={page >= totalPages}
          aria-label="Trang sau"
        >
          <ChevronRightIcon />
        </button>
      </div>
    </div>
  );
}
