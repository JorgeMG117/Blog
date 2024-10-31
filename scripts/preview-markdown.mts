import fs from 'fs';
import path from 'path';
import { parseMarkdownToHtml } from '../lib/markdown-parser';

async function previewMarkdown() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error('Please provide the path to a Markdown file.');
    process.exit(1);
  }

  const markdownFilePath = path.resolve(args[0]);
  if (!fs.existsSync(markdownFilePath)) {
    console.error(`File not found: ${markdownFilePath}`);
    process.exit(1);
  }

  const markdownContent = fs.readFileSync(markdownFilePath, 'utf-8');
  const htmlContent = await parseMarkdownToHtml(markdownContent);

  // Wrap the content in a basic HTML template
  const htmlTemplate = `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Markdown Preview</title>
<link rel="stylesheet" href="https://unpkg.com/github-markdown-css">
<style>
  body {
    max-width: 800px;
    margin: auto;
    padding: 2rem;
    background-color: #f6f8fa;
  }
  .markdown-body {
    box-sizing: border-box;
    min-width: 200px;
    max-width: 100%;
  }
</style>
</head>
<body>
<article class="markdown-body">
${htmlContent}
</article>
</body>
</html>
`;

  // Write the HTML content to a file
  const outputFilePath = path.join(process.cwd(), 'preview.html');
  fs.writeFileSync(outputFilePath, htmlTemplate, 'utf-8');
  console.log(`Preview generated at ${outputFilePath}`);
}

previewMarkdown().catch((error) => {
  console.error(error);
  process.exit(1);
});

