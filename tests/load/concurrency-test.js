import http from 'k6/http';
import { check, sleep } from 'k6';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.1/index.js';

export const options = {
  stages: [
    { duration: '10s', target: 5 },   // Ramp-up ke 5 VU
    { duration: '20s', target: 10 },  // Naik ke 10 VU
    { duration: '10s', target: 0 },   // Ramp-down
  ],
  thresholds: {
    http_req_duration: ['p(95)<5000'],
  },
};

const TARGET_URL = __ENV.TARGET_URL || 'http://localhost:3000';

const SITE_IDS = [
  'cmptx3nj9002m6e17np8bytlk',
  'cmpxsdg6h000fqos1nnykn6pa',
  'cmp70obn9000111054wyur2q2',
];

export default function () {
  const siteId = SITE_IDS[Math.floor(Math.random() * SITE_IDS.length)];
  const headers = { 'Content-Type': 'application/json', 'x-site-id': siteId };

  // 1. Health check
  const res1 = http.get(`${TARGET_URL}/api/health`);
  check(res1, { 'health 200': (r) => r.status === 200 });
  sleep(0.3);

  // 2. Posts
  const res2 = http.get(`${TARGET_URL}/api/posts`, { headers });
  check(res2, { 'posts 200/429': (r) => [200, 429].includes(r.status) });
  sleep(0.3);

  // 3. Products
  const res3 = http.get(`${TARGET_URL}/api/products`, { headers });
  check(res3, { 'products 200/429': (r) => [200, 429].includes(r.status) });
  sleep(0.3);

  // 4. Gallery
  const res4 = http.get(`${TARGET_URL}/api/gallery`, { headers });
  check(res4, { 'gallery 200/429': (r) => [200, 429].includes(r.status) });
  sleep(0.3);

  // 5. Testimonials
  const res5 = http.get(`${TARGET_URL}/api/testimonials`, { headers });
  check(res5, { 'testimonials 200/429': (r) => [200, 429].includes(r.status) });
}

export function handleSummary(data) {
  return {
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
  };
}
