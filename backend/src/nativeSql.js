import { rpc, withSupabaseRetry } from './http.js';

/**
 * Định dạng giá trị sang chuỗi literal SQL chuẩn PostgreSQL.
 * Ví dụ:
 *   sqlVal('user-1')  -> "'user-1'"
 *   sqlVal(25)        -> "25"
 *   sqlVal(true)      -> "TRUE"
 *   sqlVal(null)      -> "NULL"
 *   sqlVal({a: 1})    -> '\'{"a":1}\'::jsonb'
 */
export function sqlVal(val) {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
  if (typeof val === 'number') return Number.isFinite(val) ? String(val) : 'NULL';
  if (typeof val === 'object') {
    const jsonStr = JSON.stringify(val).replace(/'/g, "''");
    return `'${jsonStr}'::jsonb`;
  }
  const escaped = String(val).replace(/'/g, "''");
  return `'${escaped}'`;
}

/**
 * Định dạng mảng giá trị cho mệnh đề SQL IN (...).
 * Ví dụ: sqlList(['empty', 'rented']) -> "('empty', 'rented')"
 */
export function sqlList(arr = []) {
  if (!Array.isArray(arr) || arr.length === 0) return '(NULL)';
  return `(${arr.map((item) => sqlVal(item)).join(', ')})`;
}

/**
 * Định dạng object thành mệnh đề SET của lệnh UPDATE SQL gốc.
 * Ví dụ: sqlSet({ role: 'staff', email_verified: true }) -> "role = 'staff', email_verified = TRUE"
 */
export function sqlSet(obj = {}) {
  const entries = Object.entries(obj).filter(([, v]) => v !== undefined);
  return entries.map(([k, v]) => `${k} = ${sqlVal(v)}`).join(', ');
}

/**
 * Định dạng object (hoặc mảng object) thành mệnh đề (columns) VALUES (...) của lệnh INSERT SQL gốc.
 */
export function sqlValues(rowsOrObj) {
  const rows = Array.isArray(rowsOrObj) ? rowsOrObj : [rowsOrObj];
  if (rows.length === 0) return '() VALUES ()';
  const cols = Object.keys(rows[0]).filter((k) => rows[0][k] !== undefined);
  const tuples = rows.map((r) => `(${cols.map((c) => sqlVal(r[c])).join(', ')})`).join(', ');
  return `(${cols.join(', ')}) VALUES ${tuples}`;
}

/**
 * Giải mã một token literal SQL ('...', 123, TRUE, FALSE, NULL, '...'::jsonb) về giá trị JS.
 */
export function parseSqlToken(rawToken) {
  if (rawToken === undefined || rawToken === null) return null;
  let token = String(rawToken).trim();
  // Bỏ hậu tố ép kiểu PostgreSQL như ::text, ::uuid, ::integer, ::numeric, ::timestamptz, ::boolean
  const isJsonb = /::jsonb?$/i.test(token);
  token = token.replace(/::[a-z0-9_]+$/i, '').trim();

  if (/^NULL$/i.test(token)) return null;
  if (/^TRUE$/i.test(token)) return true;
  if (/^FALSE$/i.test(token)) return false;
  if (token.startsWith("'") && token.endsWith("'")) {
    const unquoted = token.slice(1, -1).replace(/''/g, "'");
    if (isJsonb) {
      try {
        return JSON.parse(unquoted);
      } catch {
        return unquoted;
      }
    }
    return unquoted;
  }
  if (/^-?\d+(\.\d+)?$/.test(token)) {
    return Number(token);
  }
  return token;
}

/**
 * Tách danh sách đối số SQL ở cấp ngoặc ngoài cùng (tôn trọng chuỗi '...' và ngoặc lồng nhau).
 */
export function splitSqlTopLevel(str, delimiter = ',') {
  const result = [];
  let current = '';
  let depth = 0;
  let inQuotes = false;

  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    if (ch === "'") {
      current += ch;
      if (inQuotes && str[i + 1] === "'") {
        current += str[i + 1];
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (!inQuotes) {
      if (ch === '(' || ch === '[' || ch === '{') depth++;
      else if (ch === ')' || ch === ']' || ch === '}') depth = Math.max(0, depth - 1);
      if (depth === 0 && str.slice(i, i + delimiter.length) === delimiter) {
        result.push(current.trim());
        current = '';
        i += delimiter.length - 1;
        continue;
      }
    }
    current += ch;
  }
  if (current.trim().length > 0) {
    result.push(current.trim());
  }
  return result;
}

const RPC_PARAM_MAP = {
  create_parking_zone: ['p_name', 'p_type', 'p_capacity'],
  delete_parking_zone: ['p_zone_id'],
  initialize_parking_slots: ['p_zone_id'],
  reserve_parking_slot: ['p_user_id', 'p_vehicle_id', 'p_slot_id'],
  transition_parking_session: ['p_plate', 'p_session_id'],
  request_parking_payment: ['p_user_id', 'p_plan_id'],
  edit_parking_vehicle: ['p_user_id', 'p_vehicle_id', 'p_fields', 'p_delete'],
  parking_report: ['p_time_zone']
};

/**
 * Phân tích mệnh đề WHERE SQL gốc thành danh sách bộ lọc (eq, neq, in).
 */
function parseWhereClause(whereStr, aliasMap = {}) {
  if (!whereStr || !whereStr.trim()) return [];
  // Tách theo từ khóa AND ở ngoài chuỗi nháy đơn
  const parts = [];
  let buf = '';
  let inQuotes = false;
  let depth = 0;
  for (let i = 0; i < whereStr.length; i++) {
    const ch = whereStr[i];
    if (ch === "'") {
      buf += ch;
      if (inQuotes && whereStr[i + 1] === "'") {
        buf += whereStr[i + 1];
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (!inQuotes) {
      if (ch === '(') depth++;
      else if (ch === ')') depth = Math.max(0, depth - 1);
      if (depth === 0 && /^\s+AND\s+/i.test(whereStr.slice(i))) {
        const matchAnd = whereStr.slice(i).match(/^\s+AND\s+/i)[0];
        parts.push(buf.trim());
        buf = '';
        i += matchAnd.length - 1;
        continue;
      }
    }
    buf += ch;
  }
  if (buf.trim()) parts.push(buf.trim());

  const filters = [];
  for (const cond of parts) {
    // 1. col IN (...)
    const inMatch = cond.match(/^([a-zA-Z0-9_.]+)(?:::text)?\s+IN\s*\(([\s\S]+)\)$/i);
    if (inMatch) {
      const col = resolveColumnAlias(inMatch[1], aliasMap);
      const vals = splitSqlTopLevel(inMatch[2], ',').map(parseSqlToken);
      filters.push({ type: 'in', col, val: vals });
      continue;
    }
    // 2. col <> val or col != val
    const neqMatch = cond.match(/^([a-zA-Z0-9_.]+)(?:::text)?\s*(?:<>|!=)\s*([\s\S]+)$/i);
    if (neqMatch) {
      const col = resolveColumnAlias(neqMatch[1], aliasMap);
      const val = parseSqlToken(neqMatch[2]);
      filters.push({ type: 'neq', col, val });
      continue;
    }
    // 3. col = val
    const eqMatch = cond.match(/^([a-zA-Z0-9_.]+)(?:::text)?\s*=\s*([\s\S]+)$/i);
    if (eqMatch) {
      const col = resolveColumnAlias(eqMatch[1], aliasMap);
      const val = parseSqlToken(eqMatch[2]);
      filters.push({ type: 'eq', col, val });
      continue;
    }
  }
  return filters;
}

function resolveColumnAlias(rawCol, aliasMap = {}) {
  const clean = rawCol.trim();
  if (!clean.includes('.')) return clean;
  const [prefix, colName] = clean.split('.');
  const mappedTable = aliasMap[prefix];
  if (!mappedTable || mappedTable.isMain) {
    return colName;
  }
  return `${mappedTable.table}.${colName}`;
}

function applyWhereFilters(queryBuilder, filters) {
  let q = queryBuilder;
  for (const f of filters) {
    if (f.type === 'eq' && typeof q.eq === 'function') {
      q = q.eq(f.col, f.val);
    } else if (f.type === 'neq' && typeof q.neq === 'function') {
      q = q.neq(f.col, f.val);
    } else if (f.type === 'in' && typeof q.in === 'function') {
      q = q.in(f.col, f.val);
    }
  }
  return q;
}

/**
 * Thực thi trực tiếp câu lệnh SQL gốc (SELECT, INSERT INTO, UPDATE, DELETE FROM, hoặc SELECT public.rpc_fn(...)).
 * Cho phép toàn bộ mã nguồn sử dụng 100% lệnh SQL gốc để có thể copy dán thẳng vào Supabase SQL Editor.
 */
export async function runSql(db, rawSql, options = {}) {
  const cleaned = String(rawSql || '')
    .replace(/^\s*--[^\n]*$/gm, '')
    .trim()
    .replace(/;+\s*$/, '');

  // Nếu db là kết nối PostgreSQL trực tiếp (như PGlite / pg.Pool)
  if (db && typeof db.query === 'function' && !db.from) {
    const res = await db.query(cleaned);
    return { data: res.rows, count: res.rows?.length ?? 0, error: null };
  }

  // 1. Kiểm tra nếu câu lệnh là gọi hàm RPC PostgreSQL: SELECT public.func_name(...)
  const rpcMatch = cleaned.match(
    /^SELECT\s+(?:public\.)?([a-z0-9_]+)\s*\(([\s\S]*)\)\s*(?:AS\s+[a-z0-9_]+)?$/i
  );
  if (rpcMatch && !/\s+FROM\s+/i.test(cleaned)) {
    const fnName = rpcMatch[1].toLowerCase();
    const rawArgs = splitSqlTopLevel(rpcMatch[2], ',').map(parseSqlToken);
    const paramNames = RPC_PARAM_MAP[fnName] || [];
    const argsObj = {};
    paramNames.forEach((pName, idx) => {
      argsObj[pName] = rawArgs[idx] !== undefined ? rawArgs[idx] : null;
    });
    const data = await rpc(db, fnName, argsObj);
    return { data, error: null };
  }

  // 2. Câu lệnh SELECT ... FROM public.<table> ...
  if (/^SELECT\s+/i.test(cleaned)) {
    return withSupabaseRetry(async () => {
      let rest = cleaned;
      let limitVal = null;
      let offsetVal = null;

      const offsetMatch = rest.match(/\s+OFFSET\s+(\d+)\s*$/i);
      if (offsetMatch) {
        offsetVal = Number(offsetMatch[1]);
        rest = rest.slice(0, offsetMatch.index).trim();
      }
      const limitMatch = rest.match(/\s+LIMIT\s+(\d+)\s*$/i);
      if (limitMatch) {
        limitVal = Number(limitMatch[1]);
        rest = rest.slice(0, limitMatch.index).trim();
      }

      let orderClause = null;
      const orderMatch = rest.match(/\s+ORDER\s+BY\s+([\s\S]+)$/i);
      if (orderMatch) {
        orderClause = orderMatch[1].trim();
        rest = rest.slice(0, orderMatch.index).trim();
      }

      let whereClause = null;
      const whereMatch = rest.match(/\s+WHERE\s+([\s\S]+)$/i);
      if (whereMatch) {
        whereClause = whereMatch[1].trim();
        rest = rest.slice(0, whereMatch.index).trim();
      }

      const fromMatch = rest.match(/^SELECT\s+([\s\S]+?)\s+FROM\s+(?:public\.)?([a-z0-9_]+)(?:\s+([a-z0-9_]+))?([\s\S]*)$/i);
      if (!fromMatch) {
        throw new Error(`Invalid SELECT SQL syntax: ${cleaned}`);
      }

      const selectColsRaw = fromMatch[1].trim();
      const mainTable = fromMatch[2].trim();
      const mainAlias = (fromMatch[3] || mainTable).trim();
      const joinsRaw = (fromMatch[4] || '').trim();

      const aliasMap = {
        [mainAlias]: { table: mainTable, isMain: true },
        [mainTable]: { table: mainTable, isMain: true }
      };

      const joinRegex = /(LEFT|INNER)?\s*JOIN\s+(?:public\.)?([a-z0-9_]+)(?:\s+([a-z0-9_]+))?\s+ON\s+([^\n]+?)(?=(?:\s+(?:LEFT|INNER)?\s*JOIN\s+)|$)/gi;
      let jMatch;
      while ((jMatch = joinRegex.exec(joinsRaw)) !== null) {
        const joinType = (jMatch[1] || 'LEFT').toUpperCase();
        const jTable = jMatch[2].trim();
        const jAlias = (jMatch[3] || jTable).trim();
        const onCond = jMatch[4].trim();
        // Tìm parentAlias trong mệnh đề ON (ví dụ: ON z.id = s.zone_id -> parent của z là s)
        let parentAlias = mainAlias;
        const onRefs = [...onCond.matchAll(/([a-z0-9_]+)\.[a-z0-9_]+/gi)].map((m) => m[1]);
        for (const ref of onRefs) {
          if (ref !== jAlias && ref !== jTable && aliasMap[ref]) {
            parentAlias = ref;
            break;
          }
        }
        aliasMap[jAlias] = {
          alias: jAlias,
          table: jTable,
          isMain: false,
          isInner: joinType === 'INNER',
          parentAlias,
          onCond
        };
        aliasMap[jTable] = aliasMap[jAlias];
      }

      const selectString = options.postgrestSelect || buildPostgrestSelect(selectColsRaw, aliasMap);
      let q = db.from(mainTable);
      if (options.countExact) {
        q = q.select(selectString, { count: 'exact' });
      } else {
        q = q.select(selectString);
      }

      if (whereClause) {
        const filters = parseWhereClause(whereClause, aliasMap);
        q = applyWhereFilters(q, filters);
      }

      if (orderClause && typeof q.order === 'function') {
        const orderParts = splitSqlTopLevel(orderClause, ',');
        for (const part of orderParts) {
          const m = part.trim().match(/^([a-zA-Z0-9_.]+)(?:\s+(ASC|DESC))?$/i);
          if (m) {
            const col = resolveColumnAlias(m[1], aliasMap);
            const dir = (m[2] || '').toUpperCase();
            if (dir === 'DESC') {
              q = q.order(col, { ascending: false });
            } else if (dir === 'ASC') {
              q = q.order(col, { ascending: true });
            } else {
              q = q.order(col);
            }
          }
        }
      }

      if (offsetVal !== null && limitVal !== null && typeof q.range === 'function') {
        q = q.range(offsetVal, offsetVal + limitVal - 1);
      } else if (limitVal !== null && !options.single && !options.maybeSingle && typeof q.limit === 'function') {
        q = q.limit(limitVal);
      }

      if (options.single && typeof q.single === 'function') {
        q = q.single();
      } else if (options.maybeSingle && typeof q.maybeSingle === 'function') {
        q = q.maybeSingle();
      }

      return await q;
    });
  }

  // 3. Câu lệnh INSERT INTO public.<table> ...
  if (/^INSERT\s+INTO\s+/i.test(cleaned)) {
    return withSupabaseRetry(async () => {
      let rest = cleaned;
      let returningCols = null;
      const retMatch = rest.match(/\s+RETURNING\s+([\s\S]+)$/i);
      if (retMatch) {
        returningCols = retMatch[1].trim();
        rest = rest.slice(0, retMatch.index).trim();
      }

      let onConflictCol = null;
      let ignoreDuplicates = false;
      const conflictMatch = rest.match(/\s+ON\s+CONFLICT\s*\(([^)]+)\)\s+DO\s+(NOTHING|UPDATE[\s\S]+)$/i);
      if (conflictMatch) {
        onConflictCol = conflictMatch[1].trim();
        ignoreDuplicates = /^NOTHING$/i.test(conflictMatch[2].trim());
        rest = rest.slice(0, conflictMatch.index).trim();
      }

      const insMatch = rest.match(/^INSERT\s+INTO\s+(?:public\.)?([a-z0-9_]+)\s*\(([^)]+)\)\s*VALUES\s*([\s\S]+)$/i);
      if (!insMatch) {
        throw new Error(`Invalid INSERT SQL syntax: ${cleaned}`);
      }

      const table = insMatch[1].trim();
      const cols = splitSqlTopLevel(insMatch[2], ',').map((c) => c.trim());
      const valuesRaw = insMatch[3].trim();

      const tupleStrings = splitSqlTopLevel(valuesRaw, ',').map((t) => {
        const trimmed = t.trim();
        return trimmed.startsWith('(') && trimmed.endsWith(')') ? trimmed.slice(1, -1) : trimmed;
      });

      const parsedRows = tupleStrings.map((tupleStr) => {
        const vals = splitSqlTopLevel(tupleStr, ',').map(parseSqlToken);
        const obj = {};
        cols.forEach((c, idx) => {
          obj[c] = vals[idx] !== undefined ? vals[idx] : null;
        });
        return obj;
      });

      const payload =
        options.asArray ? parsedRows : parsedRows.length === 1 ? parsedRows[0] : parsedRows;

      let q;
      if (onConflictCol && typeof db.from(table).upsert === 'function') {
        q = db.from(table).upsert(payload, { onConflict: onConflictCol, ignoreDuplicates });
      } else {
        const insertPayload = options.insertArray ? parsedRows : payload;
        q = db.from(table).insert(insertPayload);
      }

      if (returningCols && q && typeof q.select === 'function') {
        q = returningCols === '*' ? q.select() : q.select(returningCols);
        if (options.single && typeof q.single === 'function') {
          q = q.single();
        } else if (options.maybeSingle && typeof q.maybeSingle === 'function') {
          q = q.maybeSingle();
        }
      }

      return await q;
    });
  }

  // 4. Câu lệnh UPDATE public.<table> SET ... WHERE ...
  if (/^UPDATE\s+/i.test(cleaned)) {
    return withSupabaseRetry(async () => {
      let rest = cleaned;
      let returningCols = null;
      const retMatch = rest.match(/\s+RETURNING\s+([\s\S]+)$/i);
      if (retMatch) {
        returningCols = retMatch[1].trim();
        rest = rest.slice(0, retMatch.index).trim();
      }

      let whereClause = null;
      const whereMatch = rest.match(/\s+WHERE\s+([\s\S]+)$/i);
      if (whereMatch) {
        whereClause = whereMatch[1].trim();
        rest = rest.slice(0, whereMatch.index).trim();
      }

      const updMatch = rest.match(/^UPDATE\s+(?:public\.)?([a-z0-9_]+)\s+SET\s+([\s\S]+)$/i);
      if (!updMatch) {
        throw new Error(`Invalid UPDATE SQL syntax: ${cleaned}`);
      }

      const table = updMatch[1].trim();
      const setRaw = updMatch[2].trim();
      const assignments = splitSqlTopLevel(setRaw, ',');
      const updates = {};
      for (const assign of assignments) {
        const eqIdx = assign.indexOf('=');
        if (eqIdx !== -1) {
          const col = assign.slice(0, eqIdx).trim();
          const val = parseSqlToken(assign.slice(eqIdx + 1).trim());
          updates[col] = val;
        }
      }

      const filters = whereClause ? parseWhereClause(whereClause) : [];
      let q = db.from(table);
      // Apply eq/in filters after update (standard Supabase chain)
      q = q.update(updates);
      q = applyWhereFilters(q, filters);

      if (returningCols && q && typeof q.select === 'function') {
        q = returningCols === '*' ? q.select() : q.select(returningCols);
        if (options.single && typeof q.single === 'function') {
          q = q.single();
        } else if (options.maybeSingle && typeof q.maybeSingle === 'function') {
          q = q.maybeSingle();
        }
      }

      return await q;
    });
  }

  // 5. Câu lệnh DELETE FROM public.<table> WHERE ...
  if (/^DELETE\s+FROM\s+/i.test(cleaned)) {
    return withSupabaseRetry(async () => {
      const delMatch = cleaned.match(/^DELETE\s+FROM\s+(?:public\.)?([a-z0-9_]+)(?:\s+WHERE\s+([\s\S]+))?$/i);
      if (!delMatch) {
        throw new Error(`Invalid DELETE SQL syntax: ${cleaned}`);
      }
      const table = delMatch[1].trim();
      const whereClause = delMatch[2] || '';
      const filters = whereClause ? parseWhereClause(whereClause) : [];
      let q = db.from(table).delete();
      q = applyWhereFilters(q, filters);
      return await q;
    });
  }

  throw new Error(`Unsupported SQL statement: ${cleaned}`);
}

/**
 * Chuyển đổi danh sách cột SELECT có JOIN (kể cả JOIN nhiều tầng như vehicles -> parking_slots -> parking_zones)
 * sang biểu thức tương ứng khi chạy qua Supabase client, trong khi vẫn giữ nguyên câu lệnh SQL gốc trong code.
 */
function buildPostgrestSelect(selectColsRaw, aliasMap) {
  const cols = splitSqlTopLevel(selectColsRaw, ',');
  const mainEntry = Object.values(aliasMap).find((a) => a.isMain);
  const mainAlias = mainEntry ? Object.keys(aliasMap).find((k) => aliasMap[k] === mainEntry) : 'main';

  const colsByAlias = new Map();
  colsByAlias.set(mainAlias, []);

  const uniqueJoins = [];
  const seenJoinTables = new Set();
  for (const info of Object.values(aliasMap)) {
    if (!info.isMain && !seenJoinTables.has(info.alias)) {
      seenJoinTables.add(info.alias);
      uniqueJoins.push(info);
      colsByAlias.set(info.alias, []);
    }
  }

  for (const rawCol of cols) {
    const clean = rawCol.replace(/\s+AS\s+[a-z0-9_]+$/i, '').trim();
    if (!clean.includes('.')) {
      colsByAlias.get(mainAlias).push(clean);
      continue;
    }
    const [alias, colName] = clean.split('.');
    const info = aliasMap[alias];
    if (!info || info.isMain) {
      colsByAlias.get(mainAlias).push(colName);
    } else {
      if (!colsByAlias.has(info.alias)) colsByAlias.set(info.alias, []);
      colsByAlias.get(info.alias).push(colName);
    }
  }

  function renderNode(currentAlias) {
    const ownCols = [...(colsByAlias.get(currentAlias) || [])];
    const childJoins = uniqueJoins.filter((j) => {
      const parentInfo = aliasMap[j.parentAlias];
      if (currentAlias === mainAlias) {
        return !parentInfo || parentInfo.isMain;
      }
      return j.parentAlias === currentAlias || parentInfo?.alias === currentAlias;
    });

    for (const child of childJoins) {
      const childInner = renderNode(child.alias);
      if (childInner) {
        const tableExpr = child.isInner ? `${child.table}!inner` : child.table;
        ownCols.push(`${tableExpr}(${childInner})`);
      }
    }
    return ownCols.join(', ');
  }

  return renderNode(mainAlias) || '*';
}

// ===========================================================================
// DANH MỤC LỆNH SQL GỐC CHUẨN POSTGRESQL ĐỂ COPY DÁN VÀO SUPABASE SQL EDITOR
// ===========================================================================
export const NATIVE_SQL = {
  PARKING_MAP_ZONE_SUMMARY: `
SELECT
  z.id AS zone_id,
  z.zone_name,
  z.vehicle_type,
  z.total_capacity,
  z.current_occupancy,
  COALESCE(z.drainage_status, 'Hoạt động tốt • Bơm chống ngập 3 cấp (Khô ráo 100%)') AS drainage_status,
  COALESCE(z.sensor_status, 'Hoạt động • Cảm biến siêu âm IoT từng ô') AS sensor_status,
  COALESCE(z.cctv_coverage, 'Camera AI 4K góc rộng 24/7') AS cctv_coverage,
  COALESCE(z.lighting_status, 'Đèn LED cảm ứng & Thông gió Jetfan') AS lighting_status,
  COUNT(s.id)::int AS total_slots,
  COUNT(s.id) FILTER (WHERE s.status IN ('occupied', 'rented'))::int AS total_rented,
  COUNT(s.id) FILTER (WHERE s.status = 'occupied')::int AS occupied,
  COUNT(s.id) FILTER (WHERE s.status = 'rented')::int AS rented_only,
  COUNT(s.id) FILTER (WHERE s.status IS NULL OR s.status IN ('empty', 'available'))::int AS empty,
  COUNT(s.id) FILTER (WHERE s.status = 'maintenance')::int AS maintenance,
  GREATEST(0, z.total_capacity - COUNT(s.id)::int)::int AS uncreated_slots,
  ROUND(
    (COUNT(s.id) FILTER (WHERE s.status IN ('occupied', 'rented'))::numeric * 100.0)
    / GREATEST(1, COALESCE(NULLIF(COUNT(s.id), 0), z.total_capacity, 1))
  )::int AS rental_rate,
  ROUND(
    (COUNT(s.id) FILTER (WHERE s.status = 'occupied')::numeric * 100.0)
    / GREATEST(1, COALESCE(NULLIF(COUNT(s.id), 0), z.total_capacity, 1))
  )::int AS occupancy_rate
FROM public.parking_zones z
LEFT JOIN public.parking_slots s ON s.zone_id = z.id
GROUP BY z.id
ORDER BY z.created_at ASC;
`.trim(),

  PARKING_MAP_OVERALL_SUMMARY: `
SELECT
  COUNT(DISTINCT z.id)::int AS total_zones,
  COALESCE(SUM(DISTINCT z.total_capacity), 0)::int AS total_capacity,
  COUNT(s.id)::int AS total_slots,
  COUNT(s.id) FILTER (WHERE s.status IN ('occupied', 'rented'))::int AS total_rented_slots,
  COUNT(s.id) FILTER (WHERE s.status = 'occupied')::int AS occupied_slots,
  COUNT(s.id) FILTER (WHERE s.status = 'rented')::int AS rented_only_slots,
  COUNT(s.id) FILTER (WHERE s.status IS NULL OR s.status IN ('empty', 'available'))::int AS empty_slots,
  COUNT(s.id) FILTER (WHERE s.status = 'maintenance')::int AS maintenance_slots
FROM public.parking_zones z
LEFT JOIN public.parking_slots s ON s.zone_id = z.id;
`.trim()
};

export async function executeNativeSql(db, nativeSqlText, params = [], supabaseAdapterFn = null) {
  if (db && typeof db.query === 'function' && !supabaseAdapterFn) {
    const res = await db.query(nativeSqlText, params);
    return res.rows;
  }
  if (typeof supabaseAdapterFn === 'function') {
    return withSupabaseRetry(() => supabaseAdapterFn(nativeSqlText, params));
  }
  const { data, error } = await runSql(db, nativeSqlText);
  if (error) throw error;
  return data;
}
