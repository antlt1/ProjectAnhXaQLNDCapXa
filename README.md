# Tra cứu hộ gia đình & ánh xạ CCCD — NHONAI

Ứng dụng web tra cứu hộ gia đình, nhân khẩu và tình trạng ánh xạ CCCD/BHYT trên cơ sở dữ liệu **NHONAI** (SQL Server).

- **Backend:** Node.js + Express + `mssql` (SQL Server)
- **Frontend:** React 18 + TypeScript + Vite
- **Chế độ DEMO:** chạy được ngay không cần SQL Server

## Chức năng

- **Thống kê tổng quan:** tổng số hộ, hộ có CCCD, hộ chưa có CCCD, hộ thiếu CCCD, tổng nhân khẩu, nhân khẩu chưa CCCD, chưa ánh xạ.
- **Danh sách hộ:** tìm theo mã hộ, tên chủ hộ (có dấu) hoặc số CCCD; lọc theo tình trạng CCCD; bật/tắt hộ ngừng theo dõi; phân trang.
- **Chi tiết hộ:** thông tin hộ, chủ hộ, địa chỉ, độ phủ CCCD và bảng thành viên (quan hệ, giới tính, ngày sinh, CCCD cũ/mới, trạng thái ánh xạ).
- **Lịch sử ánh xạ của từng nhân khẩu:** timeline `Personal_CccdMapLog`, so sánh CCCD/BHYT cũ – mới, file/sheet nhập, `DetailsJson`.
- **Nhật ký CCCD toàn hệ thống:** tìm kiếm và phân trang trên `Personal_CccdMapLog`.
- **Rà soát chèn CCCD từ Excel:** đối chiếu file `Xã Nhơn Ái DS.xlsx` với nhân khẩu trong CSDL (dò CCCD trước, sau đó dò họ tên), hiển thị lệch tên/ngày sinh/địa chỉ/giới tính, gợi ý ứng viên, xác nhận “đúng hộ” kèm 2 tuỳ chọn chấp nhận lệch năm sinh/địa chỉ.

## Yêu cầu

- Node.js **20+**
- SQL Server **2008 R2 trở lên** (mã nguồn đã xử lý tương thích 2008 R2)
- Tài khoản SQL có quyền đọc các bảng: `HouseHold`, `Personal`, `Relation`, `Region`, `Address`, `Invalid`, `Personal_CccdMapLog`, `MIS_ImportBatch`

## Cài đặt

```powershell
npm install
```

Tạo file cấu hình:

```powershell
Copy-Item server/.env.example server/.env
```

Sửa `server/.env` theo môi trường thật:

```dotenv
DB_SERVER=192.168.1.10
DB_PORT=1433
DB_NAME=NHONAI
DB_USER=qlnd_app
DB_PASSWORD=mat_khau_cua_ban
DB_TRUSTED=false
DB_ENCRYPT=false
DB_TRUST_SERVER_CERT=true

PORT=3001
DEMO_MODE=false
NODE_ENV=development
```

> Không commit `server/.env` hoặc file chứa mật khẩu. `.env` đã nằm trong `.gitignore`.

### Chạy chế độ phát triển

```powershell
npm run dev
```

- API: http://localhost:3001
- Web (Vite): http://localhost:5173 (proxy `/api` sang API)

### Chạy bằng dữ liệu mẫu (không cần SQL Server)

```powershell
npm run dev:demo
```

Hoặc chỉ chạy API demo:

```powershell
npm run dev:demo --workspace server
```

### Chạy bản build

```powershell
npm run build
npm start
```

Server phục vụ luôn `web/dist` tại http://localhost:3001.

> Trên Windows, nếu PowerShell chặn `npm.ps1`, dùng `npm.cmd` hoặc:
> `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass`

## Biến môi trường

| Biến | Mặc định | Mô tả |
| --- | --- | --- |
| `DB_SERVER` | `localhost` | Tên máy chủ / IP SQL Server |
| `DB_PORT` | `1433` | Cổng SQL Server |
| `DB_NAME` | `NHONAI` | Tên database |
| `DB_INSTANCE` | — | Tên instance (nếu dùng named instance) |
| `DB_USER` / `DB_PASSWORD` | — | Tài khoản SQL Server |
| `DB_TRUSTED` | `false` | `true` = Windows Authentication (cần `msnodesqlv8`) |
| `DB_ENCRYPT` | `false` | Mã hoá kết nối |
| `DB_TRUST_SERVER_CERT` | `true` | Bỏ qua kiểm tra chứng chỉ tự ký |
| `DB_POOL_MAX` | `10` | Số kết nối tối đa trong pool |
| `PORT` | `3001` | Cổng API |
| `DEMO_MODE` | `false` | `true` = dùng dữ liệu mẫu trong bộ nhớ |
| `CORS_ORIGIN` | `*` | Origin được phép gọi API |
| `RECONCILE_FILE` | `Xã Nhơn Ái DS.xlsx` | File Excel rà soát (tương đối từ thư mục gốc hoặc tuyệt đối) |
| `RECONCILE_SHEET` | — | Tên sheet cần đọc (bỏ trống = sheet đầu tiên) |
| `RECONCILE_REGION_ID` | `9203831315` | `Region_ID` của xã cần đối chiếu |
| `RECONCILE_DATA_DIR` | `server/data` | Thư mục lưu file xác nhận JSON |
| `RECONCILE_DB_CACHE_MS` | `300000` | Thời gian cache nhân khẩu tải từ SQL Server (ms) |

## API

| Phương thức | Đường dẫn | Mô tả |
| --- | --- | --- |
| `GET` | `/api/health` | Kiểm tra kết nối, tên DB/login/server |
| `GET` | `/api/stats?includeInactive=0` | Số liệu tổng quan |
| `GET` | `/api/households?q=&cccd=&includeInactive=0&page=1&pageSize=20` | Danh sách hộ |
| `GET` | `/api/households/:id?includeInactive=0` | Chi tiết hộ + thành viên |
| `GET` | `/api/personal/:id/logs?page=1&pageSize=10` | Lịch sử ánh xạ của nhân khẩu |
| `GET` | `/api/logs?q=&page=1&pageSize=20` | Nhật ký ánh xạ toàn hệ thống |
| `GET` | `/api/reconcile?q=&issue=all&page=1&pageSize=50&refresh=0` | Đối chiếu Excel với nhân khẩu của xã |
| `POST` | `/api/reconcile/confirm` | Lưu/bỏ xác nhận một dòng Excel |

Giá trị `cccd`: `all` | `has` | `none` | `partial` | `unmapped`.

Giá trị `issue` của `/api/reconcile`: `all` | `ok` | `name` | `sex` | `dob` | `address` | `cccd-diff` | `not-inserted` | `not-found` | `confirmed` | `unconfirmed` | `duplicates`. `refresh=1` buộc đọc lại file Excel và tải lại nhân khẩu từ SQL Server (bỏ cache).

Body của `POST /api/reconcile/confirm`:

```json
{
  "stt": 1,
  "cccd": "092029002492",
  "confirmed": true,
  "acceptDobDiff": false,
  "acceptAddressDiff": true,
  "personalId": 12345,
  "note": "Đã kiểm tra giấy tờ"
}
```

Gửi `confirmed: false` (kèm các cờ `false`, ghi chú rỗng) để bỏ xác nhận.

## Quy ước nghiệp vụ

- **Chủ hộ:** nhân khẩu có `Personal.Relation_Code = '0'`. Nếu hộ không có chủ hộ, UI hiển thị “Chưa xác định chủ hộ”.
- **Nhân khẩu đang theo dõi:** `Person_Status NOT IN ('D','G','R')` (hoặc `NULL`).
- **Hộ đang theo dõi:** `HouseHold_Status NOT IN ('D','G')` (hoặc `NULL`).
- **CCCD hiện tại:** `Personal.Cccd_Bhyt_Code` (đã trim, chuỗi rỗng coi như chưa có). `CCCD_Old` là số cũ.
- **Đã ánh xạ:** `Personal.CCCD_Mapped = 1` (kiểu `bit`).
- **Hộ chưa có CCCD:** không có nhân khẩu đang theo dõi nào có `Cccd_Bhyt_Code`.
- **Hộ thiếu CCCD:** có ít nhất một nhân khẩu có CCCD và vẫn còn người chưa có.
- **Chưa ánh xạ:** số người `CCCD_Mapped = 1` nhỏ hơn tổng số nhân khẩu của hộ.
- **`HouseHold_Number`:** thực tế chứa **tên hộ/chủ hộ trên sổ**, không phải số. UI ghi rõ “Tên hộ trên sổ”.
- **`HouseHold_Code` không duy nhất:** cùng một mã (ví dụ `00003`) có thể xuất hiện ở nhiều ấp/phường. Dùng địa chỉ + tên chủ hộ để phân biệt.
- **Tìm theo tên:** database dùng collation `Vietnamese_CI_AS` nên tên chủ hộ cần gõ **đúng dấu** (ví dụ `TRƯƠNG VĂN ĐẸT`). Tìm theo mã hộ không cần dấu.
- **Tìm theo CCCD:** chỉ kích hoạt khi chuỗi nhập có **ít nhất 9 chữ số**, để mã hộ ngắn như `00003` không vô tình khớp vào đuôi số CCCD.

## Liên kết nhật ký `Personal_CccdMapLog`

Bảng log **không có khóa ngoại** tới `Personal`. Ứng dụng đối chiếu theo thứ tự:

1. `PersonalKey` có dạng `["<Personal_ID>","<Region_ID>"]` → tìm `CHARINDEX('["<id>"', PersonalKey) > 0`.
2. `OldCccd` hoặc `NewCccd` trùng CCCD hiện tại.
3. `OldCccd` hoặc `NewCccd` trùng `CCCD_Old`.

Vì vậy kết quả lịch sử mang tính **đối chiếu nghiệp vụ**, không phải quan hệ FK chặt.

## Rà soát chèn CCCD từ Excel

Luồng xử lý của `GET /api/reconcile`:

1. Đọc sheet Excel (mặc định `Xã Nhơn Ái DS.xlsx`): STT, họ tên, giới tính, ngày sinh, ấp, xã, thành phố, số CCCD.
2. Tải toàn bộ nhân khẩu thuộc các hộ có `HouseHold.Region_ID = RECONCILE_REGION_ID`.
3. Với từng dòng Excel, dò theo thứ tự:
   - trùng `Cccd_Bhyt_Code` (CCCD hiện tại);
   - trùng `CCCD_Old` (CCCD cũ);
   - trùng họ tên đã chuẩn hoá;
   - nếu vẫn không có, gợi ý ứng viên cùng token đầu/cuối của họ tên (chỉ để tham khảo, không tự động ghép).
4. So sánh họ tên, ngày sinh, giới tính, ấp/địa chỉ và số CCCD; trả về một trong các trạng thái `ok`, `name`, `sex`, `dob`, `address`, `cccd-diff`, `not-inserted`, `not-found`.

Quy tắc chuẩn hoá:

- Bỏ dấu tiếng Việt, khoảng trắng và ký tự thừa khi so tên.
- Tên ấp: bỏ tiền tố `Ấp`, `TT`, `Thị trấn`, `Thị tứ` (kể cả lặp nhiều lần) và đổi số La Mã `I/II/III` sang `1/2/3`.
- Ngày sinh trong Excel đọc theo serial gốc để tránh lệch múi giờ; ngày trong `Personal.DateOfBirth` có dạng `dd/mm/yyyy`.

Xác nhận đúng hộ:

- Lưu tại `RECONCILE_DATA_DIR/reconcile-confirmations.json`, khoá theo `STT` và kèm số CCCD để tránh gán nhầm nếu file Excel đổi thứ tự dòng.
- Hai cờ `acceptDobDiff` / `acceptAddressDiff` chỉ ghi nhận ngoại lệ đã kiểm tra; **không sửa dữ liệu trong SQL Server**.
- File xác nhận là dữ liệu cục bộ, đã nằm trong `.gitignore`.

Route này cần SQL Server thật; ở `DEMO_MODE` API trả `409`.

## Tương thích SQL Server 2008 R2

Database thực tế đang chạy **SQL Server 2008 R2** nên mã nguồn không dùng các tính năng mới hơn:

- Phân trang bằng `ROW_NUMBER()` thay cho `OFFSET … FETCH`.
- Không dùng `TRY_CONVERT`, `CONCAT`, `IIF`, `FORMAT`, `STRING_AGG`…
- Không join bảng `Sex` / `Sys_Users` vì database thực tế không có; giới tính suy ra từ `Sex_ID` (`0` = Nam, `1` = Nữ).
- Ngày giờ trả về dạng chuỗi `yyyy-MM-ddTHH:mm:ss` để tránh lệch múi giờ ở frontend.

## Hiệu năng

Bảng `Personal` hiện **chưa có index trên `HouseHold_ID`**, nên truy vấn danh sách/chi tiết phải quét bảng (~113.000 dòng). Trên mạng LAN, mỗi lần tải danh sách mất khoảng 1–2 giây; tìm kiếm khoảng 1–2,5 giây.

Nếu được phép thay đổi database, nên nhờ DBA xem xét thêm index:

```sql
CREATE NONCLUSTERED INDEX IX_Personal_HouseHold_ID
ON dbo.Personal (HouseHold_ID)
INCLUDE (Personal_ID, Relation_Code, Cccd_Bhyt_Code, CCCD_Mapped);
```

Ứng dụng **không tự tạo index** khi khởi động.

## Cấu trúc thư mục

```
.
├── server/
│   ├── src/
│   │   ├── index.js                 # Express routes + static web
│   │   ├── config.js                # đọc .env
│   │   ├── db.js                    # pool mssql
│   │   ├── http.js                  # parse query
│   │   ├── reconcile/
│   │   │   ├── excel.js             # đọc/chuẩn hoá Excel
│   │   │   ├── service.js           # dò, so sánh, phân trang
│   │   │   └── confirmations.js     # lưu xác nhận JSON
│   │   └── repository/
│   │       ├── sql-repository.js    # toàn bộ truy vấn SQL thật
│   │       ├── demo-repository.js   # dữ liệu mẫu
│   │       └── demo-data.js
│   └── .env.example
├── web/
│   └── src/
│       ├── App.tsx
│       ├── api.ts
│       ├── types.ts
│       ├── format.ts
│       ├── reconcileCompare.ts
│       ├── styles.css
│       └── components/
│           ├── HouseholdsView.tsx
│           ├── HouseholdTable.tsx
│           ├── HouseholdDrawer.tsx
│           ├── ReconcileView.tsx
│           ├── MemberLogsModal.tsx
│           ├── LogsPanel.tsx
│           └── …
├── DB.sql
├── ERD.html
└── README.md
```

## Kiểm tra

```powershell
npm run typecheck
npm run build
```

Đã kiểm tra với database thật:

- `/api/health` → `database: NHONAI`
- `/api/stats` → 27.881 hộ, 113.585 nhân khẩu đang theo dõi
- Tìm `00003` → 205 hộ (mã hộ lặp giữa các ấp/phường)
- Tìm CCCD `092212000937` → đúng 1 hộ (`00135`)
- Lịch sử nhân khẩu `85565` → 1 bản ghi log khớp qua `PersonalKey`

Riêng route rà soát Excel đã được kiểm tra phần đọc file và logic đối chiếu bằng dữ liệu giả lập:

- File `Xã Nhơn Ái DS.xlsx`: 33.194 dòng, 0 dòng thiếu ngày sinh, 1.090 dòng trùng CCCD trong file.
- Luồng xác nhận/bỏ xác nhận, hai cờ chấp nhận lệch, lọc và phân trang hoạt động đúng.
- Chưa đối chiếu được với dữ liệu SQL Server thật trong môi trường hiện tại vì không kết nối được tới `192.168.1.13:1433`; khi mạng thông, mở tab **Rà soát Excel** và bấm **Đọc lại Excel & CSDL** để kiểm tra số liệu thực tế.

## Ghi chú bảo mật

- File `severIPSQL.txt` trong thư mục gốc chứa thông tin đăng nhập SQL dạng văn bản thường. File này đã được thêm vào `.gitignore`; nên xoá hoặc chuyển sang nơi lưu trữ an toàn.
- Nếu thông tin đăng nhập từng bị chia sẻ ra ngoài, hãy đổi mật khẩu tài khoản SQL.
