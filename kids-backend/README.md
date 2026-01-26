# BrightSpark Kids Backend

Express.js + TypeScript + Supabase backend for the BrightSpark Kids educational platform.

## 🚀 Features

- **Express.js** REST API server
- **TypeScript** for type safety
- **Supabase** for database and authentication
- **JWT Authentication** with Supabase Auth
- **VNPay Integration** for payment processing
- **Role-based Access Control** (Admin/User)
- **Comprehensive API Routes** for all platform features

## 📋 Prerequisites

- Node.js 18+ and npm
- Supabase account and project
- VNPay merchant account (for payment features)

## 🛠️ Setup

1. **Clone and install dependencies:**
```bash
npm install
```

2. **Configure environment variables:**
```bash
cp .env.example .env
```

Edit `.env` with your credentials:
- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_ANON_KEY`: Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY`: Supabase service role key
- `VNPAY_HASH_SECRET`: VNPay hash secret
- `FRONTEND_URL`: Your frontend URL

3. **Link to Supabase project:**
```bash
npm run link
```

4. **Run database migrations:**
```bash
npm run migrate
```

## 🏃 Running the Server

### Development
```bash
npm run dev
```

### Production
```bash
npm run build
npm start
```

## 📚 API Routes

### Authentication
All protected routes require `Authorization: Bearer <token>` header.

### Videos (`/api/videos`)
- `GET /api/videos` - Get all videos (with filtering & pagination)
  - Query params: `category`, `age_group`, `language`, `search`, `page`, `limit`
- `GET /api/videos/:id` - Get single video
- `POST /api/videos` - Create video (Admin only)
- `PUT /api/videos/:id` - Update video (Admin only)
- `DELETE /api/videos/:id` - Delete video (Admin only)
- `GET /api/videos/categories/list` - Get all categories

### Profiles (`/api/profiles`)
- `GET /api/profiles/me` - Get current user's profile
- `PUT /api/profiles/me` - Update profile
- `POST /api/profiles/me/pin` - Set parental control PIN
- `POST /api/profiles/me/verify-pin` - Verify PIN
- `GET /api/profiles/me/stats` - Get user statistics
- `POST /api/profiles/me/add-points` - Add points to profile

### Playlists (`/api/playlists`)
- `GET /api/playlists` - Get all user playlists
  - Query param: `child_id`
- `GET /api/playlists/:id` - Get playlist with videos
- `POST /api/playlists` - Create playlist
- `PUT /api/playlists/:id` - Update playlist
- `DELETE /api/playlists/:id` - Delete playlist
- `POST /api/playlists/:id/videos` - Add video to playlist
- `DELETE /api/playlists/:id/videos/:videoId` - Remove video from playlist

### Favorites (`/api/favorites`)
- `GET /api/favorites` - Get all favorites
  - Query param: `child_id`
- `POST /api/favorites` - Add to favorites
- `DELETE /api/favorites/:id` - Remove from favorites
- `DELETE /api/favorites/video/:videoId` - Remove by video ID
- `GET /api/favorites/check/:videoId` - Check if favorited

### Screen Time (`/api/screen-time`)
- `GET /api/screen-time` - Get screen time logs
  - Query params: `child_id`, `start_date`, `end_date`, `limit`
- `GET /api/screen-time/summary` - Get screen time summary
  - Query params: `child_id`, `period` (today/week/month/year)
- `POST /api/screen-time/start` - Start screen time session
- `PUT /api/screen-time/:id/end` - End session
- `GET /api/screen-time/active` - Get active session

### Games (`/api/games`)
- `GET /api/games` - Get game activities
  - Query params: `child_id`, `game_type`, `start_date`, `end_date`, `page`, `limit`
- `POST /api/games` - Log game activity
- `GET /api/games/stats` - Get game statistics
  - Query param: `child_id`
- `GET /api/games/leaderboard` - Get leaderboard
  - Query params: `game_type`, `limit`

### Products (`/api/products`)
- `GET /api/products` - Get all products (with filtering)
  - Query params: `category`, `age_group`, `in_stock`, `min_price`, `max_price`, `search`, `page`, `limit`
- `GET /api/products/:id` - Get single product
- `POST /api/products` - Create product (Admin only)
- `PUT /api/products/:id` - Update product (Admin only)
- `DELETE /api/products/:id` - Delete product (Admin only)
- `GET /api/products/categories/list` - Get all categories

### Orders (`/api/orders`)
- `GET /api/orders` - Get user's orders
  - Query params: `status`, `page`, `limit`
- `GET /api/orders/:id` - Get single order
- `POST /api/orders` - Create order
- `PUT /api/orders/:id/cancel` - Cancel order
- `GET /api/orders/admin/all` - Get all orders (Admin only)

### Payment (`/api/payment`)
- `POST /api/payment/webhook` - VNPay payment webhook

### Email (`/api/email`)
- `POST /api/email/send` - Send email
  - Types: `welcome`, `order_confirmation`, `password_reset`, `achievement`

### Analytics (`/api/analytics`)
- `GET /api/analytics/dashboard` - Get dashboard analytics
- `GET /api/analytics/user/:userId` - Get user analytics (Admin only)

### Admin (`/api/admin`)
- `POST /api/admin/bulk-import-videos` - Bulk import videos
- `POST /api/admin/data-export` - Export data
- `GET /api/admin/stats` - Get system statistics

## 🗄️ Database Schema

The backend uses the following Supabase tables:
- `videos` - Educational videos
- `profiles` - User profiles
- `playlists` - Custom playlists
- `playlist_videos` - Playlist-video relationships
- `favorites` - User favorites
- `screen_time_logs` - Screen time tracking
- `game_activities` - Game activity logs
- `products` - Shop products
- `orders` - Purchase orders
- `order_items` - Order line items
- `user_roles` - User role assignments

## 🔐 Authentication

The backend uses Supabase Auth for JWT-based authentication:

1. User authenticates via Supabase client on frontend
2. Frontend includes JWT token in `Authorization: Bearer <token>` header
3. Backend validates token using Supabase Admin SDK
4. Protected routes check user permissions

### Admin Access

Admin routes require the user to have an `admin` role in the `user_roles` table:

```sql
INSERT INTO user_roles (user_id, role) VALUES ('<user-id>', 'admin');
```

## 📦 Project Structure

```
brightspark-kids-backend/
├── src/
│   ├── routes/          # API route handlers
│   ├── middleware/      # Express middleware (auth, etc.)
│   ├── config/          # Configuration (Supabase client)
│   ├── utils/           # Utility functions (validators, responses)
│   ├── app.ts           # Express app setup
│   └── server.ts        # Server entry point
├── database/
│   ├── migrations/      # Supabase migrations
│   ├── schemas/         # Database schema documentation
│   └── seed/            # Seed data
├── supabase/
│   └── config.toml      # Supabase configuration
└── package.json
```

## 🧪 Testing

```bash
# Type checking
npm run type-check

# Build
npm run build
```

## 📝 Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `SUPABASE_URL` | Supabase project URL | Yes |
| `SUPABASE_ANON_KEY` | Supabase anonymous key | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | Yes |
| `PORT` | Server port | No (default: 3000) |
| `NODE_ENV` | Environment (development/production) | No |
| `FRONTEND_URL` | Frontend URL for CORS | Yes |
| `VNPAY_HASH_SECRET` | VNPay payment hash secret | Yes (for payments) |

## 🚢 Deployment

1. Build the project: `npm run build`
2. Set environment variables on your hosting platform
3. Start the server: `npm start`

Recommended platforms:
- Railway
- Render
- Fly.io
- Heroku
- AWS/GCP/Azure

## 📄 License

UNLICENSED - Private project for BrightSpark Kids

## 🤝 Contributing

This is a private project. Contact the development team for contribution guidelines.
