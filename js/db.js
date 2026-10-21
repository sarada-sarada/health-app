const EXERCISE_KEY = 'hm_exercise';
const HEALTH_KEY   = 'hm_health';

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function getExercises() {
  return JSON.parse(localStorage.getItem(EXERCISE_KEY) || '[]');
}

function addExercise(data) {
  const records = getExercises();
  const record = { id: genId(), ...data, createdAt: new Date().toISOString() };
  records.unshift(record);
  localStorage.setItem(EXERCISE_KEY, JSON.stringify(records));
  return record;
}

function deleteExercise(id) {
  const records = getExercises().filter(r => r.id !== id);
  localStorage.setItem(EXERCISE_KEY, JSON.stringify(records));
}

function getHealthRecords() {
  return JSON.parse(localStorage.getItem(HEALTH_KEY) || '[]');
}

function getHealthByDate(date) {
  return getHealthRecords().find(r => r.date === date) || null;
}

function saveHealthRecord(data) {
  const records = getHealthRecords();
  const idx = records.findIndex(r => r.date === data.date);
  if (idx >= 0) {
    records[idx] = { ...records[idx], ...data, updatedAt: new Date().toISOString() };
  } else {
    records.unshift({ id: genId(), ...data, createdAt: new Date().toISOString() });
  }
  localStorage.setItem(HEALTH_KEY, JSON.stringify(records));
}

function deleteHealth(id) {
  const records = getHealthRecords().filter(r => r.id !== id);
  localStorage.setItem(HEALTH_KEY, JSON.stringify(records));
}

const PATCH_KEY = 'hm_patch';

function getPatchRecords() {
  return JSON.parse(localStorage.getItem(PATCH_KEY) || '[]');
}

function addPatchRecord(data) {
  const records = getPatchRecords();
  const record = { id: genId(), ...data, createdAt: new Date().toISOString() };
  records.unshift(record);
  records.sort((a, b) => b.date.localeCompare(a.date));
  localStorage.setItem(PATCH_KEY, JSON.stringify(records));
  return record;
}

function deletePatchRecord(id) {
  const records = getPatchRecords().filter(r => r.id !== id);
  localStorage.setItem(PATCH_KEY, JSON.stringify(records));
}
