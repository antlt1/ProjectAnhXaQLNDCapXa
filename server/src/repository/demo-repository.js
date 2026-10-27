import { HOUSEHOLDS, LOGS, PERSONAL } from './demo-data.js';

const INACTIVE_PERSON = new Set(['D', 'G', 'R']);
const INACTIVE_HOUSEHOLD = new Set(['D', 'G']);

function normalize(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/đ/g, 'd')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function isActivePerson(person) {
  return !person.personStatus || !INACTIVE_PERSON.has(person.personStatus);
}

function isActiveHousehold(household) {
  return !household.houseHoldStatus || !INACTIVE_HOUSEHOLD.has(household.houseHoldStatus);
}

function membersOf(houseHoldId, includeInactive) {
  return PERSONAL.filter(
    (person) =>
      person.houseHoldId === houseHoldId && (includeInactive || isActivePerson(person)),
  );
}

function summarize(household, includeInactive) {
  const members = membersOf(household.houseHoldId, includeInactive);
  const head = members.find((person) => person.relationCode === '0') ?? members[0] ?? null;
  const cccdCount = members.filter((person) => Boolean(person.cccd)).length;
  const mappedCount = members.filter((person) => person.cccdMapped).length;

  return {
    ...household,
    headPersonalId: head?.personalId ?? null,
    headName: head?.fullName ?? null,
    headRelationCode: head?.relationCode ?? null,
    headRelationName: head?.relationName ?? null,
    headCccd: head?.cccd ?? null,
    headCccdMapped: head ? head.cccdMapped : null,
    memberCount: members.length,
    cccdCount,
    mappedCount,
    missingCccdCount: members.length - cccdCount,
  };
}

function paginate(items, page, pageSize) {
  const start = (page - 1) * pageSize;
  return items.slice(start, start + pageSize);
}

function matchesLogLink(log, { personalId, cccd, cccdOld }) {
  const hasFilter = personalId != null || cccd != null || cccdOld != null;
  if (!hasFilter) return true;

  if (personalId != null && log.personalKey === String(personalId)) return true;
  if (cccd && (log.oldCccd === cccd || log.newCccd === cccd)) return true;
  if (cccdOld && (log.oldCccd === cccdOld || log.newCccd === cccdOld)) return true;
  return false;
}

export class DemoRepository {
  async init() {
    // Không cần kết nối.
  }

  async health() {
    return {
      database: 'DEMO (in-memory)',
      login: 'demo',
      server: 'demo',
    };
  }

  async stats(includeInactive) {
    const households = HOUSEHOLDS.filter(
      (household) => includeInactive || isActiveHousehold(household),
    );
    const summaries = households.map((household) => summarize(household, includeInactive));

    let totalMembers = 0;
    let membersWithoutCccd = 0;
    let membersUnmapped = 0;

    for (const household of households) {
      const members = membersOf(household.houseHoldId, includeInactive);
      totalMembers += members.length;
      membersWithoutCccd += members.filter((person) => !person.cccd).length;
      membersUnmapped += members.filter((person) => !person.cccdMapped).length;
    }

    return {
      totalHouseholds: households.length,
      householdsWithCccd: summaries.filter((item) => item.cccdCount > 0).length,
      householdsWithoutCccd: summaries.filter((item) => item.cccdCount === 0).length,
      householdsPartial: summaries.filter(
        (item) => item.cccdCount > 0 && item.missingCccdCount > 0,
      ).length,
      totalMembers,
      membersWithoutCccd,
      membersUnmapped,
    };
  }

  async listHouseholds({ q, cccd, includeInactive, page, pageSize }) {
    const needle = normalize(q);
    let rows = HOUSEHOLDS.filter(
      (household) => includeInactive || isActiveHousehold(household),
    ).map((household) => summarize(household, includeInactive));

    if (needle) {
      rows = rows.filter((household) => {
        const memberMatch = membersOf(household.houseHoldId, includeInactive).some((person) =>
          normalize(person.cccd).includes(needle),
        );

        return (
          normalize(household.houseHoldCode).includes(needle) ||
          normalize(household.houseHoldNumber).includes(needle) ||
          normalize(household.headName).includes(needle) ||
          normalize(household.headCccd).includes(needle) ||
          memberMatch
        );
      });
    }

    if (cccd === 'has') rows = rows.filter((item) => item.cccdCount > 0);
    if (cccd === 'none') rows = rows.filter((item) => item.cccdCount === 0);
    if (cccd === 'partial') {
      rows = rows.filter((item) => item.cccdCount > 0 && item.missingCccdCount > 0);
    }
    if (cccd === 'unmapped') rows = rows.filter((item) => item.mappedCount < item.memberCount);

    rows.sort((left, right) => {
      const leftCode = Number.parseInt(left.houseHoldCode, 10);
      const rightCode = Number.parseInt(right.houseHoldCode, 10);
      if (Number.isFinite(leftCode) && Number.isFinite(rightCode) && leftCode !== rightCode) {
        return leftCode - rightCode;
      }
      return String(left.houseHoldCode).localeCompare(String(right.houseHoldCode));
    });

    return {
      items: paginate(rows, page, pageSize),
      total: rows.length,
    };
  }

  async getHousehold(houseHoldId, includeInactive) {
    const household = HOUSEHOLDS.find((item) => item.houseHoldId === houseHoldId);
    if (!household) return null;
    if (!includeInactive && !isActiveHousehold(household)) return null;

    return {
      ...summarize(household, includeInactive),
      members: membersOf(houseHoldId, includeInactive),
    };
  }

  async listLogs({ q, personalId, cccd, cccdOld, page, pageSize }) {
    const needle = normalize(q);
    const rows = LOGS.filter((log) => {
      if (!matchesLogLink(log, { personalId, cccd, cccdOld })) return false;
      if (!needle) return true;

      return [
        log.personalKey,
        log.oldCccd,
        log.newCccd,
        log.changedBy,
        log.personalTable,
        log.fileName,
      ].some((value) => normalize(value).includes(needle));
    }).sort((left, right) => {
      const byTime = String(right.changedAt).localeCompare(String(left.changedAt));
      if (byTime !== 0) return byTime;
      return Number(right.id) - Number(left.id);
    });

    return { items: paginate(rows, page, pageSize), total: rows.length };
  }

  async getPersonalLogs(personalId, { page, pageSize }) {
    const person = PERSONAL.find((item) => item.personalId === personalId);
    if (!person) return null;

    const logs = await this.listLogs({
      q: '',
      personalId,
      cccd: person.cccd,
      cccdOld: person.cccdOld,
      page,
      pageSize,
    });

    return {
      person: {
        personalId: person.personalId,
        fullName: person.fullName,
        cccd: person.cccd,
        cccdOld: person.cccdOld,
        cccdMapped: person.cccdMapped,
        houseHoldId: person.houseHoldId,
      },
      ...logs,
    };
  }

  async close() {
    // Không có tài nguyên cần đóng.
  }

  async getRegion(regionId) {
    return { regionId, regionName: 'DEMO (in-memory)' };
  }

  async listReconcilePersons() {
    return [];
  }
}
