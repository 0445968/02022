import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { enrichStoryListItems } from '../lib/services/story-list-metadata.ts';

const story = (id, status = 'published', featuredImageId = null) => ({ id, status, featuredImageId });

test('Published keeps its publishing status while independent draft is active', () => {
  const original = story('published', 'published', 'live-image');
  const [item] = enrichStoryListItems(
    [original],
    [{ id: 'live-image', url: '/live.jpg', alt_text: 'Live story photograph' }],
    [{ story_id: 'published', updated_at: '2026-11-23T00:00:00Z' }]
  );
  assert.equal(item.status, 'published');
  assert.equal(original.status, 'published');
  assert.equal(item.hasUnpublishedChanges, true);
  assert.equal(item.unpublishedChangesUpdatedAt, '2026-11-23T00:00:00Z');
  assert.equal(item.featuredImageUrl, '/live.jpg');
  assert.equal(item.featuredImageAlt, 'Live story photograph');
});

test('Published without revision, including after discard/publish, shows None', () => {
  const published = story('published', 'published');
  for (const revisions of [[], [{ story_id: 'another-story', updated_at: null }]]) {
    const [item] = enrichStoryListItems([published], [], revisions);
    assert.equal(item.status, 'published');
    assert.equal(item.hasUnpublishedChanges, false);
    assert.equal(item.unpublishedChangesUpdatedAt, null);
  }
});

test('Ordinary never-published draft does not falsely advertise an active revision', () => {
  const [item] = enrichStoryListItems(
    [story('first-draft', 'draft')],
    [],
    [{ story_id: 'first-draft', updated_at: '2026-11-23' }]
  );
  assert.equal(item.status, 'draft');
  assert.equal(item.hasUnpublishedChanges, false);
});

test('Other publication states do not claim an active live-publication revision', () => {
  for (const status of ['in_review', 'scheduled', 'archived']) {
    const [item] = enrichStoryListItems([story(status, status)], [], [{ story_id: status, updated_at: null }]);
    assert.equal(item.status, status);
    assert.equal(item.hasUnpublishedChanges, false);
  }
});

test('Missing/removed image falls back cleanly and never uses revision replacement image', () => {
  const [item] = enrichStoryListItems(
    [story('published', 'published', 'missing-image')],
    [{ id: 'revision-image', url: '/not-live.jpg', alt_text: 'Unpublished' }],
    [{ story_id: 'published', updated_at: null }]
  );
  assert.equal(item.featuredImageUrl, null);
  assert.equal(item.featuredImageAlt, null);
  assert.equal(item.hasUnpublishedChanges, true);
});

test('Batched metadata maps correctly across pages with 25 rows', () => {
  const items = Array.from({ length: 25 }, (_, i) => story(`story-${i}`, 'published', `image-${i}`));
  const images = items.map((s, i) => ({ id: `image-${i}`, url: `/image-${i}.jpg`, alt_text: null }));
  const revisions = items.filter((_, i) => i % 3 === 0).map((s) => ({ story_id: s.id, updated_at: null }));
  const enriched = enrichStoryListItems(items, images, revisions);
  assert.equal(enriched.length, 25);
  assert.equal(enriched.filter((s) => s.hasUnpublishedChanges).length, 9);
  assert.equal(enriched[24].featuredImageUrl, '/image-24.jpg');
});

test('Visible-revisions input is the only source of draft indicators (RLS scope)', () => {
  const items = [story('mine'), story('someone-else')];
  const [mine, other] = enrichStoryListItems(items, [], [{ story_id: 'mine', updated_at: null }]);
  assert.equal(mine.hasUnpublishedChanges, true);
  assert.equal(other.hasUnpublishedChanges, false);
});

test('Service fetches page-scoped media and revisions in fixed batched queries', () => {
  const src = readFileSync(new URL('../lib/services/stories.ts', import.meta.url), 'utf8');
  const list = src.slice(src.indexOf('export async function listStories('), src.indexOf('// Public feeds'));
  assert.match(list, /\.in\('id', featuredIds\)/);
  assert.match(list, /\.in\('story_id', storyIds\)/);
  assert.match(list, /Promise\.all\(/);
  assert.match(list, /\.range\(/);
  assert.doesNotMatch(list, /getStoryRevision\(/);
});

test('EN/ES labels exist and remain distinct from status labels', () => {
  for (const locale of ['en', 'es']) {
    const dict = JSON.parse(readFileSync(new URL(`../messages/${locale}.json`, import.meta.url), 'utf8'));
    assert.ok(dict.stories.columns.status);
    assert.ok(dict.stories.columns.unpublishedChanges);
    assert.ok(dict.stories.activeDraft);
    assert.ok(dict.stories.noUnpublishedChanges);
    assert.ok(dict.stories.noFeaturedImage);
  }
});
