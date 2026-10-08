export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export function requireText(value, name, max = 200) {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > max) {
    throw new HttpError(400, `${name} is required (maximum ${max} characters).`);
  }
  return value.trim();
}

export function requireId(value) {
  if (!['string', 'number'].includes(typeof value) || !/^[a-zA-Z0-9-]{1,64}$/.test(String(value))) {
    throw new HttpError(400, 'Invalid identifier.');
  }
  return String(value);
}

export function pageRange(query) {
  const page = Number(query.page ?? 1);
  const pageSize = Number(query.pageSize ?? 25);
  if (!Number.isSafeInteger(page) || page < 1 || !Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100 || page > 1000000) {
    throw new HttpError(400, 'Invalid pagination.');
  }
  return { page, pageSize, from: (page - 1) * pageSize, to: page * pageSize - 1 };
}

export async function rpc(db, name, args) {
  const { data, error } = await db.rpc(name, args);
  if (error) throw error;
  return data;
}

export function errorHandler(error, req, res, next) {
  const dbStatus = { P0001: 409, '23505': 409, '23503': 409, '22P02': 400, '23514': 400 };
  const status = error.status || dbStatus[error.code] || 500;
  if (status >= 500) console.error('API request failed:', error.message);
  res.status(status).json({ error: status >= 500 ? 'The request could not be completed. Please try again.' : error.message });
}
