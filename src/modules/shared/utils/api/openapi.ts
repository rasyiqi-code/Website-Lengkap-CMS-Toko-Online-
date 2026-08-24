import { OpenAPIRegistry, OpenApiGeneratorV3, extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

extendZodWithOpenApi(z);

const registry = new OpenAPIRegistry();

// Common schemas
const ErrorSchema = z.object({
  error: z.string(),
  details: z.unknown().optional(),
});

const PaginationSchema = z.object({
  total: z.number(),
  page: z.number(),
  limit: z.number(),
  totalPages: z.number(),
});

// Auth schemas
const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const RegisterSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
});

const UserSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  email: z.string().email(),
  role: z.enum(['admin', 'owner', 'editor', 'user']),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

// Post schemas
const PostSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  slug: z.string(),
  body: z.string().optional(),
  published: z.boolean(),
  siteId: z.string().uuid(),
  authorId: z.string().uuid(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

const CreatePostSchema = z.object({
  title: z.string().min(1),
  slug: z.string().min(1),
  body: z.string().optional(),
  published: z.boolean().default(false),
});

// Product schemas
const ProductSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  slug: z.string(),
  description: z.string().optional(),
  price: z.number(),
  siteId: z.string().uuid(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

const CreateProductSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  description: z.string().optional(),
  price: z.number().min(0),
});

// Contact schemas
const ContactSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  message: z.string().min(1),
  phone: z.string().optional(),
});

// Health schema
const HealthSchema = z.object({
  status: z.enum(['healthy', 'degraded']),
  timestamp: z.string().datetime(),
  version: z.string(),
  checks: z.object({
    database: z.enum(['healthy', 'unhealthy']),
    storage: z.enum(['configured', 'not-configured']),
    memory: z.enum(['normal', 'high']).optional(),
  }),
  memory: z.object({
    rss: z.string(),
    heapUsed: z.string(),
    heapTotal: z.string(),
    external: z.string(),
    arrayBuffers: z.string(),
    heapUsagePercent: z.string(),
    heapLimitMB: z.string(),
  }).optional(),
});

// Register paths
registry.registerPath({
  method: 'get',
  path: '/api/health',
  summary: 'Health check',
  tags: ['System'],
  responses: {
    200: { description: 'System is healthy', content: { 'application/json': { schema: HealthSchema } } },
    503: { description: 'System degraded', content: { 'application/json': { schema: HealthSchema } } },
  },
});

registry.registerPath({
  method: 'post',
  path: '/api/auth/login',
  summary: 'User login',
  tags: ['Authentication'],
  request: { body: { content: { 'application/json': { schema: LoginSchema } } } },
  responses: {
    200: { description: 'Login successful', content: { 'application/json': { schema: UserSchema } } },
    401: { description: 'Invalid credentials', content: { 'application/json': { schema: ErrorSchema } } },
  },
});

registry.registerPath({
  method: 'post',
  path: '/api/auth/register',
  summary: 'User registration',
  tags: ['Authentication'],
  request: { body: { content: { 'application/json': { schema: RegisterSchema } } } },
  responses: {
    201: { description: 'Registration successful', content: { 'application/json': { schema: UserSchema } } },
    400: { description: 'Validation error', content: { 'application/json': { schema: ErrorSchema } } },
  },
});

registry.registerPath({
  method: 'get',
  path: '/api/posts',
  summary: 'List posts',
  tags: ['Posts'],
  parameters: [
    { name: 'page', in: 'query', schema: { type: 'integer' as const } },
    { name: 'limit', in: 'query', schema: { type: 'integer' as const } },
  ],
  responses: {
    200: {
      description: 'List of posts',
      content: {
        'application/json': {
          schema: z.object({
            data: z.array(PostSchema),
            pagination: PaginationSchema,
          }),
        },
      },
    },
    401: { description: 'Unauthorized', content: { 'application/json': { schema: ErrorSchema } } },
  },
});

registry.registerPath({
  method: 'post',
  path: '/api/posts',
  summary: 'Create post',
  tags: ['Posts'],
  request: { body: { content: { 'application/json': { schema: CreatePostSchema } } } },
  responses: {
    201: { description: 'Post created', content: { 'application/json': { schema: PostSchema } } },
    400: { description: 'Validation error', content: { 'application/json': { schema: ErrorSchema } } },
    403: { description: 'Forbidden', content: { 'application/json': { schema: ErrorSchema } } },
  },
});

registry.registerPath({
  method: 'get',
  path: '/api/products',
  summary: 'List products',
  tags: ['Products'],
  parameters: [
    { name: 'page', in: 'query', schema: { type: 'integer' as const } },
    { name: 'limit', in: 'query', schema: { type: 'integer' as const } },
  ],
  responses: {
    200: {
      description: 'List of products',
      content: {
        'application/json': {
          schema: z.object({
            data: z.array(ProductSchema),
            pagination: PaginationSchema,
          }),
        },
      },
    },
  },
});

registry.registerPath({
  method: 'post',
  path: '/api/products',
  summary: 'Create product',
  tags: ['Products'],
  request: { body: { content: { 'application/json': { schema: CreateProductSchema } } } },
  responses: {
    201: { description: 'Product created', content: { 'application/json': { schema: ProductSchema } } },
    400: { description: 'Validation error', content: { 'application/json': { schema: ErrorSchema } } },
  },
});

registry.registerPath({
  method: 'post',
  path: '/api/contact',
  summary: 'Submit contact form',
  tags: ['Contact'],
  request: { body: { content: { 'application/json': { schema: ContactSchema } } } },
  responses: {
    200: { description: 'Message sent' },
    400: { description: 'Validation error', content: { 'application/json': { schema: ErrorSchema } } },
  },
});

// Generate OpenAPI spec
const generator = new OpenApiGeneratorV3(registry.definitions);
export const openApiSpec = generator.generateDocument({
  openapi: '3.0.0',
  info: {
    title: 'SitusBisnis API',
    version: '1.0.0',
    description: 'Multi-tenant CMS API documentation',
    contact: { name: 'SitusBisnis Support', email: 'support@SitusBisnis.id' },
  },
  servers: [
    { url: 'http://localhost:3000', description: 'Local development' },
    { url: 'https://api.SitusBisnis.id', description: 'Production' },
  ],
  security: [{ cookieAuth: [] }, { bearerAuth: [] }],
});
