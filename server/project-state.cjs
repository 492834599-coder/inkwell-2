const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DEFAULT_STATE_PATH = path.join(ROOT, '.local', 'project-state.json');
const MAX_SNAPSHOT_BYTES = parseByteLimit(process.env.INKWELL_PROJECT_STATE_MAX_BYTES, 8 * 1024 * 1024);
const STATE_PATH = resolveStatePath(process.env.INKWELL_PROJECT_STATE_PATH);
const SUPPORTED_SCHEMA_VERSION = 1;

const WORKFLOW_STATUSES = new Set(['idle', 'running', 'needsFix', 'passed', 'blocked', 'done']);
const ZHUQUE_STATUSES = new Set(['untested', 'checking', 'passed', 'ai_risk', 'quota_exhausted', 'needs_login', 'failed']);
const ANNOTATION_STATUSES = new Set(['open', 'sent_to_ai', 'resolved']);

function getProjectStateStatus() {
  const record = readRecord();
  return {
    ok: true,
    saved: Boolean(record),
    savedAt: record?.savedAt || null,
    version: record?.version || SUPPORTED_SCHEMA_VERSION,
    sizeBytes: fileSize(STATE_PATH),
  };
}

function loadProjectState() {
  const record = readRecord();
  return {
    ...getProjectStateStatus(),
    snapshot: record?.snapshot || null,
  };
}

function saveProjectState(payload) {
  const snapshot = payload?.snapshot;
  validateSnapshot(snapshot);
  const record = {
    version: SUPPORTED_SCHEMA_VERSION,
    savedAt: new Date().toISOString(),
    snapshot,
  };
  const text = JSON.stringify(record, null, 2);
  const sizeBytes = Buffer.byteLength(text, 'utf8');
  if (sizeBytes > MAX_SNAPSHOT_BYTES) {
    throw httpError(413, `project snapshot exceeds ${MAX_SNAPSHOT_BYTES} bytes`);
  }
  writeJsonAtomic(STATE_PATH, text);
  return {
    ok: true,
    saved: true,
    savedAt: record.savedAt,
    version: record.version,
    sizeBytes,
  };
}

function deleteProjectState() {
  if (fs.existsSync(STATE_PATH)) {
    backupFile(STATE_PATH);
    fs.unlinkSync(STATE_PATH);
  }
  return {
    ok: true,
    saved: false,
    savedAt: null,
    version: SUPPORTED_SCHEMA_VERSION,
    sizeBytes: 0,
  };
}

function readRecord() {
  if (!fs.existsSync(STATE_PATH)) return null;
  try {
    const record = JSON.parse(fs.readFileSync(STATE_PATH, 'utf8'));
    if (!record || typeof record !== 'object' || !record.snapshot || typeof record.snapshot !== 'object') return null;
    return record;
  } catch (error) {
    preserveBadFile(STATE_PATH);
    throw httpError(500, 'project snapshot is unreadable');
  }
}

function validateSnapshot(snapshot) {
  if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot)) {
    throw httpError(400, 'snapshot must be an object');
  }
  if (Number(snapshot.schemaVersion) !== SUPPORTED_SCHEMA_VERSION) {
    throw httpError(400, `snapshot.schemaVersion must be ${SUPPORTED_SCHEMA_VERSION}`);
  }
  if (snapshot.savedFrom !== 'frontend') throw httpError(400, 'snapshot.savedFrom must be frontend');
  if (!['genre', 'spark'].includes(snapshot.mode)) throw httpError(400, 'snapshot.mode is invalid');
  requireString(snapshot.genre, 'snapshot.genre', 200);
  requireString(snapshot.spark, 'snapshot.spark', 20000, true);
  requireString(snapshot.selectedCandidateId, 'snapshot.selectedCandidateId', 300, true);

  requireArray(snapshot.candidates, 'snapshot.candidates');
  requireArray(snapshot.candidateProviderFallback, 'snapshot.candidateProviderFallback');
  requireNullableObject(snapshot.candidateProviderTrace, 'snapshot.candidateProviderTrace');
  requireNullableObject(snapshot.project, 'snapshot.project');
  requireNullableObject(snapshot.bible, 'snapshot.bible');
  requireNullableObject(snapshot.chapterGoal, 'snapshot.chapterGoal');
  requireArray(snapshot.workflow, 'snapshot.workflow');
  requireArray(snapshot.draftVersions, 'snapshot.draftVersions');
  requireArray(snapshot.draftParagraphs, 'snapshot.draftParagraphs');
  requireArray(snapshot.reviewReports, 'snapshot.reviewReports');
  requireArray(snapshot.annotations, 'snapshot.annotations');
  requireArray(snapshot.memoryPacks, 'snapshot.memoryPacks');
  requireArray(snapshot.promptPresets, 'snapshot.promptPresets');
  requireArray(snapshot.zhuqueReports, 'snapshot.zhuqueReports');

  snapshot.workflow.forEach((node, index) => {
    if (!node || typeof node !== 'object') throw httpError(400, `snapshot.workflow[${index}] must be an object`);
    requireString(node.id, `snapshot.workflow[${index}].id`, 200);
    if (!WORKFLOW_STATUSES.has(node.status)) throw httpError(400, `snapshot.workflow[${index}].status is invalid`);
  });

  snapshot.annotations.forEach((annotation, index) => {
    if (!annotation || typeof annotation !== 'object') throw httpError(400, `snapshot.annotations[${index}] must be an object`);
    requireString(annotation.id, `snapshot.annotations[${index}].id`, 300);
    if (!ANNOTATION_STATUSES.has(annotation.status)) throw httpError(400, `snapshot.annotations[${index}].status is invalid`);
  });

  snapshot.zhuqueReports.forEach((report, index) => {
    if (!report || typeof report !== 'object') throw httpError(400, `snapshot.zhuqueReports[${index}] must be an object`);
    if (!ZHUQUE_STATUSES.has(report.status)) throw httpError(400, `snapshot.zhuqueReports[${index}].status is invalid`);
  });
}

function writeJsonAtomic(filePath, text) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  cleanupTempFiles(path.dirname(filePath), path.basename(filePath));
  const tempPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(tempPath, text, 'utf8');
  backupFile(filePath);
  fs.renameSync(tempPath, filePath);
}

function backupFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  fs.copyFileSync(filePath, `${filePath}.bak`);
}

function preserveBadFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  try {
    fs.copyFileSync(filePath, `${filePath}.bad`);
  } catch {
    // The read path should still report the original failure if the safety copy fails.
  }
}

function cleanupTempFiles(dir, basename) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir)) {
    if (entry.startsWith(`${basename}.`) && entry.endsWith('.tmp')) {
      fs.rmSync(path.join(dir, entry), { force: true });
    }
  }
}

function resolveStatePath(configuredPath) {
  if (configuredPath && !path.isAbsolute(configuredPath)) {
    throw new Error('INKWELL_PROJECT_STATE_PATH must be absolute');
  }
  const resolved = path.resolve(configuredPath || DEFAULT_STATE_PATH);
  const forbiddenRoots = ['src', 'server', 'dist', path.join('artifacts', 'zhuque')].map((segment) => path.join(ROOT, segment));
  if (forbiddenRoots.some((forbidden) => isInside(resolved, forbidden))) {
    throw new Error('INKWELL_PROJECT_STATE_PATH points to a protected project directory');
  }
  return resolved;
}

function parseByteLimit(value, fallback) {
  const parsed = Number(value || fallback);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(Math.max(Math.floor(parsed), 1024 * 1024), 16 * 1024 * 1024);
}

function requireArray(value, label) {
  if (!Array.isArray(value)) throw httpError(400, `${label} must be an array`);
}

function requireNullableObject(value, label) {
  if (value !== null && value !== undefined && (typeof value !== 'object' || Array.isArray(value))) {
    throw httpError(400, `${label} must be an object or null`);
  }
}

function requireString(value, label, maxLength, allowEmpty = false) {
  if (typeof value !== 'string') throw httpError(400, `${label} must be a string`);
  if (!allowEmpty && !value.trim()) throw httpError(400, `${label} must not be empty`);
  if (value.length > maxLength) throw httpError(400, `${label} is too long`);
  if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value)) throw httpError(400, `${label} contains control characters`);
}

function isInside(filePath, directory) {
  const relative = path.relative(directory, filePath);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

function fileSize(filePath) {
  try {
    return fs.statSync(filePath).size;
  } catch {
    return 0;
  }
}

function httpError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

module.exports = {
  deleteProjectState,
  getProjectStateStatus,
  loadProjectState,
  saveProjectState,
};
