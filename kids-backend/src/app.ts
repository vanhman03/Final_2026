import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './config/swagger';

// Route imports
import paymentRoutes from './routes/payment';
import emailRoutes from './routes/email';
import analyticsRoutes from './routes/analytics';
import adminRoutes from './routes/admin';
import videosRoutes from './routes/videos';
import profilesRoutes from './routes/profiles';
import playlistsRoutes from './routes/playlists';
import favoritesRoutes from './routes/favorites';
import screenTimeRoutes from './routes/screen-time';
import gamesRoutes from './routes/games';
import productsRoutes from './routes/products';
import ordersRoutes from './routes/orders';

const app: Express = express();

// Security middleware
app.use(helmet({
    contentSecurityPolicy: false, // Disable for Swagger UI
}));

// CORS configuration
// Allow a comma-separated list in FRONTEND_URL, plus common dev ports as fallback.
const allowedOrigins: (string | RegExp)[] = process.env.FRONTEND_URL
    ? process.env.FRONTEND_URL.split(',').map(o => o.trim())
    : ['http://localhost:5173', 'http://localhost:8080', 'http://localhost:8081'];

// Always include the standard dev ports so a mismatched .env never blocks requests.
const devFallbacks = ['http://localhost:5173', 'http://localhost:8080', 'http://localhost:8081'];
for (const fb of devFallbacks) {
    if (!allowedOrigins.includes(fb)) allowedOrigins.push(fb);
}

app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (curl, Postman, server-to-server)
        if (!origin) return callback(null, true);
        if (allowedOrigins.some(o => (o instanceof RegExp ? o.test(origin) : o === origin))) {
            return callback(null, true);
        }
        callback(new Error(`CORS: origin ${origin} not allowed`));
    },
    credentials: true,
}));

// Body parser middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Swagger documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    explorer: true,
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'BrightSpark Kids API',
}));

// Swagger JSON endpoint
app.get('/api-docs.json', (req: Request, res: Response) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
});

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        version: '1.0.0',
    });
});

// API routes
app.use('/api/payment', paymentRoutes);
app.use('/api/email', emailRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/videos', videosRoutes);
app.use('/api/profiles', profilesRoutes);
app.use('/api/playlists', playlistsRoutes);
app.use('/api/favorites', favoritesRoutes);
app.use('/api/screen-time', screenTimeRoutes);
app.use('/api/games', gamesRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/orders', ordersRoutes);

// 404 handler
app.use((req: Request, res: Response) => {
    res.status(404).json({
        success: false,
        error: 'Route not found',
        path: req.path,
    });
});

// Error handler
app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
    console.error('Unhandled error:', err);
    res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
});

export default app;
