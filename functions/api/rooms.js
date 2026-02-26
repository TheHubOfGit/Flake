// POST /api/rooms — Create a new room
export async function onRequestPost(context) {
  const { env } = context;

  try {
    const body = await context.request.json();
    const { name, groupSize } = body;

    if (!name || !groupSize) {
      return json({ error: 'name and groupSize are required' }, 400);
    }

    if (groupSize < 2 || groupSize > 50) {
      return json({ error: 'groupSize must be between 2 and 50' }, 400);
    }

    const code = generateCode();

    const room = {
      id: crypto.randomUUID(),
      name: name.trim(),
      code,
      groupSize: parseInt(groupSize, 10),
      createdAt: new Date().toISOString(),
      flakers: [],
    };

    await env.FLAKE_ROOMS.put(`room:${code}`, JSON.stringify(room), {
      expirationTtl: 86400,
    });

    return json({ code: room.code, roomName: room.name });
  } catch (err) {
    return json({ error: 'Failed to create room' }, 500);
  }
}

function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
