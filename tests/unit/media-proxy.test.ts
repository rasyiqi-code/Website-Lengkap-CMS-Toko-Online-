import { describe, it, expect, vi } from 'vitest';
import { proxyMediaApi } from '@/modules/media/controllers/media-api.controller';
import { NextRequest } from 'next/server';

vi.mock('@/lib/media/r2', () => ({
  getR2Settings: vi.fn().mockResolvedValue({ publicDomain: 'https://my-custom-domain.com' }),
}));

describe('media proxy SSRF validation', () => {
  const mockRequest = (urlParam: string) => {
    return new NextRequest(`http://localhost:3000/api/media/proxy?url=${encodeURIComponent(urlParam)}`);
  };

  it('should allow whitelisted domains', async () => {
    const req = mockRequest('https://images.unsplash.com/photo-123');
    const res = await proxyMediaApi(req);
    // It should try to fetch and either fail or succeed based on network, but definitely not 403 or 400
    expect(res.status).not.toBe(403);
    expect(res.status).not.toBe(400);
  });

  it('should allow publicDomain from settings', async () => {
    const req = mockRequest('https://my-custom-domain.com/some-image.jpg');
    const res = await proxyMediaApi(req);
    expect(res.status).not.toBe(403);
    expect(res.status).not.toBe(400);
  });

  it('should block SSRF attempts using domain suffix', async () => {
    const req = mockRequest('https://images.unsplash.com.evil.com/photo-123');
    const res = await proxyMediaApi(req);
    expect(res.status).toBe(403);
  });

  it('should block unrecognized domains', async () => {
    const req = mockRequest('https://evil.com/photo-123');
    const res = await proxyMediaApi(req);
    expect(res.status).toBe(403);
  });

  it('should reject invalid URLs', async () => {
    const req = mockRequest('not-a-valid-url');
    const res = await proxyMediaApi(req);
    expect(res.status).toBe(400);
  });

  it('should reject missing URL', async () => {
    const req = new NextRequest(`http://localhost:3000/api/media/proxy`);
    const res = await proxyMediaApi(req);
    expect(res.status).toBe(400);
  });
});
