import test from 'node:test';
import assert from 'node:assert/strict';
import { renderArticle } from '../article.js';
import { interviewArticle } from '../collection.js';

test('the standalone interview starts with its exchanges and ends with MS, without a separate title or question highlights', () => {
  const html = renderArticle(interviewArticle, { highlightQuestions: false });
  assert.doesNotMatch(html, /article-title|CONAMORE is a place|<h1[ >]/);
  assert.equal((html.match(/<h2 class="article-question">DF:/g) || []).length, 11);
  assert.equal((html.match(/<p>MS:/g) || []).length, 11);
  assert.match(html, /<p>MS: Everything\.<\/p><\/section><\/div>$/);
  assert.doesNotMatch(html, /undefined|<mark>|article-byline/);
});

test('an interview supports a title, byline, multiple answer paragraphs and a credited quote', () => {
  const html = renderArticle({
    title: 'A conversation',
    byline: 'Interview by A & B',
    intro: 'An introduction.',
    blocks: [
      { type: 'qa', question: 'Where did it begin?', answer: 'First paragraph.\n\nSecond paragraph.' },
      { type: 'quote', text: 'Something to remember.', credit: 'The interviewee' },
      { type: 'paragraph', text: 'The final paragraph.' },
    ],
  });
  assert.match(html, /<h2 class="article-title">A conversation<\/h2>/);
  assert.match(html, /Interview by A &amp; B/);
  assert.match(html, /<h3 class="article-question"><mark>Where did it begin\?<\/mark><\/h3>/);
  assert.match(html, /<p>First paragraph\.<\/p><p>Second paragraph\.<\/p>/);
  assert.match(html, /<cite>The interviewee<\/cite>/);
  assert.match(html, /<p>The final paragraph\.<\/p>/);
});

test('article content is rendered as literal text and untitled interviews have second-level questions', () => {
  const html = renderArticle({blocks: [
    { type: 'qa', question: 'What does <love> mean?', answer: '<script>alert("test")</script>' },
  ]});
  assert.match(html, /<h2 class="article-question"><mark>What does &lt;love&gt; mean\?/);
  assert.match(html, /&lt;script&gt;alert\(&quot;test&quot;\)&lt;\/script&gt;/);
  assert.doesNotMatch(html, /<script>/);
});
