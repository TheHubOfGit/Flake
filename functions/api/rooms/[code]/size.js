// POST /api/rooms/:code/size — Update the group size
// Anyone can update this (no auth required)
export async function onRequestPost(context) {
    const { env, params } = context;
    const code = params.code?.toUpperCase();

    try {
        const body = await context.request.json();
        const { groupSize } = body;

        if (!groupSize || groupSize < 2 || groupSize > 50) {
            return json({ error: 'groupSize must be between 2 and 50' }, 400);
        }

        const raw = await env.FLAKE_ROOMS.get(`room:${code}`);
        if (!raw) {
            return json({ error: 'Room not found' }, 404);
        }

        const room = JSON.parse(raw);
        room.groupSize = parseInt(groupSize, 10);

        await env.FLAKE_ROOMS.put(`room:${code}`, JSON.stringify(room), {
            expirationTtl: 86400,
        });

        return json({
            groupSize: room.groupSize,
            flakeCount: room.flakers.length,
            allFlaked: room.flakers.length >= room.groupSize,
        });
    } catch (err) {
        return json({ error: 'Failed to update group size' }, 500);
    }
}

// Handle OPTIONS for CORS preflight
export async function onRequestOptions() {
    return new Response(null, {
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
        },
    });
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
