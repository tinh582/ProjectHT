import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readPage } from '../../frontend/src/lib/pagination.js';

test('legacy array responses retain their records and paginate locally', () => {
  const records = Array.from({ length: 30 }, (_, id) => ({ id }));
  assert.deepEqual(readPage(records, 2, 25), { items: records.slice(25), total: 30 });
  assert.equal(records.length, 30);
});

test('paginated responses are not sliced a second time', () => {
  const data = { items: [{ id: 26 }], total: 26, page: 2, pageSize: 25 };
  assert.deepEqual(readPage(data, 2, 25), { items: data.items, total: 26 });
});

test('empty lists work with both API formats', () => {
  assert.deepEqual(readPage([], 1, 25), { items: [], total: 0 });
  assert.deepEqual(readPage({ items: [], total: 0 }, 1, 25), { items: [], total: 0 });
});

test('malformed responses are rejected before undefined can enter list state', () => {
  for (const data of [undefined, null, {}, { error: 'Failure' }, { items: null, total: 0 }, { items: [], total: null }]) {
    assert.throws(() => readPage(data, 1, 25));
  }
});
