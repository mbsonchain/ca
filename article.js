const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const paragraphs = text => String(text).split(/\n\s*\n/).filter(p => p.trim()).map(p => `<p>${escape(p)}</p>`).join('');

// Keep content as plain text: the same layout supports an essay or an interview.
export function renderArticle({ title = '', byline = '', intro = '', blocks = [] }, { titleLevel = 2, highlightQuestions = true } = {}) {
  const titleHeading = titleLevel === 1 ? 'h1' : 'h2';
  return `${title ? `<${titleHeading} class="article-title">${escape(title)}</${titleHeading}>` : ''}
    ${byline ? `<p class="article-byline">${escape(byline)}</p>` : ''}
    ${intro ? `<p class="collection-intro"><mark>${escape(intro)}</mark></p>` : ''}
    <div class="collection-copy">${blocks.map(block => {
      if (block.type === 'qa') {
        const heading = title && titleLevel !== 1 ? 'h3' : 'h2';
        const question = escape(block.question);
        return `<section class="article-exchange"><${heading} class="article-question">${highlightQuestions ? `<mark>${question}</mark>` : question}</${heading}>${paragraphs(block.answer)}</section>`;
      }
      if (block.type === 'quote') {
        return `<blockquote class="article-quote">${paragraphs(block.text)}${block.credit ? `<cite>${escape(block.credit)}</cite>` : ''}</blockquote>`;
      }
      return paragraphs(block.text);
    }).join('')}</div>`;
}
