export async function onRequestGet({ params, env }) {
  try {
    const { results } = await env.DB.prepare(
      'SELECT photo FROM spots WHERE id = ?'
    ).bind(params.id).all();

    if (!results || !results[0] || !results[0].photo) {
      return new Response('Not found', { status: 404 });
    }

    const dataUrl = results[0].photo;
    const base64 = dataUrl.replace(/^data:image\/\w+;base64,/, '');
    const contentType = dataUrl.match(/^data:(image\/\w+);/)?.[1] || 'image/jpeg';
    const buffer = Uint8Array.from(atob(base64), c => c.charCodeAt(0));

    return new Response(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000',
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (e) {
    return new Response('Error', { status: 500 });
  }
}
