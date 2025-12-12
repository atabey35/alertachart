-- Migration: Add tags column to blog_posts table
-- Run this migration to add tags support to blog posts

-- Add tags column (TEXT array for PostgreSQL)
ALTER TABLE blog_posts 
ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';

-- Create index for tags (for faster searches)
CREATE INDEX IF NOT EXISTS idx_blog_posts_tags ON blog_posts USING GIN(tags);

-- Add comment
COMMENT ON COLUMN blog_posts.tags IS 'Array of tags for blog post (e.g., ["crypto", "bitcoin", "trading"])';
