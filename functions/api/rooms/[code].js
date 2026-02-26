// GET /api/rooms/:code — Get room info
// POST /api/rooms/:code — (unused, returns 405)
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

    // Find the requesting participant
    const me = token
        ? room.participants.find((p) => p.token === token)
        : null;

    const votedCount = Object.keys(room.votes).length;
    const allVoted = votedCount === room.groupSize &&
        room.participants.length === room.groupSize;

    return json({
        name: room.name,
        code: room.code,
        groupSize: room.groupSize,
        participantCount: room.participants.length,
        participants: room.participants.map((p) => ({
            id: p.id,
            name: p.name,
            hasVoted: !!room.votes[p.id],
        })),
        votedCount,
        allVoted,
        myId: me?.id || null,
        myVote: me ? room.votes[me.id] || null : null,
        createdAt: room.createdAt,
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
