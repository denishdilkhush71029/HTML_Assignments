-- 1. Base Core User Table Entity Profile Registry
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL, -- Encrypted backend value strictly handled by bcrypt
    profile_photo_url TEXT DEFAULT 'placeholder_avatar.png',
    bio TEXT,
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Many-To-Many Relational Matrix Follower System Configuration
CREATE TABLE followers (
    id SERIAL PRIMARY KEY,
    follower_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    following_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_follower_link_pair UNIQUE (follower_id, following_id),
    CONSTRAINT self_follow_security_block CHECK (follower_id <> following_id)
);

-- 3. Posts Stream Primary Data Storage Engine
CREATE TABLE posts (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    caption TEXT,
    media_url TEXT, -- Pointing directly to managed CDN endpoints (Cloudinary/AWS S3 bucket paths)
    post_type VARCHAR(20) DEFAULT 'text' CHECK (post_type IN ('text', 'image', 'video', 'poll')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Many-To-Many Unique Index Post Likes System Engine
CREATE TABLE post_likes (
    id SERIAL PRIMARY KEY,
    post_id INT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_user_post_like_registry UNIQUE (post_id, user_id)
);

-- 5. Strict Relational Comments Data Node Registry
CREATE TABLE comments (
    id SERIAL PRIMARY KEY,
    post_id INT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    comment_text TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. Notifications Stream State Registry
CREATE TABLE notifications (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    trigger_user_id INT REFERENCES users(id) ON DELETE SET NULL,
    type VARCHAR(50) NOT NULL, -- 'LIKE', 'COMMENT', 'FOLLOW', 'MESSAGE', 'SYSTEM'
    message_payload TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------- 
-- PERFORMANCE ENHANCEMENT QUERY OPTIMIZATION INDEX ENGINE ARRAY
-- -------------------------------------------------------------
CREATE INDEX idx_followers_lookup ON followers(following_id, follower_id);
CREATE INDEX idx_posts_chronological_feed ON posts(user_id, created_at DESC);
CREATE INDEX idx_likes_post_mapping ON post_likes(post_id);
CREATE INDEX idx_notifications_unread_lookup ON notifications(user_id) WHERE is_read = FALSE;