import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { extractLicensePlate } from '../src/roboflow.js';

test('Roboflow custom workflow extracts license plate from valid image', async () => {
  const imageBuffer = await readFile(new URL('../../frontend/sample-plate.jpg', import.meta.url));
  const base64 = imageBuffer.toString('base64');
  const result = await extractLicensePlate(base64);

  assert.equal(result.success, true);
  assert.equal(typeof result.plate, 'string');
  assert.match(result.plate, /50Z/);
});

test('Roboflow custom workflow handles image without detectable plate', async () => {
  const dummy = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
  const result = await extractLicensePlate(dummy);

  assert.equal(result.success, false);
  assert.ok(result.error);
});
