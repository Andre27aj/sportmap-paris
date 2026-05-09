export async function onRequestPost({ request, env }) {
  const { id, action, secret } = await request.json();
  if (secret !== env.ADMIN_SECRET) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!id || !['approve', 'reject'].includes(action)) {
    return Response.json({ error: 'Invalid params' }, { status: 400 });
  }
  if (action === 'approve') {
    await env.DB.prepare("UPDATE spots SET status = 'approved' WHERE id = ?").bind(id).run();
  } else {
    await env.DB.prepare("DELETE FROM spots WHERE id = ?").bind(id).run();
  }
  return Response.json({ success: true });
}

export async function onRequestOptions() {
  return new Response(null, { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' } });
}
