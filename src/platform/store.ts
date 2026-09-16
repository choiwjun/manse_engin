import { PlatformError } from './errors';
import type {
  Appointment,
  AuditEvent,
  CalculationSnapshot,
  Client,
  Counselor,
  CounselorCredential,
  IntakeLink,
  InterpretationDraft,
  PaymentRecord,
  PortalLink,
  ReportVersion,
  ServiceItem,
  Session,
  ShareLink,
  Workspace,
} from './types';
import { deepClone } from './util';

// ---------- 저장소 계약 ----------
// 모든 조회·쓰기는 workspaceId를 요구한다. 다른 테넌트의 엔티티는 존재 자체를
// 노출하지 않도록 NOT_FOUND로 처리한다 (§7.1 테넌트 경계).

interface Entity {
  id: string;
  workspaceId: string;
}

// 워크스페이스는 테넌트 그 자체 — workspaceId 없이 id로만 조회한다.
export interface RootEntityStore<T extends { id: string }> {
  insert(entity: T): void;
  get(id: string): T;
  find(id: string): T | null;
  list(): T[];
  update(id: string, mutate: (draft: T) => void): T;
}

export interface EntityStore<T extends Entity> {
  insert(entity: T): void;
  get(workspaceId: string, id: string): T;
  find(workspaceId: string, id: string): T | null;
  list(workspaceId: string, filter?: (entity: T) => boolean): T[];
  update(workspaceId: string, id: string, mutate: (draft: T) => void): T;
}

// 스냅샷·감사 이벤트처럼 쓴 뒤 고치지 않는 컬렉션 (§6.2 불변성).
export interface ImmutableEntityStore<T extends Entity> {
  insert(entity: T): void;
  get(workspaceId: string, id: string): T;
  find(workspaceId: string, id: string): T | null;
  list(workspaceId: string, filter?: (entity: T) => boolean): T[];
}

export interface ShareLinkStore extends EntityStore<ShareLink> {
  byToken(token: string): ShareLink | null;
}

export interface IntakeLinkStore extends EntityStore<IntakeLink> {
  byToken(token: string): IntakeLink | null;
}

export interface PortalLinkStore extends EntityStore<PortalLink> {
  byToken(token: string): PortalLink | null;
}

export interface PlatformStore {
  workspaces: RootEntityStore<Workspace>;
  counselors: EntityStore<Counselor>;
  credentials: EntityStore<CounselorCredential>;
  clients: EntityStore<Client>;
  services: EntityStore<ServiceItem>;
  appointments: EntityStore<Appointment>;
  payments: EntityStore<PaymentRecord>;
  sessions: EntityStore<Session>;
  snapshots: ImmutableEntityStore<CalculationSnapshot>;
  drafts: EntityStore<InterpretationDraft>;
  reportVersions: EntityStore<ReportVersion>;
  shareLinks: ShareLinkStore;
  intakeLinks: IntakeLinkStore;
  portalLinks: PortalLinkStore;
  auditEvents: ImmutableEntityStore<AuditEvent>;
}

// ---------- 인메모리 구현 (프로토타입·테스트용 기본 구현체) ----------

class InMemoryCollection<T extends Entity> implements EntityStore<T> {
  protected readonly rows = new Map<string, T>();

  insert(entity: T): void {
    if (this.rows.has(entity.id)) {
      throw new PlatformError({
        code: 'CONFLICT',
        message: `이미 존재하는 id입니다: ${entity.id}`,
        details: { id: entity.id },
      });
    }
    this.rows.set(entity.id, deepClone(entity));
  }

  private locate(workspaceId: string, id: string): T {
    const row = this.rows.get(id);
    if (!row || row.workspaceId !== workspaceId) {
      throw new PlatformError({
        code: 'NOT_FOUND',
        message: `엔티티를 찾을 수 없습니다: ${id}`,
        details: { id },
      });
    }
    return row;
  }

  get(workspaceId: string, id: string): T {
    return deepClone(this.locate(workspaceId, id));
  }

  find(workspaceId: string, id: string): T | null {
    const row = this.rows.get(id);
    if (!row || row.workspaceId !== workspaceId) return null;
    return deepClone(row);
  }

  list(workspaceId: string, filter?: (entity: T) => boolean): T[] {
    const out: T[] = [];
    for (const row of this.rows.values()) {
      if (row.workspaceId !== workspaceId) continue;
      if (filter && !filter(row)) continue;
      out.push(deepClone(row));
    }
    return out;
  }

  update(workspaceId: string, id: string, mutate: (draft: T) => void): T {
    const row = this.locate(workspaceId, id);
    const draft = deepClone(row);
    mutate(draft);
    draft.id = row.id;
    draft.workspaceId = row.workspaceId;
    this.rows.set(id, deepClone(draft));
    return deepClone(draft);
  }
}

class InMemoryRootCollection<T extends { id: string }> implements RootEntityStore<T> {
  private readonly rows = new Map<string, T>();

  insert(entity: T): void {
    if (this.rows.has(entity.id)) {
      throw new PlatformError({
        code: 'CONFLICT',
        message: `이미 존재하는 id입니다: ${entity.id}`,
        details: { id: entity.id },
      });
    }
    this.rows.set(entity.id, deepClone(entity));
  }

  get(id: string): T {
    const row = this.rows.get(id);
    if (!row) {
      throw new PlatformError({ code: 'NOT_FOUND', message: `엔티티를 찾을 수 없습니다: ${id}`, details: { id } });
    }
    return deepClone(row);
  }

  find(id: string): T | null {
    const row = this.rows.get(id);
    return row ? deepClone(row) : null;
  }

  list(): T[] {
    return [...this.rows.values()].map((row) => deepClone(row));
  }

  update(id: string, mutate: (draft: T) => void): T {
    const row = this.rows.get(id);
    if (!row) {
      throw new PlatformError({ code: 'NOT_FOUND', message: `엔티티를 찾을 수 없습니다: ${id}`, details: { id } });
    }
    const draft = deepClone(row);
    mutate(draft);
    draft.id = row.id;
    this.rows.set(id, deepClone(draft));
    return deepClone(draft);
  }
}

class InMemoryTokenIndex<T extends Entity & { token: string }> extends InMemoryCollection<T> {
  private readonly tokenIndex = new Map<string, string>();

  override insert(entity: T): void {
    super.insert(entity);
    this.tokenIndex.set(entity.token, entity.id);
  }

  byToken(token: string): T | null {
    const id = this.tokenIndex.get(token);
    if (!id) return null;
    // 토큰은 이미 무작위 비밀이므로 워크스페이스 스코프 없이 조회한다.
    const row = this.rows.get(id);
    return row ? deepClone(row) : null;
  }
}

export function createInMemoryStore(): PlatformStore {
  return {
    workspaces: new InMemoryRootCollection<Workspace>(),
    counselors: new InMemoryCollection<Counselor>(),
    credentials: new InMemoryCollection<CounselorCredential>(),
    clients: new InMemoryCollection<Client>(),
    services: new InMemoryCollection<ServiceItem>(),
    appointments: new InMemoryCollection<Appointment>(),
    payments: new InMemoryCollection<PaymentRecord>(),
    sessions: new InMemoryCollection<Session>(),
    snapshots: new InMemoryCollection<CalculationSnapshot>(),
    drafts: new InMemoryCollection<InterpretationDraft>(),
    reportVersions: new InMemoryCollection<ReportVersion>(),
    shareLinks: new InMemoryTokenIndex<ShareLink>(),
    intakeLinks: new InMemoryTokenIndex<IntakeLink>(),
    portalLinks: new InMemoryTokenIndex<PortalLink>(),
    auditEvents: new InMemoryCollection<AuditEvent>(),
  };
}
