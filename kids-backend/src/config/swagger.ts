import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'BrightSpark Kids API',
            version: '1.0.0',
            description: 'Backend API for BrightSpark Kids educational platform',
            contact: {
                name: 'BrightSpark Kids Team',
            },
        },
        servers: [
            {
                url: 'http://localhost:3000',
                description: 'Development server',
            },
            {
                url: process.env.API_URL || 'https://api.brightspark-kids.com',
                description: 'Production server',
            },
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                    description: 'Enter your Supabase JWT token',
                },
            },
            schemas: {
                Error: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean', example: false },
                        error: { type: 'string' },
                        details: { type: 'object' },
                    },
                },
                Success: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean', example: true },
                        message: { type: 'string' },
                        data: { type: 'object' },
                    },
                },
                Pagination: {
                    type: 'object',
                    properties: {
                        page: { type: 'integer', example: 1 },
                        limit: { type: 'integer', example: 20 },
                        total: { type: 'integer', example: 100 },
                        totalPages: { type: 'integer', example: 5 },
                    },
                },
                Video: {
                    type: 'object',
                    properties: {
                        id: { type: 'string', format: 'uuid' },
                        title: { type: 'string', example: 'Learning ABC' },
                        youtube_video_id: { type: 'string', example: 'dQw4w9WgXcQ' },
                        youtube_url: { type: 'string', format: 'uri' },
                        thumbnail_emoji: { type: 'string', example: '📺' },
                        category: { type: 'string', example: 'education' },
                        age_group: { type: 'string', example: '3-5' },
                        duration: { type: 'string', example: '5:30' },
                        language: { type: 'string', example: 'en' },
                        created_at: { type: 'string', format: 'date-time' },
                    },
                },
                Profile: {
                    type: 'object',
                    properties: {
                        id: { type: 'string', format: 'uuid' },
                        user_id: { type: 'string', format: 'uuid' },
                        display_name: { type: 'string', example: 'John Doe' },
                        avatar_url: { type: 'string', format: 'uri' },
                        screen_time_limit: { type: 'integer', example: 60 },
                        total_watch_time: { type: 'integer', example: 120 },
                        points: { type: 'integer', example: 500 },
                        badges: { type: 'array', items: { type: 'string' } },
                        created_at: { type: 'string', format: 'date-time' },
                        updated_at: { type: 'string', format: 'date-time' },
                    },
                },
                Playlist: {
                    type: 'object',
                    properties: {
                        id: { type: 'string', format: 'uuid' },
                        user_id: { type: 'string', format: 'uuid' },
                        child_id: { type: 'string', format: 'uuid' },
                        name: { type: 'string', example: 'My Favorites' },
                        is_locked: { type: 'boolean', example: false },
                        created_at: { type: 'string', format: 'date-time' },
                    },
                },
                Favorite: {
                    type: 'object',
                    properties: {
                        id: { type: 'string', format: 'uuid' },
                        user_id: { type: 'string', format: 'uuid' },
                        child_id: { type: 'string', format: 'uuid' },
                        video_id: { type: 'string', format: 'uuid' },
                        created_at: { type: 'string', format: 'date-time' },
                    },
                },
                ScreenTimeLog: {
                    type: 'object',
                    properties: {
                        id: { type: 'string', format: 'uuid' },
                        user_id: { type: 'string', format: 'uuid' },
                        child_id: { type: 'string', format: 'uuid' },
                        activity_type: { type: 'string', enum: ['video', 'game', 'music', 'reading', 'other'] },
                        started_at: { type: 'string', format: 'date-time' },
                        ended_at: { type: 'string', format: 'date-time' },
                        duration_seconds: { type: 'integer', example: 300 },
                    },
                },
                GameActivity: {
                    type: 'object',
                    properties: {
                        id: { type: 'string', format: 'uuid' },
                        user_id: { type: 'string', format: 'uuid' },
                        child_id: { type: 'string', format: 'uuid' },
                        game_type: { type: 'string', example: 'puzzle' },
                        level: { type: 'string', example: 'easy' },
                        score: { type: 'integer', example: 100 },
                        time_spent: { type: 'integer', example: 300 },
                        played_at: { type: 'string', format: 'date-time' },
                    },
                },
                Product: {
                    type: 'object',
                    properties: {
                        id: { type: 'string', format: 'uuid' },
                        name: { type: 'string', example: 'Educational Toy Set' },
                        description: { type: 'string' },
                        price: { type: 'number', example: 29.99 },
                        image_url: { type: 'string', format: 'uri' },
                        category: { type: 'string', example: 'toys' },
                        age_group: { type: 'string', example: '3-5' },
                        in_stock: { type: 'boolean', example: true },
                        created_at: { type: 'string', format: 'date-time' },
                    },
                },
                Order: {
                    type: 'object',
                    properties: {
                        id: { type: 'string', format: 'uuid' },
                        user_id: { type: 'string', format: 'uuid' },
                        total_amount: { type: 'number', example: 59.98 },
                        payment_status: { type: 'string', enum: ['pending', 'completed', 'failed', 'cancelled'] },
                        vnp_txn_ref: { type: 'string' },
                        created_at: { type: 'string', format: 'date-time' },
                    },
                },
                OrderItem: {
                    type: 'object',
                    properties: {
                        id: { type: 'string', format: 'uuid' },
                        order_id: { type: 'string', format: 'uuid' },
                        product_id: { type: 'string', format: 'uuid' },
                        quantity: { type: 'integer', example: 2 },
                        price_at_purchase: { type: 'number', example: 29.99 },
                    },
                },
            },
        },
        security: [{ bearerAuth: [] }],
        tags: [
            { name: 'Videos', description: 'Video content management' },
            { name: 'Profiles', description: 'User profile management' },
            { name: 'Playlists', description: 'Playlist management' },
            { name: 'Favorites', description: 'Favorites management' },
            { name: 'Screen Time', description: 'Screen time tracking' },
            { name: 'Games', description: 'Game activities' },
            { name: 'Products', description: 'Shop products' },
            { name: 'Orders', description: 'Order management' },
            { name: 'Payment', description: 'Payment processing' },
            { name: 'Email', description: 'Email notifications' },
            { name: 'Analytics', description: 'Analytics and reports' },
            { name: 'Admin', description: 'Admin operations' },
        ],
    },
    apis: ['./src/routes/*.ts', './dist/routes/*.js'],
};

export const swaggerSpec = swaggerJsdoc(options);
