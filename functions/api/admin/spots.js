export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  if (url.searchParams.get('secret') !== env.ADMIN_SECRET) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { results } = await env.DB.prepare(
    "SELECT id, name, lat, lng, type, price, sport, description, addr, has_photo, status, created_at FROM spots ORDER BY created_at DESC"
  ).all();
  return Response.json(results || []);
}
