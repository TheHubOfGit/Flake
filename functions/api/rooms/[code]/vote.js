// POST /api/rooms/:code/vote — Cast a vote
export async function onRequestPost(context) {
    const { env, params } = context;
    const code = params.code?.toUpperCase();

    try {
        const body = await context.request.json();
        const { token, vote } = body;

        if (!token || !vote) {
            return json({ error: 'token and vote are required' }, 400);
        }

        if (vote !== 'in' && vote !== 'out') {
            return json({ error: 'vote must be "in" or "out"' }, 400);
        }

        const raw = await env.FLAKE_ROOMS.get(`room:${code}`);
        if (!raw) {
            return json({ error: 'Room not found' }, 404);
        }

        const room = JSON.parse(raw);

        // Find participant by token
        const participant = room.participants.find((p) => p.token === token);
        if (!participant) {
            return json({ error: 'Invalid token. You may not be in this room.' }, 403);
        }

        // Check if already voted
        if (room.votes[participant.id]) {
            return json({ error: 'You have already voted' }, 409);
        }

        // Record vote
        room.votes[participant.id] = vote;

        await env.FLAKE_ROOMS.put(`room:${code}`, JSON.stringify(room), {
            expirationTtl: 86400,
        });

        const votedCount = Object.keys(room.votes).length;
        const allVoted = votedCount === room.groupSize &&
            room.participants.length === room.groupSize;

        return json({
            success: true,
            votedCount,
            allVoted,
        });
    } catch (err) {
        return json({ error: 'Failed to cast vote' }, 500);
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
