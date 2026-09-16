// 파일 영속 PlatformStore — JSON 파일에 write-through.
// 프로토타입용 기본 구현. 실제 DB로 교체할 때는 같은 계약(PlatformStore)을 구현하면 된다.
import { mkdirSync, readFileSync, renameSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
// ESM 번들만 사용한다 — .cjs와 .js를 섞어 쓰면 PlatformError 등 클래스가 이중화된다.
import { PlatformError } from '../../packages/myeong-platform/dist/index.js';

const COLLECTIONS = [
  'workspaces', 'counselors', 'credentials', 'clients', 'services', 'appointments',
  'payments', 'sessions', 'snapshots', 'drafts', 'reportVersions',
  'shareLinks', 'intakeLinks', 'portalLinks', 'auditEvents',
];

const deepClone = (v) => JSON.parse(JSON.stringify(v));

class FileCollection {
  constructor(db, name, save) {
    this.db = db;
    this.name = name;
    this.save = save;
  }
  rows() {
    return this.db[this.name];
  }
  insert(entity) {
    if (this.rows()[entity.id]) {
      throw new PlatformError({ code: 'CONFLICT', message: `이미 존재하는 id입니다: ${entity.id}` });
    }
    this.rows()[entity.id] = deepClone(entity);
    this.save();
  }
  locate(workspaceId, id) {
    const row = this.rows()[id];
    if (!row || row.workspaceId !== workspaceId) {
      throw new PlatformError({ code: 'NOT_FOUND', message: `엔티티를 찾을 수 없습니다: ${id}`, details: { id } });
    }
    return row;
  }
  get(workspaceId, id) {
    return deepClone(this.locate(workspaceId, id));
  }
  find(workspaceId, id) {
    const row = this.rows()[id];
    if (!row || row.workspaceId !== workspaceId) return null;
    return deepClone(row);
  }
  list(workspaceId, filter) {
    return Object.values(this.rows())
      .filter((row) => row.workspaceId === workspaceId && (!filter || filter(row)))
      .map(deepClone);
  }
  update(workspaceId, id, mutate) {
    const row = this.locate(workspaceId, id);
    const draft = deepClone(row);
    mutate(draft);
    draft.id = row.id;
    draft.workspaceId = row.workspaceId;
    this.rows()[id] = draft;
    this.save();
    return deepClone(draft);
  }
}

class FileRootCollection {
  constructor(db, name, save) {
    this.db = db;
    this.name = name;
    this.save = save;
  }
  rows() {
    return this.db[this.name];
  }
  insert(entity) {
    if (this.rows()[entity.id]) {
      throw new PlatformError({ code: 'CONFLICT', message: `이미 존재하는 id입니다: ${entity.id}` });
    }
    this.rows()[entity.id] = deepClone(entity);
    this.save();
  }
  get(id) {
    const row = this.rows()[id];
    if (!row) throw new PlatformError({ code: 'NOT_FOUND', message: `엔티티를 찾을 수 없습니다: ${id}` });
    return deepClone(row);
  }
  find(id) {
    const row = this.rows()[id];
    return row ? deepClone(row) : null;
  }
  list() {
    return Object.values(this.rows()).map(deepClone);
  }
  update(id, mutate) {
    const row = this.get(id);
    const draft = deepClone(row);
    mutate(draft);
    draft.id = row.id;
    this.rows()[id] = draft;
    this.save();
    return deepClone(draft);
  }
}

class FileTokenCollection extends FileCollection {
  byToken(token) {
    const row = Object.values(this.rows()).find((l) => l.token === token);
    return row ? deepClone(row) : null;
  }
}

// filePath: 저장 파일. 없으면 빈 DB로 시작한다.
export function createFileStore(filePath) {
  const dir = path.dirname(filePath);
  mkdirSync(dir, { recursive: true });
  let db;
  if (existsSync(filePath)) {
    db = JSON.parse(readFileSync(filePath, 'utf8'));
    for (const name of COLLECTIONS) db[name] ??= {};
  } else {
    db = Object.fromEntries(COLLECTIONS.map((name) => [name, {}]));
  }
  const save = () => {
    const tmp = `${filePath}.tmp`;
    writeFileSync(tmp, JSON.stringify(db, null, 2));
    renameSync(tmp, filePath);
  };
  save();
  return {
    workspaces: new FileRootCollection(db, 'workspaces', save),
    counselors: new FileCollection(db, 'counselors', save),
    credentials: new FileCollection(db, 'credentials', save),
    clients: new FileCollection(db, 'clients', save),
    services: new FileCollection(db, 'services', save),
    appointments: new FileCollection(db, 'appointments', save),
    payments: new FileCollection(db, 'payments', save),
    sessions: new FileCollection(db, 'sessions', save),
    snapshots: new FileCollection(db, 'snapshots', save),
    drafts: new FileCollection(db, 'drafts', save),
    reportVersions: new FileCollection(db, 'reportVersions', save),
    shareLinks: new FileTokenCollection(db, 'shareLinks', save),
    intakeLinks: new FileTokenCollection(db, 'intakeLinks', save),
    portalLinks: new FileTokenCollection(db, 'portalLinks', save),
    auditEvents: new FileCollection(db, 'auditEvents', save),
  };
}

export const DEFAULT_STORE_PATH = fileURLToPath(new URL('./data/store.json', import.meta.url));
