UPDATE articles_article SET is_public = 1, status = 'published' WHERE status != 'published' OR is_public != 1;
SELECT COUNT(*) as total FROM articles_article;
SELECT COUNT(*) as public_count FROM articles_article WHERE is_public = 1 AND status = 'published';
SELECT title, slug, is_public, status FROM articles_article LIMIT 5;
