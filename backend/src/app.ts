import express, { type Request, type Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import swaggerUi from 'swagger-ui-express';
import swaggerJsdoc from 'swagger-jsdoc';
import routes from './routes';
import path from 'path';
import { errorHandler } from './middleware/errorHandler';
import { env } from './config/env';

const app = express();

app.use(helmet());
// Build CORS allowlist from FRONTEND_BASE_URL and optional CORS_ALLOWED_ORIGINS (CSV)
const corsAllowList = [
  env.FRONTEND_BASE_URL,
  ...(env.CORS_ALLOWED_ORIGINS ? env.CORS_ALLOWED_ORIGINS.split(',').map((s) => s.trim()).filter(Boolean) : [])
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow server-to-server or tools without Origin header, especially in development
      if (!origin) return callback(null, true);
      if (corsAllowList.includes(origin)) return callback(null, true);
      return callback(new Error(`CORS: Origin ${origin} not allowed`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  })
);
// Handle preflight quickly
app.options('*', cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(morgan(env.NODE_ENV === 'development' ? 'dev' : 'combined'));

app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100
  })
);

const swaggerSpec = swaggerJsdoc({
  definition: {
    openapi: '3.0.1',
    info: {
      title: 'CapManage API',
      version: '0.1.0'
    },
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      }
    },
    security: [{ bearerAuth: [] }]
  },
  apis: ['src/routes/**/*.ts']
});

app.get('/healthz', (_req: Request, res: Response) => {
  res.json({ success: true, data: { status: 'ok', timestamp: new Date().toISOString() } });
});

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use('/api/v1', routes);

// Private storage: do not expose storage directory directly; downloads go through guarded routes.
// However, serve a minimal health check for storage presence (optional):
app.get('/storage/health', (_req: Request, res: Response) => {
  res.json({ success: true, data: { path: path.resolve(process.cwd(), 'storage') } });
});

app.use(errorHandler);

export default app;
