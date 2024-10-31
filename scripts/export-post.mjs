import path from "path";
import fs from "fs/promises";
import matter from "gray-matter";
import sql from "../database/db.mjs";

export async function run() {
  try {
    // Get the file argument from the command line
    const fileArg = process.argv[2];
    if (!fileArg) {
      console.error("Please provide a file name as an argument.");
      process.exit(1);
    }

    const postsDir = path.join(process.cwd(), "_posts");
    const filePath = path.join(postsDir, fileArg);

    // Check if the file exists
    try {
      await fs.access(filePath);
    } catch (error) {
      console.error(`File ${fileArg} does not exist in the _posts directory.`);
      process.exit(1);
    }

    // Read the specified post file
    const matterPost = matter.read(filePath);
    const post = {
      title: matterPost.data.title,
      content: matterPost.content,
      slug: matterPost.data.slug,
      description: matterPost.data.description,
      tags: matterPost.data.metadata.split(","),
      publishedAt: matterPost.data.publishedAt,
    };

    console.log(`Updating post: ${post.title}`);

    // Update the post in the database based on the slug
    await sql`
      insert into post.post (title, slug, content, description, tags, published_at)
      values (${post.title}, ${post.slug}, ${post.content}, ${post.description}, ${post.tags}, ${post.publishedAt})
      on conflict (slug) do update set
        title = ${post.title},
        content = ${post.content},
        description = ${post.description},
        tags = ${post.tags},
        published_at = ${post.publishedAt};
    `;

    console.log(`Post updated successfully: ${post.title}`);
  } catch (error) {
    console.error("Error exporting post:", error);
  } finally {
    await sql.end();
    console.log("SQL connection closed.");
  }
}

await run();

