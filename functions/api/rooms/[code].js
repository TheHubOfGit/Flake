// GET /api/rooms/:code — Get room info
// Privacy: flaker names are only visible if the requester is also a flaker
export async function onRequestGet(context) {
    const { env, params } = context;
    const code = params.code?.toUpperCase();
    const url = new URL(context.request.url);
    const token = url.searchParams.get('token');

    if (!code) {
        return json({ error: 'Room code is required' }, 400);
    }

    const raw = await env.FLAKE_ROOMS.get(`room:${code}`);
    if (!raw) {
        return json({ error: 'Room not found' }, 404);
    }

    const room = JSON.parse(raw);
    const flakers = room.flakers || [];

    // Check if requester is a flaker
    const me = token ? flakers.find((f) => f.token === token) : null;
    const isFlaker = !!me;

    const response = {
        name: room.name,
        code: room.code,
        groupSize: room.groupSize,
        flakeCount: (isFlaker || flakers.length >= room.groupSize) ? flakers.length : 0,
        allFlaked: flakers.length >= room.groupSize,
        isFlaker,
        myName: me?.name || null,
        createdAt: room.createdAt,
    };

    // Only reveal flaker names to other flakers
    if (isFlaker) {
        response.flakers = flakers.map((f) => ({
            name: f.name,
            votedAt: f.votedAt,
        }));
    }

    return json(response);
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
