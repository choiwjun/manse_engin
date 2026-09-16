// SQLite 영속 PlatformStore — node:sqlite(내장) 사용, 외부 의존성 없음.
// 테이블 = 컬렉션 (id, workspace_id, data JSON). Postgres 전환 시 같은 계약으로 구현하면 된다.
// 사용: createSqliteStore('data/store.sqlite')
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';
import { PlatformError } from '../../packages/myeong-platform/dist/index.js';

const TENANTED = [
  'counselors', 'credentials', 'clients', 'services', 'appointments', 'payments',
  'sessions', 'snapshots', 'drafts', 'reportVersions', 'shareLinks',
  'intakeLinks', 'portalLinks', 'auditEvents',
];

const deepClone = (v) => JSON.parse(JSON.stringify(v));

class SqliteCollection {
  constructor(db, table) {
    this.db = db;
    this.table = table;
  }
  insert(entity) {
    try {
      this.db
        .prepare(`INSERT INTO ${this.table} (id, workspace_id, data) VALUES (?, ?, ?)`)
        .run(entity.id, entity.workspaceId, JSON.stringify(entity));
    } catch (e) {
      if (String(e.message).includes('UNIQUE')) {
        throw new PlatformError({ code: 'CONFLICT', message: `이미 존재하는 id입니다: ${entity.id}` });
      }
      throw e;
    }
  }
  row(workspaceId, id) {
    return this.db
      .prepare(`SELECT data FROM ${this.table} WHERE id = ? AND workspace_id = ?`)
      .get(id, workspaceId);
  }
  get(workspaceId, id) {
    const r = this.row(workspaceId, id);
    if (!r) throw new PlatformError({ code: 'NOT_FOUND', message: `엔티티를 찾을 수 없습니다: ${id}`, details: { id } });
    return JSON.parse(r.data);
  }
  find(workspaceId, id) {
    const r = this.row(workspaceId, id);
    return r ? JSON.parse(r.data) : null;
  }
  list(workspaceId, filter) {
    const rows = this.db.prepare(`SELECT data FROM ${this.table} WHERE workspace_id = ?`).all(workspaceId);
    return rows.map((r) => JSON.parse(r.data)).filter((e) => !filter || filter(e));
  }
  update(workspaceId, id, mutate) {
    const current = this.get(workspaceId, id);
    const draft = deepClone(current);
    mutate(draft);
    draft.id = current.id;
    draft.workspaceId = current.workspaceId;
    this.db
      .prepare(`UPDATE ${this.table} SET data = ? WHERE id = ? AND workspace_id = ?`)
      .run(JSON.stringify(draft), id, workspaceId);
    return deepClone(draft);
  }
}

class SqliteRootCollection {
  constructor(db, table) {
    this.db = db;
    this.table = table;
  }
  insert(entity) {
    try {
      this.db.prepare(`INSERT INTO ${this.table} (id, data) VALUES (?, ?)`).run(entity.id, JSON.stringify(entity));
    } catch (e) {
      if (String(e.message).includes('UNIQUE')) {
        throw new PlatformError({ code: 'CONFLICT', message: `이미 존재하는 id입니다: ${entity.id}` });
      }
      throw e;
    }
  }
  get(id) {
    const r = this.db.prepare(`SELECT data FROM ${this.table} WHERE id = ?`).get(id);
    if (!r) throw new PlatformError({ code: 'NOT_FOUND', message: `엔티티를 찾을 수 없습니다: ${id}` });
    return JSON.parse(r.data);
  }
  find(id) {
    const r = this.db.prepare(`SELECT data FROM ${this.table} WHERE id = ?`).get(id);
    return r ? JSON.parse(r.data) : null;
  }
  list() {
    return this.db.prepare(`SELECT data FROM ${this.table}`).all().map((r) => JSON.parse(r.data));
  }
  update(id, mutate) {
    const current = this.get(id);
    const draft = deepClone(current);
    mutate(draft);
    draft.id = current.id;
    this.db.prepare(`UPDATE ${this.table} SET data = ? WHERE id = ?`).run(JSON.stringify(draft), id);
    return deepClone(draft);
  }
}

class SqliteTokenCollection extends SqliteCollection {
  byToken(token) {
    const r = this.db
      .prepare(`SELECT data FROM ${this.table} WHERE json_extract(data, '$.token') = ?`)
      .get(token);
    return r ? JSON.parse(r.data) : null;
  }
}

export function createSqliteStore(filePath) {
  mkdirSync(path.dirname(filePath), { recursive: true });
  const db = new DatabaseSync(filePath);
  db.exec(`
    CREATE TABLE IF NOT EXISTS workspaces (id TEXT PRIMARY KEY, data TEXT NOT NULL);
    ${TENANTED.map((t) => `
    CREATE TABLE IF NOT EXISTS ${t} (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL,
      data TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_${t}_ws ON ${t}(workspace_id);`).join('')}
  `);
  return {
    workspaces: new SqliteRootCollection(db, 'workspaces'),
    counselors: new SqliteCollection(db, 'counselors'),
    credentials: new SqliteCollection(db, 'credentials'),
    clients: new SqliteCollection(db, 'clients'),
    services: new SqliteCollection(db, 'services'),
    appointments: new SqliteCollection(db, 'appointments'),
    payments: new SqliteCollection(db, 'payments'),
    sessions: new SqliteCollection(db, 'sessions'),
    snapshots: new SqliteCollection(db, 'snapshots'),
    drafts: new SqliteCollection(db, 'drafts'),
    reportVersions: new SqliteCollection(db, 'reportVersions'),
    shareLinks: new SqliteTokenCollection(db, 'shareLinks'),
    intakeLinks: new SqliteTokenCollection(db, 'intakeLinks'),
    portalLinks: new SqliteTokenCollection(db, 'portalLinks'),
    auditEvents: new SqliteCollection(db, 'auditEvents'),
    _db: db,
  };
}

export const DEFAULT_SQLITE_PATH = fileURLToPath(new URL('./data/store.sqlite', import.meta.url));
