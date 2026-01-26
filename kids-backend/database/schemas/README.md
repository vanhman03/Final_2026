# Database Schema Documentation

## Overview

BrightSpark Kids uses a PostgreSQL database hosted on Supabase. The schema supports user management, educational content, gamification, e-commerce, and parental controls.

## Tables

### 1. Authentication & User Management

#### `auth.users` (Supabase managed)
- Core authentication table
- Managed by Supabase Auth
- Contains email, encrypted password, metadata

#### `public.profiles`
User profile information extending auth.users

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | Foreign key to auth.users |
| display_name | TEXT | User's display name |
| avatar_url | TEXT | Profile picture URL |
| pin_hash | TEXT | Bcrypt hashed PIN for parent mode |
| screen_time_limit | INTEGER | Daily screen time limit (minutes) |
| total_watch_time | INTEGER | Total watch time (minutes) |
| points | INTEGER | Gamification points |
| badges | TEXT[] | Array of earned badges |
| created_at | TIMESTAMP | Account creation time |
| updated_at | TIMESTAMP | Last update time |

#### `public.user_roles`
Role-based access control

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | Foreign key to auth.users |
| role | ENUM | 'admin' or 'parent' |

**Unique constraint:** (user_id, role)

---

### 2. Child Management

#### `public.children`
Child profiles managed by parents

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| parent_id | UUID | Foreign key to auth.users |
| name | TEXT | Child's name |
| age | INTEGER | Child's age (1-18) |
| avatar | TEXT | Avatar emoji/URL |
| points | INTEGER | Gamification points |
| badges | TEXT[] | Earned badges |
| screen_time_limit | INTEGER | Daily limit (minutes) |
| allowed_categories | TEXT[] | Allowed content categories |
| created_at | TIMESTAMP | Profile creation time |
| updated_at | TIMESTAMP | Last update time |

---

### 3. Educational Content

#### `public.videos`
YouTube-based educational videos

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| youtube_video_id | TEXT | YouTube video ID |
| title | TEXT | Video title |
| thumbnail_emoji | TEXT | Emoji representation |
| category | TEXT | Content category |
| age_group | TEXT | Target age range |
| duration | TEXT | Video duration |
| language | TEXT | Content language |
| created_at | TIMESTAMP | Added to catalog |

**Example categories:** Alphabet, Numbers, Colors, Animals, Science, Math

#### `public.favorites`
User favorite videos (many-to-many)

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| child_id | UUID | Foreign key to children |
| video_id | UUID | Foreign key to videos |
| created_at | TIMESTAMP | Favorited time |

**Unique constraint:** (child_id, video_id)

#### `public.playlists`
Custom video playlists

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| child_id | UUID | Foreign key to children |
| name | TEXT | Playlist name |
| is_locked | BOOLEAN | Parent-locked playlist |
| created_at | TIMESTAMP | Creation time |

#### `public.playlist_videos`
Playlist contents (many-to-many)

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| playlist_id | UUID | Foreign key to playlists |
| video_id | UUID | Foreign key to videos |
| position | INTEGER | Sort order |

**Unique constraint:** (playlist_id, video_id)

---

### 4. Gaming & Activity Tracking

#### `public.game_activities`
Game session logs

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| child_id | UUID | Foreign key to children |
| game_type | TEXT | Type of game played |
| score | INTEGER | Points scored |
| level | TEXT | Game level/difficulty |
| time_spent | INTEGER | Duration (seconds) |
| played_at | TIMESTAMP | Session start time |

**Example game types:** color-match, puzzle, memory-game

#### `public.screen_time_logs`
Screen time tracking

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| child_id | UUID | Foreign key to children |
| activity_type | TEXT | 'video' or 'game' |
| started_at | TIMESTAMP | Session start |
| ended_at | TIMESTAMP | Session end |
| duration_seconds | INTEGER | Calculated duration |

---

### 5. E-commerce

#### `public.products`
Shop product catalog

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| name | TEXT | Product name |
| description | TEXT | Product description |
| price | DECIMAL(10,2) | Price in VND |
| image_url | TEXT | Product image |
| category | TEXT | Product category |
| age_group | TEXT | Recommended age |
| in_stock | BOOLEAN | Availability |
| created_at | TIMESTAMP | Added to catalog |

#### `public.orders`
Purchase orders

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | Foreign key to auth.users |
| total_amount | DECIMAL(10,2) | Order total |
| payment_status | TEXT | Payment status |
| vnp_txn_ref | TEXT | VNPay transaction ref |
| created_at | TIMESTAMP | Order creation time |

**Payment statuses:** pending, completed, failed

#### `public.order_items`
Order line items

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| order_id | UUID | Foreign key to orders |
| product_id | UUID | Foreign key to products |
| quantity | INTEGER | Items ordered |
| price_at_purchase | DECIMAL(10,2) | Price snapshot |

---

## Row Level Security (RLS)

All tables have RLS enabled. Key policies:

### Profiles
- Users can view/update their own profile
- Admins can manage all profiles

### Children
- Parents can manage their own children
- Admins can manage all children

### Videos & Products
- Public read access for all users
- Admin-only write access

### Favorites, Playlists, Game Activities
- Users can manage their own children's data
- Admins can manage all data

### Orders
- Users can view/create their own orders
- Admins can view all orders

---

## Indexes

Performance indexes on frequently queried columns:
- `profiles(user_id, display_name)`
- `children(parent_id, age)`
- `videos(category, age_group, language)`
- `favorites(child_id, video_id, created_at)`
- `game_activities(child_id, game_type, score, played_at)`
- `screen_time_logs(child_id, started_at)`
- `orders(user_id, payment_status, created_at)`

See migration `20250102000002_performance_indexes.sql` for complete list.

---

## Triggers

### Auto-updated timestamps
- `profiles.updated_at`
- `children.updated_at`

### Business logic
- `award_points_on_game` - Automatically awards points when games are logged
- `hash_pin_on_change` - Automatically hashes PINs using bcrypt

---

## Functions

### User-facing Functions
- `hash_pin(pin_text)` - Hash a PIN with bcrypt
- `verify_pin(user_id, pin_text)` - Verify PIN against stored hash
- `award_points(child_id, points, activity)` - Award points and check badges
- `check_screen_time_limit(child_id)` - Check remaining screen time

### Internal Functions
- `check_and_award_badges(child_id, points)` - Badge logic
- `has_role(user_id, role)` - Role checking for RLS

See migration `20250102000004_business_logic_functions.sql` for details.

---

## Relationships

```
auth.users
  ├─→ profiles (one-to-one)
  ├─→ user_roles (one-to-many)
  ├─→ children (one-to-many as parent)
  └─→ orders (one-to-many)

children
  ├─→ favorites (one-to-many)
  ├─→ playlists (one-to-many)
  ├─→ game_activities (one-to-many)
  └─→ screen_time_logs (one-to-many)

videos
  ├─→ favorites (one-to-many)
  └─→ playlist_videos (one-to-many)

playlists
  └─→ playlist_videos (one-to-many)

products
  └─→ order_items (one-to-many)

orders
  └─→ order_items (one-to-many)
```

---

## Data Flow Examples

### User Registration
1. Supabase creates `auth.users` entry
2. Trigger creates `profiles` entry
3. Trigger creates `user_roles` entry with 'parent' role
4. PIN is hashed via trigger and stored in `profiles.pin_hash`

### Playing a Game
1. Game session logged in `game_activities`
2. Trigger calculates points based on score
3. Function `award_points` updates `children.points`
4. Function `check_and_award_badges` checks achievements
5. New badges added to `children.badges` array

### Tracking Screen Time
1. Session start logged in `screen_time_logs`
2. Function `check_screen_time_limit` validates against limit
3. On session end, `duration_seconds` calculated
4. Analytics queries aggregate by date for reporting
