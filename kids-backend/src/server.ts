import dotenv from 'dotenv';
import app from './app';

// Load environment variables
dotenv.config();

const PORT = process.env.PORT || 3000;

// Start server
app.listen(PORT, () => {
    console.log('');
    console.log('='.repeat(60));
    console.log('🚀 BrightSpark Kids Backend Server');
    console.log('='.repeat(60));
    console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🌐 Server running on: http://localhost:${PORT}`);
    console.log(`💚 Health check: http://localhost:${PORT}/health`);
    console.log(`📚 Swagger docs: http://localhost:${PORT}/api-docs`);
    console.log('='.repeat(60));
    console.log('');
    console.log('📌 API Endpoints:');
    console.log('');
    console.log('   Videos:       GET|POST          /api/videos');
    console.log('   Profiles:     GET|PUT           /api/profiles/me');
    console.log('   Playlists:    GET|POST|PUT|DEL  /api/playlists');
    console.log('   Favorites:    GET|POST|DELETE   /api/favorites');
    console.log('   Screen Time:  GET|POST|PUT      /api/screen-time');
    console.log('   Games:        GET|POST          /api/games');
    console.log('   Products:     GET|POST|PUT|DEL  /api/products');
    console.log('   Orders:       GET|POST|PUT      /api/orders');
    console.log('   Payment:      POST              /api/payment/webhook');
    console.log('   Email:        POST              /api/email/send');
    console.log('   Analytics:    GET               /api/analytics');
    console.log('   Admin:        POST|GET          /api/admin');
    console.log('');
    console.log('='.repeat(60));
    console.log('');
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: closing HTTP server');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('SIGINT signal received: closing HTTP server');
    process.exit(0);
});
