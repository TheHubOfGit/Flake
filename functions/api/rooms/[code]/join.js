// POST /api/rooms/:code/join — Join a room
export async function onRequestPost(context) {
    const { env, params } = context;
    const code = params.code?.toUpperCase();

    try {
        const body = await context.request.json();
        const { name } = body;

        if (!name) {
            return json({ error: 'name is required' }, 400);
        }

        const raw = await env.FLAKE_ROOMS.get(`room:${code}`);
        if (!raw) {
            return json({ error: 'Room not found' }, 404);
        }

        const room = JSON.parse(raw);

        if (room.participants.length >= room.groupSize) {
            return json({ error: 'Room is full' }, 409);
        }

        // Check for duplicate names
        const trimmedName = name.trim();
        if (room.participants.some((p) => p.name.toLowerCase() === trimmedName.toLowerCase())) {
            return json({ error: 'Someone with that name is already in the room. Use a different name.' }, 409);
        }

        const participantId = crypto.randomUUID();
        const token = crypto.randomUUID();

        room.participants.push({
            id: participantId,
            name: trimmedName,
            token,
            joinedAt: new Date().toISOString(),
        });

        await env.FLAKE_ROOMS.put(`room:${code}`, JSON.stringify(room), {
            expirationTtl: 86400,
        });

        return json({
            token,
            participantId,
            roomName: room.name,
            code: room.code,
        });
    } catch (err) {
        return json({ error: 'Failed to join room' }, 500);
    }
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
