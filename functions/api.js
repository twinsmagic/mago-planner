export async function onRequest(context) {
  const { request, env } = context;

  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: cors });
  }

  try {
    const url = new URL(request.url);

    if (request.method === 'GET') {
      const action = url.searchParams.get('action');
      if (action === 'getIdeas') return ok(await env.PLANNER_KV.get('ideas', { type: 'json' }) ?? [], cors);
      if (action === 'getWebinars') return ok(await env.PLANNER_KV.get('webinars', { type: 'json' }) ?? [], cors);
      if (action === 'getTags') return ok(await env.PLANNER_KV.get('tags', { type: 'json' }) ?? [], cors);
    }

    if (request.method === 'POST') {
      const text = await request.text();
      const params = new URLSearchParams(text);
      const action = params.get('action');
      const dataStr = params.get('data');
      const prompt = params.get('prompt');

      if (action === 'saveIdeas') {
        await env.PLANNER_KV.put('ideas', dataStr);
        return ok({ success: true }, cors);
      }
      if (action === 'saveWebinars') {
        await env.PLANNER_KV.put('webinars', dataStr);
        return ok({ success: true }, cors);
      }
      if (action === 'saveTags') {
        await env.PLANNER_KV.put('tags', dataStr);
        return ok({ success: true }, cors);
      }
      if (action === 'seedData') {
        const payload = JSON.parse(dataStr);
        const puts = [];
        if (payload.ideas !== undefined) puts.push(env.PLANNER_KV.put('ideas', JSON.stringify(payload.ideas)));
        if (payload.webinars !== undefined) puts.push(env.PLANNER_KV.put('webinars', JSON.stringify(payload.webinars)));
        if (payload.tags !== undefined) puts.push(env.PLANNER_KV.put('tags', JSON.stringify(payload.tags)));
        await Promise.all(puts);
        return ok({
          success: true,
          imported: {
            ideas: payload.ideas?.length ?? 0,
            webinars: payload.webinars?.length ?? 0,
            tags: payload.tags?.length ?? 0,
          },
        }, cors);
      }
      if (action === 'callClaude') {
        if (!env.ANTHROPIC_API_KEY) {
          return ok({ error: 'ANTHROPIC_API_KEY not configured on this server' }, cors);
        }
        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': env.ANTHROPIC_API_KEY,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model: 'claude-sonnet-4-6',
            max_tokens: 2048,
            messages: [{ role: 'user', content: prompt }],
          }),
        });
        return ok(await response.json(), cors);
      }
    }

    return ok({ error: 'Unknown action' }, cors, 400);
  } catch (err) {
    return ok({ error: err.message }, cors, 500);
  }
}

function ok(data, cors, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...cors },
  });
}
