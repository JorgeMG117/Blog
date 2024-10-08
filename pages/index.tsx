import fs from 'fs';
import path from 'path';

type IndexProps = {
  htmlContent: string;
};

export default function Index({ htmlContent }: IndexProps) {
  return (
    <div dangerouslySetInnerHTML={{ __html: htmlContent }} />
  );
}

export async function getStaticProps() {
  const filePath = path.join(process.cwd(), 'public', 'index.html');
  const htmlContent = fs.readFileSync(filePath, 'utf8');

  return {
    props: {
      htmlContent,
    },
  };
}