// POST /api/rooms — Create a new room
export async function onRequestPost(context) {
  const { env } = context;

  try {
    const body = await context.request.json();
    const { name, groupSize, creatorName } = body;

    if (!name || !groupSize || !creatorName) {
      return json({ error: 'name, groupSize, and creatorName are required' }, 400);
    }

    if (groupSize < 2 || groupSize > 20) {
      return json({ error: 'groupSize must be between 2 and 20' }, 400);
    }

    const code = generateCode();
    const creatorId = crypto.randomUUID();
    const creatorToken = crypto.randomUUID();

    const room = {
      id: crypto.randomUUID(),
      name: name.trim(),
      code,
      groupSize: parseInt(groupSize, 10),
      createdAt: new Date().toISOString(),
      participants: [
        {
          id: creatorId,
          name: creatorName.trim(),
          token: creatorToken,
          joinedAt: new Date().toISOString(),
        },
      ],
      votes: {},
    };

    await env.FLAKE_ROOMS.put(`room:${code}`, JSON.stringify(room), {
      // Auto-expire rooms after 24 hours
      expirationTtl: 86400,
    });

    return json({
      code: room.code,
      roomName: room.name,
      creatorToken,
      participantId: creatorId,
    });
  } catch (err) {
    return json({ error: 'Failed to create room' }, 500);
  }
}

function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no I/O/0/1 to avoid confusion
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
