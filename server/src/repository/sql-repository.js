import { config } from '../config.js';
import { closePool, getPool, runQuery, sql } from '../db.js';

const PERSON_NAME = (alias) =>
  `LTRIM(RTRIM(ISNULL(${alias}.Last_Name, N'') + N' ' + ISNULL(${alias}.First_Name, N'')))`;

const ACTIVE_PERSON = (alias) =>
  `(${alias}.Person_Status IS NULL OR ${alias}.Person_Status NOT IN ('D', 'G', 'R'))`;

const ACTIVE_HOUSEHOLD = (alias) =>
  `(${alias}.HouseHold_Status IS NULL OR ${alias}.HouseHold_Status NOT IN ('D', 'G'))`;

/** Escape ký tự đại diện để người dùng nhập '%' hay '_' vẫn tìm đúng nghĩa. */
function likePattern(value) {
  const input = String(value ?? '').trim();
  if (!input) return '%%';
  const escaped = input.replace(/[%_\[]/g, (ch) => (ch === '[' ? '[[]' : `[${ch}]`));
  return `%${escaped}%`;
}

/* ------------------------------------------------------------------ */
/* Hộ gia đình                                                         */
/* ------------------------------------------------------------------ */

const HOUSEHOLD_CTES = `
WITH H AS (
  SELECT h.HouseHold_ID, h.HouseHold_Code, h.HouseHold_Number, h.HouseHold_Status,
         h.Region_ID, h.Address_ID, h.Start_Date, h.End_Date, h.Notes,
         h.IsBigHouseHold
  FROM dbo.HouseHold h
  WHERE (@includeInactive = 1 OR ${ACTIVE_HOUSEHOLD('h')})
),
P AS (
  SELECT p.HouseHold_ID, p.Personal_ID, p.Relation_Code,
         NULLIF(LTRIM(RTRIM(p.Cccd_Bhyt_Code)), '') AS Cccd,
         p.CCCD_Mapped,
         ${PERSON_NAME('p')} AS Full_Name
  FROM dbo.Personal p
  INNER JOIN H h ON h.HouseHold_ID = p.HouseHold_ID
  WHERE (@includeInactive = 1 OR ${ACTIVE_PERSON('p')})
),
M AS (
  SELECT HouseHold_ID,
         COUNT(*) AS Member_Count,
         COUNT(Cccd) AS Cccd_Count,
         SUM(CASE WHEN CCCD_Mapped = 1 THEN 1 ELSE 0 END) AS Mapped_Count,
         SUM(CASE WHEN Cccd IS NULL THEN 1 ELSE 0 END) AS Missing_Cccd_Count
  FROM P
  GROUP BY HouseHold_ID
),
HD AS (
  SELECT HouseHold_ID, Personal_ID, Full_Name, Relation_Code, Cccd, CCCD_Mapped,
         ROW_NUMBER() OVER (
           PARTITION BY HouseHold_ID
           ORDER BY CASE WHEN Relation_Code = '0' THEN 0 ELSE 1 END, Personal_ID
         ) AS rn
  FROM P
)`;

const HOUSEHOLD_FROM_WHERE = `
FROM H h
LEFT JOIN dbo.Address a
       ON a.Address_ID = h.Address_ID
      AND a.Region_ID = h.Region_ID
LEFT JOIN dbo.Region rg ON rg.Region_ID = h.Region_ID
LEFT JOIN M m ON m.HouseHold_ID = h.HouseHold_ID
LEFT JOIN HD hd ON hd.HouseHold_ID = h.HouseHold_ID AND hd.rn = 1
LEFT JOIN dbo.Relation hr ON hr.Relation_Code = hd.Relation_Code
WHERE (@q = N'' OR
       h.HouseHold_Code LIKE @like OR
       hd.Full_Name LIKE @like OR
       (@searchCccd = 1 AND (hd.Cccd LIKE @like OR
         EXISTS (SELECT 1 FROM P px
                 WHERE px.HouseHold_ID = h.HouseHold_ID
                   AND px.Cccd LIKE @like))))
  AND (
       @cccd = 'all'
       OR (@cccd = 'has' AND ISNULL(m.Cccd_Count, 0) > 0)
       OR (@cccd = 'none' AND ISNULL(m.Cccd_Count, 0) = 0)
       OR (@cccd = 'partial' AND ISNULL(m.Cccd_Count, 0) > 0 AND ISNULL(m.Missing_Cccd_Count, 0) > 0)
       OR (@cccd = 'unmapped' AND ISNULL(m.Mapped_Count, 0) < ISNULL(m.Member_Count, 0))
  )`;

const HOUSEHOLD_SELECT = `
SELECT
  h.HouseHold_ID                AS houseHoldId,
  h.HouseHold_Code              AS houseHoldCode,
  h.HouseHold_Number            AS houseHoldNumber,
  CASE
    WHEN h.HouseHold_Code <> '' AND h.HouseHold_Code NOT LIKE '%[^0-9]%'
      THEN CAST(h.HouseHold_Code AS bigint)
    ELSE NULL
  END                           AS codeSort,
  h.HouseHold_Status            AS houseHoldStatus,
  h.Region_ID                   AS regionId,
  rg.Region_Name                AS regionName,
  h.Address_ID                  AS addressId,
  a.Address_Name                AS addressName,
  a.Full_Address                AS fullAddress,
  h.IsBigHouseHold              AS isBigHouseHold,
  h.Notes                       AS notes,
  hd.Personal_ID                AS headPersonalId,
  hd.Full_Name                  AS headName,
  hd.Relation_Code              AS headRelationCode,
  hr.Relation_Name              AS headRelationName,
  hd.Cccd                       AS headCccd,
  hd.CCCD_Mapped                AS headCccdMapped,
  ISNULL(m.Member_Count, 0)     AS memberCount,
  ISNULL(m.Cccd_Count, 0)       AS cccdCount,
  ISNULL(m.Mapped_Count, 0)     AS mappedCount,
  ISNULL(m.Missing_Cccd_Count, 0) AS missingCccdCount`;

const MEMBER_SELECT = `
SELECT
  p.Personal_ID                 AS personalId,
  ${PERSON_NAME('p')}           AS fullName,
  p.Last_Name                   AS lastName,
  p.First_Name                  AS firstName,
  p.Relation_Code               AS relationCode,
  rl.Relation_Name              AS relationName,
  p.Sex_ID                      AS sexId,
  CASE p.Sex_ID WHEN '0' THEN N'Nam' WHEN '1' THEN N'Nữ' ELSE NULL END AS sexName,
  p.DateOfBirth                 AS dateOfBirth,
  p.Person_Status               AS personStatus,
  p.Invalid_Code                AS invalidCode,
  iv.Invalid_Name               AS invalidName,
  NULLIF(LTRIM(RTRIM(p.Cccd_Bhyt_Code)), '') AS cccd,
  NULLIF(LTRIM(RTRIM(p.CCCD_Old)), '')       AS cccdOld,
  p.CCCD_Mapped                 AS cccdMapped,
  CONVERT(varchar(33), p.Start_Date, 126) AS startDate,
  CONVERT(varchar(33), p.End_Date, 126)   AS endDate,
  p.Notes                       AS notes,
  p.Mother_ID                   AS motherId,
  (SELECT TOP (1) ${PERSON_NAME('m')}
     FROM dbo.Personal m
    WHERE m.Personal_ID = p.Mother_ID) AS motherName,
  p.USER_ID                     AS updatedById,
  CAST(NULL AS nvarchar(100))   AS updatedByName
FROM dbo.Personal p
LEFT JOIN dbo.Relation rl ON rl.Relation_Code = p.Relation_Code
LEFT JOIN dbo.Invalid iv ON iv.Invalid_Code = p.Invalid_Code
WHERE p.HouseHold_ID = @houseHoldId
  AND (@includeInactive = 1 OR ${ACTIVE_PERSON('p')})
ORDER BY CASE WHEN p.Relation_Code = '0' THEN 0 ELSE 1 END, p.Personal_ID`;

function householdParams({ q, cccd, includeInactive, page, pageSize }) {
  // Chỉ tìm theo CCCD khi chuỗi nhập đủ dài, tránh mã hộ ngắn khớp vào đuôi số CCCD.
  const searchCccd = /^\d{9,}$/.test(String(q ?? '').trim());

  return {
    includeInactive: [sql.Bit, includeInactive ? 1 : 0],
    q: [sql.NVarChar(200), q || ''],
    like: [sql.NVarChar(420), likePattern(q)],
    cccd: [sql.NVarChar(20), cccd || 'all'],
    searchCccd: [sql.Bit, searchCccd ? 1 : 0],
    offset: [sql.Int, (page - 1) * pageSize],
    pageSize: [sql.Int, pageSize],
  };
}

/* ------------------------------------------------------------------ */
/* Nhật ký ánh xạ CCCD                                                 */
/* ------------------------------------------------------------------ */

const LOG_FROM_WHERE = `
FROM dbo.Personal_CccdMapLog l
LEFT JOIN dbo.MIS_ImportBatch b ON b.BatchId = l.BatchId
WHERE (
       (@personalId IS NULL AND @cccd IS NULL AND @cccdOld IS NULL)
       OR l.PersonalKey = CONVERT(nvarchar(128), @personalId)
       -- PersonalKey có dạng '["<Personal_ID>","<Region_ID>"]'
       OR CHARINDEX(N'["' + CONVERT(nvarchar(20), @personalId) + N'"', l.PersonalKey) > 0
       OR (@cccd IS NOT NULL AND (l.OldCccd = @cccd OR l.NewCccd = @cccd))
       OR (@cccdOld IS NOT NULL AND (l.OldCccd = @cccdOld OR l.NewCccd = @cccdOld))
      )
  AND (@q = N'' OR
       l.PersonalKey LIKE @like OR
       l.OldCccd LIKE @like OR
       l.NewCccd LIKE @like OR
       l.ChangedBy LIKE @like OR
       l.PersonalTable LIKE @like OR
       b.FileName LIKE @like)`;

const LOG_SELECT = `
SELECT
  CONVERT(nvarchar(30), l.Id)       AS id,
  CONVERT(nvarchar(36), l.BatchId)  AS batchId,
  CONVERT(nvarchar(30), l.TempId)   AS tempId,
  l.PersonalTable                   AS personalTable,
  l.PersonalKey                     AS personalKey,
  NULLIF(LTRIM(RTRIM(l.OldCccd)), '') AS oldCccd,
  NULLIF(LTRIM(RTRIM(l.NewCccd)), '') AS newCccd,
  NULLIF(LTRIM(RTRIM(l.OldBhyt)), '') AS oldBhyt,
  NULLIF(LTRIM(RTRIM(l.NewBhyt)), '') AS newBhyt,
  l.CccdChanged                     AS cccdChanged,
  l.BhytChanged                     AS bhytChanged,
  CONVERT(varchar(33), l.ChangedAt, 126) AS changedAt,
  l.ChangedBy                       AS changedBy,
  l.DetailsJson                     AS detailsJson,
  b.FileName                        AS fileName,
  b.SheetName                       AS sheetName,
  b.ImportedBy                      AS importedBy,
  CONVERT(varchar(33), b.ImportedAt, 126) AS importedAt`;

function normalizeCode(value) {
  const text = String(value ?? '').trim();
  return text === '' ? null : text;
}

function logParams({ q, personalId, cccd, cccdOld, page, pageSize }) {
  return {
    q: [sql.NVarChar(200), q || ''],
    like: [sql.NVarChar(420), likePattern(q)],
    personalId: [sql.Int, personalId ?? null],
    cccd: [sql.NVarChar(128), normalizeCode(cccd)],
    cccdOld: [sql.NVarChar(128), normalizeCode(cccdOld)],
    offset: [sql.Int, (page - 1) * pageSize],
    pageSize: [sql.Int, pageSize],
  };
}

/* ------------------------------------------------------------------ */

export class SqlRepository {
  async init() {
    await getPool();
  }

  async health() {
    const rows = await runQuery(
      'SELECT DB_NAME() AS databaseName, SUSER_SNAME() AS loginName, @@SERVERNAME AS serverName',
    );
    const row = rows[0] ?? {};
    return {
      database: row.databaseName ?? config.db.database,
      login: row.loginName ?? null,
      server: row.serverName ?? config.db.server,
    };
  }

  async stats(includeInactive) {
    const sqlText = `
WITH H AS (
  SELECT h.HouseHold_ID
  FROM dbo.HouseHold h
  WHERE (@includeInactive = 1 OR ${ACTIVE_HOUSEHOLD('h')})
),
P AS (
  SELECT p.HouseHold_ID,
         NULLIF(LTRIM(RTRIM(p.Cccd_Bhyt_Code)), '') AS Cccd,
         p.CCCD_Mapped
  FROM dbo.Personal p
  INNER JOIN H h ON h.HouseHold_ID = p.HouseHold_ID
  WHERE (@includeInactive = 1 OR ${ACTIVE_PERSON('p')})
),
HP AS (
  SELECT HouseHold_ID, COUNT(*) AS Members, COUNT(Cccd) AS CccdCount
  FROM P
  GROUP BY HouseHold_ID
)
SELECT
  (SELECT COUNT(*) FROM H) AS totalHouseholds,
  (SELECT COUNT(*) FROM HP WHERE CccdCount > 0) AS householdsWithCccd,
  (SELECT COUNT(*) FROM H h
    WHERE NOT EXISTS (SELECT 1 FROM HP x WHERE x.HouseHold_ID = h.HouseHold_ID AND x.CccdCount > 0))
    AS householdsWithoutCccd,
  (SELECT COUNT(*) FROM HP WHERE CccdCount > 0 AND CccdCount < Members) AS householdsPartial,
  (SELECT COUNT(*) FROM P) AS totalMembers,
  (SELECT COUNT(*) FROM P WHERE Cccd IS NULL) AS membersWithoutCccd,
  (SELECT COUNT(*) FROM P WHERE CCCD_Mapped = 0) AS membersUnmapped`;

    const rows = await runQuery(sqlText, {
      includeInactive: [sql.Bit, includeInactive ? 1 : 0],
    });
    return rows[0] ?? {};
  }

  async listHouseholds({ q, cccd, includeInactive, page, pageSize }) {
    const params = householdParams({ q, cccd, includeInactive, page, pageSize });

    const countText = `${HOUSEHOLD_CTES}
SELECT COUNT(*) AS total
${HOUSEHOLD_FROM_WHERE}`;

    // SQL Server 2008 R2 không hỗ trợ OFFSET/FETCH nên dùng ROW_NUMBER().
    const itemsText = `${HOUSEHOLD_CTES},
X AS (
${HOUSEHOLD_SELECT}
${HOUSEHOLD_FROM_WHERE}
)
SELECT R.*
FROM (
  SELECT X.*,
         ROW_NUMBER() OVER (
           ORDER BY CASE WHEN X.codeSort IS NULL THEN 1 ELSE 0 END,
                    X.codeSort, X.houseHoldCode, X.houseHoldId
         ) AS rowNum
  FROM X
) R
WHERE R.rowNum > @offset AND R.rowNum <= @offset + @pageSize
ORDER BY R.rowNum`;

    const [countRows, itemRows] = await Promise.all([
      runQuery(countText, params),
      runQuery(itemsText, params),
    ]);

    return {
      items: itemRows,
      total: Number(countRows[0]?.total ?? 0),
    };
  }

  async getHousehold(houseHoldId, includeInactive) {
    const params = {
      ...householdParams({
        q: '',
        cccd: 'all',
        includeInactive,
        page: 1,
        pageSize: 1,
      }),
      houseHoldId: [sql.Int, houseHoldId],
    };

    const detailText = `${HOUSEHOLD_CTES}
${HOUSEHOLD_SELECT}
${HOUSEHOLD_FROM_WHERE}
  AND h.HouseHold_ID = @houseHoldId`;

    const [detailRows, memberRows] = await Promise.all([
      runQuery(detailText, params),
      runQuery(MEMBER_SELECT, {
        houseHoldId: [sql.Int, houseHoldId],
        includeInactive: [sql.Bit, includeInactive ? 1 : 0],
      }),
    ]);

    if (!detailRows.length) return null;
    return { ...detailRows[0], members: memberRows };
  }

  async getRegion(regionId) {
    const rows = await runQuery(
      `SELECT TOP (1)
         r.Region_ID   AS regionId,
         r.Region_Name AS regionName
       FROM dbo.Region r
       WHERE r.Region_ID = @regionId`,
      { regionId: [sql.VarChar(15), regionId] },
    );

    return rows[0] ?? null;
  }

  /**
   * Toàn bộ nhân khẩu thuộc các hộ của một xã, kèm hộ/địa chỉ để đối chiếu Excel.
   * Không dùng OUTER APPLY tìm chủ hộ vì Personal chưa có index trên HouseHold_ID
   * (sẽ thành 40k lần quét bảng); chủ hộ được suy ra trong JS từ Relation_Code = '0'.
   */
  async listReconcilePersons(regionId) {
    const rows = await runQuery(
      `SELECT
         p.Personal_ID                 AS personalId,
         p.Last_Name                   AS lastName,
         p.First_Name                  AS firstName,
         LTRIM(RTRIM(ISNULL(p.Last_Name, N'') + N' ' + ISNULL(p.First_Name, N''))) AS fullName,
         p.DateOfBirth                 AS dateOfBirth,
         p.Sex_ID                      AS sexId,
         NULLIF(LTRIM(RTRIM(p.Cccd_Bhyt_Code)), '') AS cccd,
         NULLIF(LTRIM(RTRIM(p.CCCD_Old)), '')       AS cccdOld,
         p.CCCD_Mapped                 AS cccdMapped,
         p.Person_Status               AS personStatus,
         p.Relation_Code               AS relationCode,
         rl.Relation_Name              AS relationName,
         p.HouseHold_ID                AS houseHoldId,
         h.HouseHold_Code              AS houseHoldCode,
         h.HouseHold_Number            AS houseHoldNumber,
         h.HouseHold_Status            AS houseHoldStatus,
         h.Region_ID                   AS regionId,
         rg.Region_Name                AS regionName,
         a.Address_ID                  AS addressId,
         a.Address_Name                AS addressName,
         a.Full_Address                AS fullAddress
       FROM dbo.Personal p
       INNER JOIN dbo.HouseHold h ON h.HouseHold_ID = p.HouseHold_ID
       LEFT JOIN dbo.Address a
              ON a.Address_ID = h.Address_ID
             AND a.Region_ID = h.Region_ID
       LEFT JOIN dbo.Relation rl ON rl.Relation_Code = p.Relation_Code
       LEFT JOIN dbo.Region rg ON rg.Region_ID = h.Region_ID
       WHERE h.Region_ID = @regionId`,
      { regionId: [sql.VarChar(15), regionId] },
    );

    return rows;
  }


  async listLogs({ q, personalId, cccd, cccdOld, page, pageSize }) {
    const params = logParams({ q, personalId, cccd, cccdOld, page, pageSize });

    const countText = `SELECT COUNT(*) AS total ${LOG_FROM_WHERE}`;
    const itemsText = `SELECT R.*
FROM (
  ${LOG_SELECT},
  ROW_NUMBER() OVER (ORDER BY l.ChangedAt DESC, l.Id DESC) AS rowNum
  ${LOG_FROM_WHERE}
) R
WHERE R.rowNum > @offset AND R.rowNum <= @offset + @pageSize
ORDER BY R.rowNum`;

    const [countRows, itemRows] = await Promise.all([
      runQuery(countText, params),
      runQuery(itemsText, params),
    ]);

    return {
      items: itemRows,
      total: Number(countRows[0]?.total ?? 0),
    };
  }

  async getPersonalLogs(personalId, { page, pageSize }) {
    const personRows = await runQuery(
      `SELECT TOP (1)
         p.Personal_ID AS personalId,
         ${PERSON_NAME('p')} AS fullName,
         NULLIF(LTRIM(RTRIM(p.Cccd_Bhyt_Code)), '') AS cccd,
         NULLIF(LTRIM(RTRIM(p.CCCD_Old)), '')       AS cccdOld,
         p.CCCD_Mapped AS cccdMapped,
         p.HouseHold_ID AS houseHoldId
       FROM dbo.Personal p
       WHERE p.Personal_ID = @personalId`,
      { personalId: [sql.Int, personalId] },
    );

    if (!personRows.length) return null;
    const person = personRows[0];
    const logs = await this.listLogs({
      q: '',
      personalId,
      cccd: person.cccd,
      cccdOld: person.cccdOld,
      page,
      pageSize,
    });

    return { person, ...logs };
  }

  async close() {
    await closePool();
  }
}
