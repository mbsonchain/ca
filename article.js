const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const paragraphs = text => String(text).split(/\n\s*\n/).filter(p => p.trim()).map(p => `<p>${escape(p)}</p>`).join('');

// Keep content as plain text: the same layout supports an essay or an interview.
export function renderArticle({ title = '', byline = '', intro = '', blocks = [] }) {
  return `${title ? `<h2 class="article-title">${escape(title)}</h2>` : ''}
    ${byline ? `<p class="article-byline">${escape(byline)}</p>` : ''}
    ${intro ? `<p class="collection-intro"><mark>${escape(intro)}</mark></p>` : ''}
    <div class="collection-copy">${blocks.map(block => {
      if (block.type === 'qa') {
        const heading = title ? 'h3' : 'h2';
        return `<section class="article-exchange"><${heading} class="article-question"><mark>${escape(block.question)}</mark></${heading}>${paragraphs(block.answer)}</section>`;
      }
      if (block.type === 'quote') {
        return `<blockquote class="article-quote">${paragraphs(block.text)}${block.credit ? `<cite>${escape(block.credit)}</cite>` : ''}</blockquote>`;
      }
      return paragraphs(block.text);
    }).join('')}</div>`;
}
