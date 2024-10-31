
node scripts/update-post.mjs $1

node scripts/rss.mjs

git add public/feed.xml

node scripts/update-algolia.mjs

git commit -m $2

git push

