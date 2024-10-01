import path from "path";
import fs from "fs/promises";
import matter from "gray-matter";
import sql from "../database/db.mjs";

export async function run() {
  try {
    const postsDir = path.join(process.cwd(), "_posts");
    const posts = await fs.readdir(postsDir);

    const rawPosts = await Promise.all(
      posts.map((post) => {
        const matterPost = matter.read(`${postsDir}/${post}`);
        return {
          title: matterPost.data.title,
          content: matterPost.content,
          slug: matterPost.data.slug,
          description: matterPost.data.description,
          tags: matterPost.data.metadata.split(","),
          publishedAt: matterPost.data.publishedAt,
        };
      })
    );

    for (const post of rawPosts) {
      console.log(`Exporting post: ${post.title}`);
      await sql`insert into post.post (title, slug, content, description, tags, published_at) values(${post.title}, ${post.slug}, ${post.content}, ${post.description}, ${post.tags}, ${post.publishedAt})`;
    }
  } catch (error) {
    console.error("Error exporting posts:", error);
  } finally {
    await sql.end();
    console.log("SQL connection closed.");
  }
}

await run();
