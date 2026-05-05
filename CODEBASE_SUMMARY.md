# EduKids (BrightSpark Kids) - Codebase Summary

## 1. Overview
EduKids (a.k.a BrightSpark Kids) is a comprehensive educational platform designed specifically for children, with built-in parent control features. The application is split into two main sections: a Parent Dashboard (for managing settings, tracking progress, and controlling access) and a Child Interface (for educational games, videos, and gamified learning).

The project is structured as a mono-repo containing both the frontend and backend.
- **Frontend App**: `kids-frontend`
- **Backend API**: `kids-backend`

---

## 2. Technology Stack

### Frontend (`kids-frontend`)
- **Core**: React 18, Vite, TypeScript
- **Styling**: Tailwind CSS, Shadcn UI (Radix UI components), Framer Motion (for animations)
- **Routing**: React Router DOM (v6)
- **State Management & Data Fetching**: React Query (`@tanstack/react-query`), Context API
- **Backend as a Service (BaaS)**: Supabase JS Client (`@supabase/supabase-js`)
- **Localization**: i18next (`react-i18next`) for multi-language support
- **Form Handling**: React Hook Form with Zod for validation

### Backend (`kids-backend`)
- **Core**: Node.js, Express.js, TypeScript
- **Database & Auth**: Supabase (PostgreSQL, Supabase Auth)
- **API Documentation**: Swagger UI (`swagger-jsdoc`, `swagger-ui-express`)
- **Security & Middleware**: Helmet, CORS, dotenv
- **Payment Processing**: `sepay-pg-node`

---

## 3. Project Structure

### 3.1. Frontend Architecture
Located in `/kids-frontend/src`:
- `/components`: Reusable UI components (buttons, modals, layout elements) and Shadcn UI components.
- `/pages`: Route-level components. Usually separated into parent-facing pages (Admin Dashboard) and child-facing pages (Games, Videos).
- `/context`: React Context providers for global state (e.g., `AuthContext` for managing user authentication and active profiles).
- `/hooks`: Custom React hooks.
- `/i18n`: Localization files (`locales/en.ts`, `locales/vi.ts`, etc.) and configuration for multi-language support.
- `/lib`: Utility functions and Supabase client initialization.
- `/services`: API consumption logic, interacting with the custom Node.js backend.

### 3.2. Backend Architecture
Located in `/kids-backend/src`:
- `server.ts` & `app.ts`: Entry points for the Express application. Sets up middlewares and binds routes.
- `/routes`: Express route definitions (e.g., auth, games, user progress, payments).
- `/middleware`: Custom middlewares (e.g., authentication verification, error handling).
- `/utils`: Helper functions and shared logic.
- `/config`: Configuration files for database connections and third-party services.

---

## 4. Key Features & Business Logic

### Parent Mode & Child Mode
The app enforces a strict separation between what a child can do and what a parent can manage.
- **Parent PIN Verification**: Accessing the parent dashboard requires navigating through a PIN modal. This ensures children cannot change settings.
- **Screen Time Management**: The backend helps track and limit a child's screen time, automatically locking the app or displaying a warning when the limit is reached.

### Gamification Engine
- **Games & Puzzles**: Educational content where children solve problems.
- **Rewards Flow**: Completing a puzzle sends a request from the React frontend to the Express backend. The backend validates the completion, interacts with Supabase to update the student's score, and awards Badges. The updated data reflects back on the frontend.

### Internationalization (i18n)
Full bilingual support (English and Vietnamese). The localization spans across the general UI, Admin Dashboard, PIN modals, and game instructions. Translating logic is centrally managed via `i18next`.

### Third-Party Integrations
- **Supabase**: Serves as the primary database (PostgreSQL) and handles user authentication.
- **Sepay**: Configured in the backend for processing payments (potentially for premium subscriptions or unlocking content).

---

## 5. Development Workflow
- **Frontend Dev**: `npm run dev` in `kids-frontend` (runs Vite dev server).
- **Backend Dev**: `npm run dev` in `kids-backend` (runs `tsx` in watch mode).
- **Database Management**: Supabase CLI commands (`supabase db reset`, `supabase db push`) are actively used to manage schema migrations.
