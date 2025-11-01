import request from 'supertest';
import app from '../app';

describe('Performance smoke (non-failing baseline)', () => {
  it('handles 15 parallel health checks within a generous budget', async () => {
    const start = Date.now();
    const N = 15;
    const results = await Promise.all(
      Array.from({ length: N }, () => request(app).get('/healthz').expect(200))
    );
    const duration = Date.now() - start;
    // Log numbers for visibility but keep assertion generous to avoid flakes in CI
    // eslint-disable-next-line no-console
    console.log(`Perf smoke: ${N} healthz in ${duration}ms`);
    expect(results.every((r) => r.body?.success === true)).toBe(true);
    expect(duration).toBeLessThan(3000); // 3s budget for local/CI
  });
});
