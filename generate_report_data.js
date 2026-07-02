// generate_report_data.js — builds dummy data for the Custom Report Builder mockup
// Usage: node generate_report_data.js   (writes report_dummy_data.json)
// Seeded RNG so output is reproducible across runs.

const fs = require('fs');

function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(42);
const pick = (arr) => arr[Math.floor(rand() * arr.length)];
const pickWeighted = (pairs) => {
  const total = pairs.reduce((s, p) => s + p[1], 0);
  let r = rand() * total;
  for (const [val, w] of pairs) { if ((r -= w) <= 0) return val; }
  return pairs[pairs.length - 1][0];
};
const randInt = (min, max) => Math.floor(rand() * (max - min + 1)) + min;
const randFloat = (min, max, decimals = 2) => +(rand() * (max - min) + min).toFixed(decimals);
const maybe = (p) => rand() < p;
const pad = (n, len) => String(n).padStart(len, '0');
const fmtDate = (d) => d.toISOString().slice(0, 10);
const addDays = (d, n) => new Date(d.getTime() + n * 86400000);

// ---------- Lookups ----------

const DISTRICTS = ['Lincoln Unified School District', 'Riverside Community USD'];

const FACILITIES = [
  { id: 'FAC-01', name: 'Lincoln High Gymnasium', type: 'Gymnasium', building: 'Main Gym Bldg', room: 'Gym A', campus: 'Lincoln High School', parentOrg: DISTRICTS[0], childOrg: 'Lincoln High School', city: 'Fresno', state: 'CA', baseRate: 85 },
  { id: 'FAC-02', name: 'Lincoln High Auditorium', type: 'Auditorium', building: 'Performing Arts Bldg', room: 'Main Hall', campus: 'Lincoln High School', parentOrg: DISTRICTS[0], childOrg: 'Lincoln High School', city: 'Fresno', state: 'CA', baseRate: 120 },
  { id: 'FAC-03', name: 'Washington Middle Cafeteria', type: 'Cafeteria', building: 'Cafeteria Bldg', room: 'Multi-Purpose Room', campus: 'Washington Middle School', parentOrg: DISTRICTS[0], childOrg: 'Washington Middle School', city: 'Fresno', state: 'CA', baseRate: 55 },
  { id: 'FAC-04', name: 'Washington Middle Athletic Field', type: 'Field', building: 'Outdoor', room: 'Field 1', campus: 'Washington Middle School', parentOrg: DISTRICTS[0], childOrg: 'Washington Middle School', city: 'Fresno', state: 'CA', baseRate: 65 },
  { id: 'FAC-05', name: 'Jefferson Elementary Multi-Purpose Room', type: 'Multi-Purpose Room', building: 'Main Bldg', room: 'MPR', campus: 'Jefferson Elementary', parentOrg: DISTRICTS[0], childOrg: 'Jefferson Elementary', city: 'Clovis', state: 'CA', baseRate: 45 },
  { id: 'FAC-06', name: 'Riverside High Stadium', type: 'Stadium', building: 'Outdoor', room: 'Main Stadium', campus: 'Riverside High School', parentOrg: DISTRICTS[1], childOrg: 'Riverside High School', city: 'Riverside', state: 'CA', baseRate: 150 },
  { id: 'FAC-07', name: 'Riverside High Pool', type: 'Pool', building: 'Aquatics Center', room: 'Pool', campus: 'Riverside High School', parentOrg: DISTRICTS[1], childOrg: 'Riverside High School', city: 'Riverside', state: 'CA', baseRate: 95 },
  { id: 'FAC-08', name: 'Riverside High Theater', type: 'Theater', building: 'Arts Bldg', room: 'Black Box Theater', campus: 'Riverside High School', parentOrg: DISTRICTS[1], childOrg: 'Riverside High School', city: 'Riverside', state: 'CA', baseRate: 110 },
  { id: 'FAC-09', name: 'Franklin Elementary Classroom 12', type: 'Classroom', building: 'Bldg C', room: 'Room 12', campus: 'Franklin Elementary', parentOrg: DISTRICTS[1], childOrg: 'Franklin Elementary', city: 'Riverside', state: 'CA', baseRate: 30 },
  { id: 'FAC-10', name: 'District Office Parking Lot', type: 'Parking Lot', building: 'Outdoor', room: 'Lot B', campus: 'District Office', parentOrg: DISTRICTS[1], childOrg: 'District Office', city: 'Riverside', state: 'CA', baseRate: 25 },
];

const RATE_CATEGORIES = [
  { name: 'Internal', multiplier: 0 },
  { name: 'Community', multiplier: 1.0 },
  { name: 'Nonprofit', multiplier: 0.75 },
  { name: 'Commercial', multiplier: 1.5 },
  { name: 'Government', multiplier: 1.1 },
];

const EXTERNAL_ORG_NAMES = [
  'Central Valley Youth Soccer League', 'Fresno Adult Basketball Association', 'Grace Community Church',
  'Riverside Little League', 'Valley Gymnastics Club', 'St. Anthony Parish', 'Fresno Chess Club',
  'Boys & Girls Club of Fresno', 'Riverside Youth Orchestra', 'Central CA Robotics Club',
  'Fresno Table Tennis Club', 'Sunrise Rotary Club', 'Valley Volleyball Academy', 'Riverside Toastmasters',
  'Fresno Dance Collective', 'Central Valley Film Co-op', 'Riverside Farmers Market Assoc.',
  'Fresno Martial Arts Studio', 'Valley Chamber of Commerce', 'Riverside Robotics League',
];
const INTERNAL_ORG_NAMES = [
  'Lincoln High Booster Club', 'Washington Middle PTA', 'Jefferson Elementary PTA',
  'Riverside High Athletics Dept', 'Riverside High Drama Dept', 'Franklin Elementary PTA',
  'District Office - Facilities', 'District Office - Nutrition Services', 'Lincoln High Band Program',
  'Riverside High Student Government',
];

const RENTER_ORGS = [];
let orgSeq = 1;
INTERNAL_ORG_NAMES.forEach((name) => {
  RENTER_ORGS.push({
    id: 'ORG-' + pad(orgSeq++, 3), name, internal: true,
    parentOrganization: pick(DISTRICTS),
    ein: null,
    rateCategory: 'Internal',
    renterType: 'Organization',
  });
});
EXTERNAL_ORG_NAMES.forEach((name) => {
  RENTER_ORGS.push({
    id: 'ORG-' + pad(orgSeq++, 3), name, internal: false,
    parentOrganization: null,
    ein: String(randInt(10, 98)) + String(randInt(1000000, 9999999)),
    rateCategory: pick(['Community', 'Nonprofit', 'Commercial', 'Government']),
    renterType: maybe(0.15) ? 'Individual' : 'Organization',
  });
});

const BUDGET_CODES = [
  { code: '1000-100-1110', description: 'Instructional - General' },
  { code: '1000-200-1230', description: 'Instructional - Special Ed' },
  { code: '3000-100-3510', description: 'Facilities & Maintenance' },
  { code: '3000-200-3520', description: 'Grounds & Athletic Fields' },
  { code: '4000-100-4110', description: 'Nutrition Services' },
  { code: '5000-100-5210', description: 'Transportation' },
  { code: '6000-100-6110', description: 'Student Activities' },
  { code: '6000-200-6120', description: 'Athletics Program' },
  { code: '7000-100-7010', description: 'District Administration' },
  { code: '8000-100-8110', description: 'Community Partnerships' },
  { code: '2000-100-2410', description: 'Site Administration' },
  { code: '9000-100-9010', description: 'Capital Projects' },
  { code: '1000-300-1310', description: 'Instructional - Arts' },
  { code: '6000-300-6130', description: 'Performing Arts Program' },
  { code: '3000-300-3530', description: 'Custodial Services' },
];

const ACTIVITY_TAGS = ['Sports', 'Meeting', 'Performance', 'Rehearsal', 'Fundraiser', 'Class/Instruction', 'Community Event', 'Religious Service', 'Filming', 'Testing'];
const PURPOSES = ['Athletics', 'Academic', 'Community Use', 'Private Event', 'District Use', 'Fundraising'];
const DECLINE_REASONS = ['Insufficient documentation', 'COI not provided', 'Conflicting reservation', 'Facility unavailable for requested use', 'Non-compliant use type', 'Invalid budget code'];
const PAYMENT_METHODS = ['Credit Card', 'ACH / Bank Transfer', 'Check', 'Purchase Order', 'Cash'];
const FIRST_NAMES = ['Maria', 'James', 'Linda', 'Robert', 'Patricia', 'David', 'Susan', 'Michael', 'Karen', 'John', 'Nancy', 'Carlos', 'Angela', 'Kevin', 'Sandra'];
const LAST_NAMES = ['Garcia', 'Smith', 'Johnson', 'Martinez', 'Brown', 'Davis', 'Lopez', 'Wilson', 'Anderson', 'Thomas', 'Moore', 'Jackson', 'Lee', 'Perez', 'Thompson'];
const APPROVER_NAMES = ['Dana Whitfield (Site Manager)', 'Tom Reyes (Facility Admin)', 'Priya Nair (District Admin)', 'Chris Boyle (Facility Admin)'];
const randPerson = () => `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`;

// Fiscal year: July 1 – June 30. "Today" for generation purposes.
const TODAY = new Date('2026-07-02');
const FY_START_MONTH = 7; // July
function fiscalYearOf(date) {
  const y = date.getUTCFullYear();
  const m = date.getUTCMonth() + 1;
  const startYear = m >= FY_START_MONTH ? y : y - 1;
  return `FY${startYear}-${String(startYear + 1).slice(2)}`; // e.g. FY2025-26
}

const WINDOW_START = new Date('2023-07-01');
const WINDOW_END = new Date('2027-03-31'); // includes some future/projection reservations
const WINDOW_DAYS = Math.round((WINDOW_END - WINDOW_START) / 86400000);

const STATUS_WEIGHTS = [['Approved', 55], ['Pending', 10], ['Cancelled', 10], ['Declined', 15], ['Suspended', 10]];
const COI_WEIGHTS = [['Verified', 55], ['Pending', 15], ['Expired', 10], ['None', 20]];

const RECORD_COUNT = 380;
const records = [];

for (let i = 1; i <= RECORD_COUNT; i++) {
  const facility = pick(FACILITIES);
  const org = pick(RENTER_ORGS);
  const rateCat = RATE_CATEGORIES.find(r => r.name === org.rateCategory);

  const createdDate = addDays(WINDOW_START, randInt(0, WINDOW_DAYS - 14));
  // Event(s): 1-6 events per reservation, spread over the following weeks
  const numEvents = maybe(0.55) ? 1 : randInt(2, 6);
  const events = [];
  let cursor = addDays(createdDate, randInt(3, 21));
  for (let e = 0; e < numEvents; e++) {
    const startHour = randInt(7, 19);
    const durationHours = randFloat(1, 4, 1);
    const suspended = maybe(0.06);
    events.push({
      date: fmtDate(cursor),
      startTime: `${pad(startHour, 2)}:00`,
      endTime: `${pad(Math.min(23, startHour + Math.ceil(durationHours)), 2)}:00`,
      hours: durationHours,
      suspended,
    });
    cursor = addDays(cursor, randInt(6, 13)); // weekly-ish recurrence
  }
  const totalHours = +events.reduce((s, e) => s + e.hours, 0).toFixed(1);
  const numSuspendedEvents = events.filter(e => e.suspended).length;
  const eventDates = events.map(e => e.date);
  const lastEventDate = eventDates[eventDates.length - 1];

  const status = pickWeighted(STATUS_WEIGHTS);
  const isInternal = org.internal;

  const submittedBy = { name: randPerson(), role: isInternal ? 'Site Staff' : 'Renter Contact' };
  let approvedBy = null, approvalDate = null, daysPending = null, declineReason = null;
  const reviewed = status !== 'Pending';
  if (reviewed) {
    daysPending = randInt(1, 12);
    approvalDate = fmtDate(addDays(createdDate, daysPending));
    approvedBy = pick(APPROVER_NAMES);
    if (status === 'Declined') declineReason = pick(DECLINE_REASONS);
  }

  const preApprovers = maybe(0.25) ? [pick(APPROVER_NAMES)] : [];
  const commentsCount = randInt(0, 5);
  const coiStatus = isInternal ? 'None' : pickWeighted(COI_WEIGHTS);
  const activityTags = [pick(ACTIVITY_TAGS)].concat(maybe(0.3) ? [pick(ACTIVITY_TAGS)] : []);
  const purpose = pick(PURPOSES);
  const termType = numEvents >= 4 ? 'Long-Term' : 'Short-Term';

  // ---- Revenue ----
  const facilityUseFee = Math.round(facility.baseRate * totalHours * rateCat.multiplier);
  const serviceFees = maybe(0.35) ? pick([25, 50, 75, 100, 150]) : 0;
  const otherCharges = maybe(0.15) ? randInt(10, 60) : 0;
  const creditsAdjustments = maybe(0.1) ? -randInt(10, 100) : 0;
  const grossRevenue = facilityUseFee + serviceFees + otherCharges;
  const commissionPct = randFloat(0.08, 0.15, 2);
  const commissionAmount = Math.round(grossRevenue * commissionPct);
  const netRevenue = Math.max(0, grossRevenue - commissionAmount + creditsAdjustments);
  const depositAmount = netRevenue > 500 ? Math.round(netRevenue * 0.2) : 0;

  let paymentStatus = null, directPayments = 0, balanceDue = 0, paidInFullDates = [], refundAmount = 0;
  if (status === 'Approved') {
    paymentStatus = pickWeighted([['Paid in Full', 60], ['Balance Due', 25], ['Delinquent', 15]]);
    if (paymentStatus === 'Paid in Full') {
      directPayments = netRevenue;
      balanceDue = 0;
      paidInFullDates = [fmtDate(addDays(new Date(approvalDate), randInt(1, 20)))];
    } else if (paymentStatus === 'Balance Due') {
      directPayments = depositAmount;
      balanceDue = +(netRevenue - directPayments).toFixed(2);
    } else {
      directPayments = maybe(0.5) ? depositAmount : 0;
      balanceDue = +(netRevenue - directPayments).toFixed(2);
    }
  } else if (status === 'Cancelled') {
    paymentStatus = maybe(0.5) ? 'Refund Due' : null;
    if (paymentStatus === 'Refund Due') {
      refundAmount = Math.round(netRevenue * randFloat(0.5, 1, 2));
      directPayments = netRevenue;
      balanceDue = -refundAmount;
    }
  }
  const paymentMethod = (directPayments > 0) ? pick(PAYMENT_METHODS) : null;
  const budgetCode = (isInternal || maybe(0.1)) && maybe(0.7) ? pick(BUDGET_CODES) : null;

  records.push({
    reservationId: 'RES-' + pad(100000 + i, 6),
    status,
    internalExternal: isInternal ? 'Internal' : 'External',
    termType,
    createdDate: fmtDate(createdDate),
    submittedBy,
    approvedBy,
    approvalDate,
    daysPending,
    preApprovers,
    specialInstructions: maybe(0.2) ? 'Requires custodial setup 1 hour prior.' : '',
    commentsCount,
    coiStatus,
    activityTags,
    purpose,
    declineReason,

    eventDates,
    events,
    eventDate: lastEventDate,
    fiscalYear: fiscalYearOf(new Date(lastEventDate)),
    totalHoursAllEvents: totalHours,
    numEvents,
    numSuspendedEvents,

    facilityId: facility.id,
    facilityName: facility.name,
    facilityType: facility.type,
    building: facility.building,
    room: facility.room,
    campus: facility.campus,
    parentOrganization: facility.parentOrg,
    childOrganization: facility.childOrg,
    city: facility.city,
    state: facility.state,

    renterName: org.renterType === 'Individual' ? randPerson() : org.name,
    renterOrganization: org.name,
    renterOrgParent: org.parentOrganization,
    orgUID: org.id,
    ein: org.ein,
    rateCategory: org.rateCategory,
    renterType: org.renterType,

    facilityUseFee,
    serviceFees,
    otherCharges,
    creditsAdjustments,
    grossRevenue,
    netRevenue,
    commissionAmount,
    depositAmount,
    directPayments: +directPayments.toFixed(2),
    balanceDue: +balanceDue.toFixed(2),
    paidInFullDates,
    paymentMethod,
    paymentStatus,
    budgetCode: budgetCode ? budgetCode.code : null,
    budgetCodeDescription: budgetCode ? budgetCode.description : null,
  });
}

const output = {
  generatedAt: '2026-07-02',
  fiscalYearStartMonth: FY_START_MONTH,
  meta: {
    facilities: FACILITIES.map(({ id, name, type, building, room, campus, parentOrg, childOrg, city, state }) => ({ id, name, type, building, room, campus, parentOrg, childOrg, city, state })),
    renterOrgs: RENTER_ORGS,
    budgetCodes: BUDGET_CODES,
    activityTags: ACTIVITY_TAGS,
    purposes: PURPOSES,
    rateCategories: RATE_CATEGORIES.map(r => r.name),
  },
  reservations: records,
};

fs.writeFileSync('report_dummy_data.json', JSON.stringify(output, null, 2));
console.log(`Wrote ${records.length} reservation records to report_dummy_data.json`);

// Quick sanity distribution report
const dist = (key) => records.reduce((acc, r) => { const k = String(r[key]); acc[k] = (acc[k] || 0) + 1; return acc; }, {});
console.log('Status distribution:', dist('status'));
console.log('Fiscal year distribution:', dist('fiscalYear'));
console.log('Payment status distribution:', dist('paymentStatus'));
console.log('Facility distribution:', dist('facilityName'));
