/**
 * Dữ liệu mẫu bám theo schema thật (DB.sql / ERD.html) để chạy thử UI
 * khi chưa cấu hình SQL Server: node src/index.js --demo
 */

export const RELATIONS = {
  '0': 'Chủ hộ',
  '1': 'Vợ',
  '2': 'Chồng',
  '3': 'Con',
  '4': 'Bố',
  '5': 'Mẹ',
  '21': 'Anh',
  '22': 'Chị',
  '23': 'Em',
};

const SEXES = {
  '1': 'Nam',
  '2': 'Nữ',
};

export const REGION = {
  regionId: '92001',
  regionName: 'Xã Nhơn Ái, Huyện Phong Điền, TP. Cần Thơ',
};

const HOUSEHOLD_DEFS = [
  {
    id: 1,
    code: '00001',
    number: '01',
    address: 'Ấp Nhơn Hòa, Xã Nhơn Ái, Huyện Phong Điền, TP. Cần Thơ',
    members: [
      { id: 101, last: 'Trần', first: 'Văn Bình', relation: '0', sex: '1', dob: '12/03/1978', cccd: '092001000101' },
      { id: 102, last: 'Lê Thị', first: 'Hoa', relation: '1', sex: '2', dob: '25/07/1981', cccd: '092001000102' },
      { id: 103, last: 'Trần Minh', first: 'Khang', relation: '3', sex: '1', dob: '04/11/2012', mother: 102 },
    ],
  },
  {
    id: 2,
    code: '00002',
    number: '02',
    address: 'Ấp Nhơn Lộc, Xã Nhơn Ái, Huyện Phong Điền, TP. Cần Thơ',
    members: [
      { id: 201, last: 'Phạm Thị', first: 'Lan', relation: '0', sex: '2', dob: '19/02/1985' },
      { id: 202, last: 'Nguyễn Văn', first: 'Tú', relation: '2', sex: '1', dob: '08/09/1982', cccd: '092001000202' },
      { id: 203, last: 'Nguyễn Gia', first: 'Bảo', relation: '3', sex: '1', dob: '17/05/2015', mother: 201 },
    ],
  },
  {
    id: 3,
    code: '00003',
    number: '03',
    address: 'Ấp Thới An, Xã Nhơn Ái, Huyện Phong Điền, TP. Cần Thơ',
    members: [
      { id: 301, last: 'Nguyễn Văn', first: 'An', relation: '0', sex: '1', dob: '02/01/1975', cccd: '092001000301' },
      { id: 302, last: 'Nguyễn Thị', first: 'Mai', relation: '1', sex: '2', dob: '14/06/1979', cccd: '092001000302' },
      {
        id: 303,
        last: 'Nguyễn Văn',
        first: 'Hùng',
        relation: '3',
        sex: '1',
        dob: '21/08/2003',
        cccd: '092001000303',
        old: '079123456789',
        mapped: false,
        note: 'CCCD mới đã có trong file MIS, chờ xác nhận ánh xạ',
      },
      { id: 304, last: 'Nguyễn Thị', first: 'Ngọc', relation: '3', sex: '2', dob: '30/12/2007', mother: 302 },
    ],
  },
  {
    id: 4,
    code: '00004',
    number: '04',
    address: 'Ấp Nhơn Thuận, Xã Nhơn Ái, Huyện Phong Điền, TP. Cần Thơ',
    members: [
      { id: 401, last: 'Võ Hoàng', first: 'Nam', relation: '0', sex: '1', dob: '09/10/1970', cccd: '092001000401' },
      { id: 402, last: 'Võ Thị', first: 'Hồng', relation: '1', sex: '2', dob: '18/04/1974', cccd: '092001000402' },
      { id: 403, last: 'Võ Minh', first: 'Triết', relation: '3', sex: '1', dob: '07/07/2001', cccd: '092001000403' },
    ],
  },
  {
    id: 5,
    code: '00005',
    number: '05',
    address: 'Ấp Nhơn Phú, Xã Nhơn Ái, Huyện Phong Điền, TP. Cần Thơ',
    members: [
      { id: 501, last: 'Đặng Thị', first: 'Thu', relation: '0', sex: '2', dob: '23/03/1988' },
      { id: 502, last: 'Đặng Văn', first: 'Tài', relation: '3', sex: '1', dob: '15/01/2014', mother: 501 },
      { id: 503, last: 'Đặng Thị', first: 'Hạnh', relation: '3', sex: '2', dob: '02/09/2018', mother: 501 },
    ],
  },
  {
    id: 6,
    code: '00006',
    number: '06',
    address: 'Ấp Nhơn Hòa, Xã Nhơn Ái, Huyện Phong Điền, TP. Cần Thơ',
    members: [
      { id: 601, last: 'Bùi Văn', first: 'Tâm', relation: '0', sex: '1', dob: '11/11/1968', cccd: '092001000601' },
      { id: 602, last: 'Bùi Thị', first: 'Ánh', relation: '1', sex: '2', dob: '27/02/1972', cccd: '092001000602' },
      { id: 603, last: 'Bùi Tuấn', first: 'Kiệt', relation: '3', sex: '1', dob: '19/09/2005' },
      { id: 604, last: 'Bùi Ngọc', first: 'Diệp', relation: '3', sex: '2', dob: '13/06/2009', cccd: '092001000604', mother: 602 },
      { id: 605, last: 'Bùi Văn', first: 'Hòa', relation: '4', sex: '1', dob: '01/01/1945' },
    ],
  },
  {
    id: 7,
    code: '00007',
    number: '07',
    address: 'Ấp Nhơn Lộc, Xã Nhơn Ái, Huyện Phong Điền, TP. Cần Thơ',
    members: [
      { id: 701, last: 'Lâm Thị', first: 'Hồng', relation: '0', sex: '2', dob: '06/05/1990' },
      { id: 702, last: 'Lâm Gia', first: 'Hân', relation: '3', sex: '2', dob: '22/07/2019', mother: 701 },
    ],
  },
  {
    id: 8,
    code: '00008',
    number: '08',
    address: 'Ấp Thới An, Xã Nhơn Ái, Huyện Phong Điền, TP. Cần Thơ',
    members: [
      {
        id: 801,
        last: 'Trương Công',
        first: 'Định',
        relation: '0',
        sex: '1',
        dob: '30/04/1965',
        cccd: '092001000801',
        old: '079123456788',
        note: 'Đã điều chỉnh CCCD theo dữ liệu dân cư',
      },
      { id: 802, last: 'Trương Thị Kim', first: 'Chi', relation: '1', sex: '2', dob: '12/12/1969', cccd: '092001000802' },
    ],
  },
  {
    id: 9,
    code: '00009',
    number: '09',
    address: 'Ấp Nhơn Thuận, Xã Nhơn Ái, Huyện Phong Điền, TP. Cần Thơ',
    members: [
      { id: 901, last: 'Hồ Thị', first: 'Bích', relation: '0', sex: '2', dob: '16/08/1983', cccd: '092001000901' },
      { id: 902, last: 'Trần Thị', first: 'Tuyết', relation: '5', sex: '2', dob: '03/03/1954' },
    ],
  },
  {
    id: 10,
    code: '00010',
    number: '10',
    address: 'Ấp Nhơn Phú, Xã Nhơn Ái, Huyện Phong Điền, TP. Cần Thơ',
    members: [
      { id: 1001, last: 'Ngô Văn', first: 'Phúc', relation: '0', sex: '1', dob: '24/10/1979' },
      { id: 1002, last: 'Ngô Thị', first: 'Dung', relation: '1', sex: '2', dob: '05/06/1984' },
      { id: 1003, last: 'Ngô Quốc', first: 'Bảo', relation: '3', sex: '1', dob: '14/02/2011', mother: 1002 },
    ],
  },
  {
    id: 11,
    code: '00011',
    number: '11',
    address: 'Ấp Nhơn Hòa, Xã Nhơn Ái, Huyện Phong Điền, TP. Cần Thơ',
    members: [
      { id: 1101, last: 'Đinh Thị', first: 'Kim', relation: '0', sex: '2', dob: '08/09/1986', cccd: '092001001101' },
      { id: 1102, last: 'Phan Văn', first: 'Sơn', relation: '2', sex: '1', dob: '29/11/1981' },
      { id: 1103, last: 'Phan Gia', first: 'Linh', relation: '3', sex: '2', dob: '10/10/2016', mother: 1101 },
    ],
  },
  {
    id: 12,
    code: '00012',
    number: '12',
    address: 'Ấp Nhơn Lộc, Xã Nhơn Ái, Huyện Phong Điền, TP. Cần Thơ',
    members: [
      { id: 1201, last: 'Cao Văn', first: 'Lộc', relation: '0', sex: '1', dob: '20/01/1973', cccd: '092001001201' },
      { id: 1202, last: 'Cao Thị', first: 'Thảo', relation: '1', sex: '2', dob: '02/02/1977', cccd: '092001001202' },
    ],
  },
  {
    id: 13,
    code: '00013',
    number: '13',
    address: 'Ấp Thới An, Xã Nhơn Ái, Huyện Phong Điền, TP. Cần Thơ',
    members: [
      { id: 1301, last: 'Mai Thị', first: 'Xuân', relation: '0', sex: '2', dob: '31/12/1989' },
      { id: 1302, last: 'Mai Văn', first: 'Lợi', relation: '2', sex: '1', dob: '07/04/1987' },
      { id: 1303, last: 'Mai Thị', first: 'Ngọc', relation: '3', sex: '2', dob: '18/08/2013', mother: 1301 },
      { id: 1304, last: 'Mai Văn', first: 'Phú', relation: '4', sex: '1', dob: '15/05/1958' },
    ],
  },
  {
    id: 14,
    code: '00014',
    number: '14',
    address: 'Ấp Nhơn Thuận, Xã Nhơn Ái, Huyện Phong Điền, TP. Cần Thơ',
    members: [
      { id: 1401, last: 'Phan Văn', first: 'Dũng', relation: '0', sex: '1', dob: '26/06/1980', cccd: '092001001401' },
      {
        id: 1402,
        last: 'Phan Thị',
        first: 'Hà',
        relation: '1',
        sex: '2',
        dob: '09/09/1984',
        cccd: '092001001402',
        mapped: false,
        note: 'Có số CCCD nhưng chưa đánh dấu ánh xạ',
      },
    ],
  },
  {
    id: 15,
    code: '00015',
    number: '15',
    address: 'Ấp Nhơn Phú, Xã Nhơn Ái, Huyện Phong Điền, TP. Cần Thơ',
    members: [
      { id: 1501, last: 'Trần Thị', first: 'Mỹ', relation: '0', sex: '2', dob: '13/07/1976', cccd: '092001001501' },
      { id: 1502, last: 'Trần Văn', first: 'Khôi', relation: '2', sex: '1', dob: '28/08/1974', cccd: '092001001502' },
      { id: 1503, last: 'Trần Gia', first: 'Huy', relation: '3', sex: '1', dob: '04/04/2004', cccd: '092001001503', mother: 1501 },
      { id: 1504, last: 'Trần Gia', first: 'Bảo', relation: '3', sex: '1', dob: '06/06/2008', cccd: '092001001504', mother: 1501 },
    ],
  },
  {
    id: 16,
    code: '00016',
    number: '16',
    address: 'Ấp Nhơn Hòa, Xã Nhơn Ái, Huyện Phong Điền, TP. Cần Thơ',
    status: 'D',
    notes: 'Hộ đã chuyển đi (dữ liệu lịch sử)',
    members: [
      { id: 1601, last: 'Nguyễn Hữu', first: 'Thành', relation: '0', sex: '1', dob: '05/05/1971', cccd: '092001001601', old: '079123456787' },
      { id: 1602, last: 'Nguyễn Thị', first: 'Lệ', relation: '1', sex: '2', dob: '10/10/1975' },
    ],
  },
];

export const BATCHES = [
  {
    batchId: '11111111-1111-4111-8111-111111111111',
    importedAt: '2025-12-15T08:30:00',
    fileName: 'MIS_CCCD_2025_12.xlsx',
    sheetName: 'Sheet1',
    importedBy: 'Nguyễn Thị Thu Hà',
  },
  {
    batchId: '22222222-2222-4222-8222-222222222222',
    importedAt: '2026-10-18T14:05:00',
    fileName: 'MIS_CCCD_2026_10.xlsx',
    sheetName: 'DanhSach',
    importedBy: 'Trần Quốc Việt',
  },
  {
    batchId: '33333333-3333-4333-8333-333333333333',
    importedAt: '2026-10-22T09:40:00',
    fileName: 'DIEU_CHINH_CCCD_2026_10.xlsx',
    sheetName: 'DieuChinh',
    importedBy: 'Nguyễn Thị Thu Hà',
  },
];

const LOG_DEFS = [
  { id: 1, batch: 0, person: 101, old: null, next: '092001000101', bhytOld: null, bhytNew: 'CT20100001', at: '2025-12-15T09:05:00', by: 'Nguyễn Thị Thu Hà' },
  { id: 2, batch: 0, person: 102, old: null, next: '092001000102', bhytOld: null, bhytNew: 'CT20100002', at: '2025-12-15T09:07:00', by: 'Nguyễn Thị Thu Hà' },
  { id: 3, batch: 0, person: 301, old: null, next: '092001000301', bhytOld: null, bhytNew: 'CT20100003', at: '2025-12-15T09:12:00', by: 'Nguyễn Thị Thu Hà' },
  { id: 4, batch: 0, person: 401, old: null, next: '092001000401', bhytOld: null, bhytNew: 'CT20100004', at: '2025-12-15T09:20:00', by: 'Nguyễn Thị Thu Hà' },
  { id: 5, batch: 1, person: 601, old: null, next: '092001000601', bhytOld: null, bhytNew: 'CT20100601', at: '2026-10-18T14:20:00', by: 'Trần Quốc Việt' },
  { id: 6, batch: 1, person: 604, old: null, next: '092001000604', bhytOld: null, bhytNew: 'CT20100604', at: '2026-10-18T14:22:00', by: 'Trần Quốc Việt' },
  { id: 7, batch: 1, person: 901, old: null, next: '092001000901', bhytOld: null, bhytNew: 'CT20100901', at: '2026-10-18T14:28:00', by: 'Trần Quốc Việt' },
  { id: 8, batch: 1, person: 1201, old: null, next: '092001001201', bhytOld: null, bhytNew: 'CT20101201', at: '2026-10-18T14:31:00', by: 'Trần Quốc Việt' },
  {
    id: 9,
    batch: 2,
    person: 303,
    old: '079123456789',
    next: '092001000303',
    bhytOld: 'CT07900303',
    bhytNew: 'CT20100303',
    at: '2026-10-22T10:02:00',
    by: 'Nguyễn Thị Thu Hà',
    note: 'Điều chỉnh CCCD theo dữ liệu dân cư quốc gia',
  },
  {
    id: 10,
    batch: 2,
    person: 801,
    old: '079123456788',
    next: '092001000801',
    bhytOld: 'CT07900801',
    bhytNew: 'CT20100801',
    at: '2026-10-22T10:12:00',
    by: 'Nguyễn Thị Thu Hà',
    note: 'CCCD được cấp lại, cập nhật cả BHYT',
  },
  {
    id: 11,
    batch: 2,
    person: 1402,
    old: null,
    next: '092001001402',
    bhytOld: null,
    bhytNew: 'CT20101402',
    at: '2026-10-22T10:25:00',
    by: 'Trần Quốc Việt',
    note: 'Đã nhập số CCCD, chưa xác nhận ánh xạ',
  },
  {
    id: 12,
    batch: 2,
    person: 1601,
    old: '079123456787',
    next: '092001001601',
    bhytOld: 'CT07901601',
    bhytNew: 'CT20101601',
    at: '2026-10-22T10:40:00',
    by: 'Nguyễn Thị Thu Hà',
    note: 'Hộ đã chuyển đi, cập nhật bản ghi lịch sử',
  },
];

function buildPersonal() {
  const people = [];

  for (const household of HOUSEHOLD_DEFS) {
    for (const def of household.members) {
      people.push({
        houseHoldId: household.id,
        personalId: def.id,
        lastName: def.last,
        firstName: def.first,
        fullName: `${def.last} ${def.first}`.trim(),
        relationCode: def.relation,
        relationName: RELATIONS[def.relation] ?? 'Khác',
        sexId: def.sex,
        sexName: SEXES[def.sex] ?? '',
        dateOfBirth: def.dob,
        personStatus: def.status ?? null,
        invalidCode: null,
        invalidName: null,
        cccd: def.cccd ?? null,
        cccdOld: def.old ?? null,
        cccdMapped: def.cccd ? def.mapped !== false : false,
        startDate: '2015-04-12T00:00:00',
        endDate: null,
        notes: def.note ?? null,
        motherId: def.mother ?? null,
        motherName: null,
        updatedById: 2,
        updatedByName: 'Nguyễn Thị Thu Hà',
      });
    }
  }

  const byId = new Map(people.map((person) => [person.personalId, person]));
  for (const person of people) {
    person.motherName = person.motherId ? byId.get(person.motherId)?.fullName ?? null : null;
  }

  return people;
}

export const PERSONAL = buildPersonal();

export const HOUSEHOLDS = HOUSEHOLD_DEFS.map((def) => {
  const head = def.members.find((member) => member.relation === '0');

  return {
    houseHoldId: def.id,
    houseHoldCode: def.code,
    // Giống dữ liệu thật: HouseHold_Number lưu tên hộ/chủ hộ trên sổ.
    houseHoldNumber: head ? `${head.last} ${head.first}`.trim() : def.number,
    houseHoldStatus: def.status ?? null,
    regionId: REGION.regionId,
    regionName: REGION.regionName,
    addressId: def.id,
    addressName: def.address.split(',')[0].trim(),
    fullAddress: def.address,
    isBigHouseHold: def.members.length >= 6,
    notes: def.notes ?? null,
  };
});

export const LOGS = LOG_DEFS.map((def) => {
  const batch = BATCHES[def.batch];
  const person = PERSONAL.find((item) => item.personalId === def.person);

  return {
    id: String(def.id),
    batchId: batch.batchId,
    tempId: String(90000 + def.id),
    personalTable: 'Personal',
    personalKey: String(def.person),
    oldCccd: def.old,
    newCccd: def.next,
    oldBhyt: def.bhytOld,
    newBhyt: def.bhytNew,
    cccdChanged: def.old !== def.next,
    bhytChanged: def.bhytOld !== def.bhytNew,
    changedAt: def.at,
    changedBy: def.by,
    detailsJson: JSON.stringify({
      source: 'MIS',
      personalId: def.person,
      fullName: person?.fullName ?? null,
      oldValue: def.old,
      newValue: def.next,
      note: def.note ?? 'Đồng bộ CCCD/BHYT từ file import',
    }),
    fileName: batch.fileName,
    sheetName: batch.sheetName,
    importedBy: batch.importedBy,
    importedAt: batch.importedAt,
  };
});
