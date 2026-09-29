// Small builders for saved states (the app normalises whatever it loads, so
// only the fields a test cares about need to be given).
export const T0 = Date.parse('2026-09-01T08:00:00+03:00');

export function state(extra = {}) {
  return {
    v: 2,
    createdAt: T0,
    profile: {},
    meds: [],
    doses: {},
    prn: [],
    readings: [],
    symptoms: [],
    stress: [],
    notes: [],
    notifications: [],
    targets: {},
    prefs: { onboarded: true, reminders: false },
    remind: {},
    legacyAdherence: {},
    ...extra,
    prefs: { onboarded: true, reminders: false, ...(extra.prefs || {}) },
  };
}

export function med(id, name, times, extra = {}) {
  return {
    id, name, dose: '50 mg', times,
    sched: { type: 'daily' },
    start: '2026-09-01', addedAt: T0, stoppedOn: null, off: [],
    stock: null, perDose: 1, notes: '',
    ...extra,
  };
}

// a local (Addis Ababa, UTC+3) time as epoch ms
export function at(date, hhmm) {
  return Date.parse(`${date}T${hhmm}:00+03:00`);
}

export function reading(type, v, date, hhmm, extra = {}) {
  return { id: `r-${type}-${date}-${hhmm}`, ts: at(date, hhmm), type, v, note: '', src: 'manual', ...extra };
}
