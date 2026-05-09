export async function onRequestGet({ env }) {
  try {
    const { results } = await env.DB.prepare(
      "SELECT id, name, lat, lng, type, price, sport, description, addr, has_photo, created_at FROM spots WHERE status = 'approved' ORDER BY created_at DESC"
    ).all();
    return Response.json(results || [], {
      headers: { 'Access-Control-Allow-Origin': '*' }
    });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}

export async function onRequestPost({ request, env }) {
  try {
    const body = await request.json();
    const { name, lat, lng, type, price, sport, description, addr, photo } = body;

    if (!name || lat == null || lng == null) {
      return Response.json({ error: 'Champs requis manquants' }, { status: 400 });
    }

    if (photo && photo.length > 1100000) {
      return Response.json({ error: 'Photo trop lourde (max 800KB)' }, { status: 400 });
    }

    const result = await env.DB.prepare(
      "INSERT INTO spots (name, lat, lng, type, price, sport, description, addr, photo, has_photo, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')"
    ).bind(
      name, lat, lng,
      type || 'fun',
      price || 'free',
      sport || '',
      description || '',
      addr || '',
      photo || null,
      photo ? 1 : 0
    ).run();

    return Response.json({ success: true, id: result.meta.last_row_id }, {
      headers: { 'Access-Control-Allow-Origin': '*' }
    });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    }
  });
}
