import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkRehype from 'remark-rehype';
import rehypeRaw from 'rehype-raw';
import rehypeSlug from 'rehype-slug';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import rehypeFormat from 'rehype-format';
import rehypeStringify from 'rehype-stringify';

export async function parseMarkdownToHtml(markdown: string) {
  const processedMarkdown = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeRaw)
    .use(rehypeSlug)
    .use(rehypeAutolinkHeadings, {
      behavior: 'wrap',
    })
    .use(rehypeFormat)
    .use(rehypeStringify)
    .process(markdown);
  return processedMarkdown.toString();
}

