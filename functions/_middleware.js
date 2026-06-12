// Auth gate for the whole app. Runs on every request (including static
// assets) because root-level Pages middleware executes before asset serving.
//
// Two ways to authenticate:
//   1. `Authorization: Bearer <ADMIN_TOKEN>` header (API clients, scripts)
//   2. `admin_token` HttpOnly cookie (browser sessions, set by /login)

export async function onRequest(context) {
  const { request, env, next } = context;
  const url = new URL(request.url);

  // Fail fast if the secret was never configured
  if (!env.ADMIN_TOKEN) {
    return new Response('ADMIN_TOKEN secret is not configured', { status: 500 });
  }

  // CORS preflights carry no credentials; let the API handler answer them
  if (request.method === 'OPTIONS') {
    return next();
  }

  // PWA assets needed before login (manifest, icons, service worker)
  if (PUBLIC_PATHS.has(url.pathname)) {
    return next();
  }

  if (url.pathname === '/login') {
    if (request.method === 'POST') return handleLoginPost(request, env);
    return Response.redirect(new URL('/', url).toString(), 302);
  }

  if (await isAuthenticated(request, env)) {
    return next();
  }

  // API requests get a JSON 401, page navigation gets the login form
  if (url.pathname.startsWith('/api')) {
    return unauthorizedApiResponse();
  }
  return loginPageResponse();
}

const PUBLIC_PATHS = new Set(['/manifest.json', '/icon.svg', '/sw.js', '/favicon.ico']);

async function isAuthenticated(request, env) {
  // 1. Check Authorization header
  const authHeader = request.headers.get('Authorization') ?? '';
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7) === env.ADMIN_TOKEN;
  }

  // 2. Fall back to HttpOnly cookie (for browser sessions)
  const cookie = request.headers.get('Cookie') ?? '';
  const match = cookie.match(/admin_token=([^;]+)/);
  return match ? match[1] === env.ADMIN_TOKEN : false;
}

function unauthorizedApiResponse() {
  return new Response(JSON.stringify({ error: 'Unauthorized' }), {
    status: 401,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function handleLoginPost(request, env) {
  const formData = await request.formData();
  const password = formData.get('password');

  if (password === env.ADMIN_TOKEN) {
    return new Response(null, {
      status: 302,
      headers: {
        Location: '/',
        'Set-Cookie': `admin_token=${env.ADMIN_TOKEN}; HttpOnly; Secure; Path=/; SameSite=Strict`,
      },
    });
  }
  return loginPageResponse({ error: true, status: 401 });
}

function loginPageResponse({ error = false, status = 200 } = {}) {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Mago Planner — Sign In</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #f9fafb;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
    }
    .card {
      background: #fff;
      border-radius: 12px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.07);
      padding: 2.5rem;
      width: 100%;
      max-width: 24rem;
      text-align: center;
    }
    h1 { font-size: 1.25rem; color: #111827; margin: 0 0 0.25rem; }
    p { color: #6b7280; font-size: 0.875rem; margin: 0 0 1.5rem; }
    input {
      width: 100%;
      box-sizing: border-box;
      padding: 0.625rem 0.75rem;
      border: 1px solid #d1d5db;
      border-radius: 8px;
      font-size: 1rem;
      margin-bottom: 1rem;
    }
    input:focus { outline: 2px solid #7c3aed; border-color: transparent; }
    button {
      width: 100%;
      padding: 0.625rem;
      background: #7c3aed;
      color: #fff;
      border: none;
      border-radius: 8px;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
    }
    button:hover { background: #6d28d9; }
    .error { color: #dc2626; font-size: 0.875rem; margin: 0 0 1rem; }
  </style>
</head>
<body>
  <div class="card">
    <div style="font-size:2.5rem">🎩</div>
    <h1>Mago Content Planner</h1>
    <p>Enter the admin token to continue</p>
    ${error ? '<p class="error">Invalid password</p>' : ''}
    <form method="POST" action="/login">
      <input type="password" name="password" placeholder="Admin token" autofocus required>
      <button type="submit">Sign In</button>
    </form>
  </div>
</body>
</html>`;
  return new Response(html, {
    status,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}
