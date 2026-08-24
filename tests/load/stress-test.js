import http from 'k6/http';
import { check, sleep } from 'k6';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.1/index.js';

export const options = {
  stages: [
    { duration: '30s', target: 20 },   // Ramp-up ke 20 VU
    { duration: '1m', target: 50 },    // Naik ke 50 VU
    { duration: '1m', target: 100 },   // Puncak: 100 VU
    { duration: '30s', target: 0 },    // Ramp-down
  ],
  thresholds: {
    http_req_duration: ['p(95)<10000'],  // Toleransi lebih tinggi untuk stress test
  },
};

const TARGET_URL = __ENV.TARGET_URL || 'https://situsbisnis.com';

const SITE_IDS = [
  'cmptx3nj9002m6e17np8bytlk',
  'cmpxsdg6h000fqos1nnykn6pa',
  'cmp70obn9000111054wyur2q2',
  'cmptrqwvs000b6e171fuwujah',
  'cmpudrl240009p78b9a84694n',
  'cmpxzxila000zqos1i9z19bee',
  'cmp3twfmn0002y7pd4fu6c51o',
  'cmpff0ccz0002u5f0rp7dk8aq',
  'cmpajs4rs0001ncnzgna0wpo2',
];

export default function () {
  const siteId = SITE_IDS[Math.floor(Math.random() * SITE_IDS.length)];
  const headers = { 'Content-Type': 'application/json', 'x-site-id': siteId };

  // Acak pola penggunaan
  const scenario = Math.random();

  if (scenario < 0.4) {
    // ── SCENARIO A: Health check + ringan ──
    const res = http.get(`${TARGET_URL}/api/health`);
    check(res, { 'health 200': (r) => r.status === 200 });
    sleep(0.2);

    const res2 = http.get(`${TARGET_URL}/api/posts`, { headers });
    check(res2, { 'posts ok': (r) => [200, 429].includes(r.status) });

  } else if (scenario < 0.7) {
    // ── SCENARIO B: Product browsing ──
    const res = http.get(`${TARGET_URL}/api/products`, { headers });
    check(res, { 'products ok': (r) => [200, 429].includes(r.status) });
    sleep(0.3);

    const res2 = http.get(`${TARGET_URL}/api/gallery`, { headers });
    check(res2, { 'gallery ok': (r) => [200, 429].includes(r.status) });

  } else if (scenario < 0.85) {
    // ── SCENARIO C: Heavy page (admin-like) ──
    const res = http.get(`${TARGET_URL}/api/analytics`, { headers });
    check(res, { 'analytics ok': (r) => [200, 429].includes(r.status) });
    sleep(0.2);

    const res2 = http.get(`${TARGET_URL}/api/testimonials`, { headers });
    check(res2, { 'testimonials ok': (r) => [200, 429].includes(r.status) });

  } else {
    // ── SCENARIO D: Contact form submission ──
    const payload = JSON.stringify({
      name: `Stress User ${Math.floor(Math.random() * 100000)}`,
      email: `stress_${Math.floor(Math.random() * 100000)}@test.com`,
      message: 'Stress test concurrency request',
    });

    const res = http.post(`${TARGET_URL}/api/contact`, payload, { headers });
    check(res, { 'contact ok': (r) => [200, 400, 429].includes(r.status) });
  }

  sleep(0.1);  // Jeda minimum untuk maximum throughput
}

export function handleSummary(data) {
  return {
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
  };
}
