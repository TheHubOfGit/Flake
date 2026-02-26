// GET /api/rooms/:code/results — Get privacy-filtered results
export async function onRequestGet(context) {
    const { env, params } = context;
    const code = params.code?.toUpperCase();
    const url = new URL(context.request.url);
    const token = url.searchParams.get('token');

    if (!token) {
        return json({ error: 'token is required' }, 400);
    }

    const raw = await env.FLAKE_ROOMS.get(`room:${code}`);
    if (!raw) {
        return json({ error: 'Room not found' }, 404);
    }

    const room = JSON.parse(raw);

    // Find participant by token
    const me = room.participants.find((p) => p.token === token);
    if (!me) {
        return json({ error: 'Invalid token' }, 403);
    }

    const votedCount = Object.keys(room.votes).length;
    const totalExpected = room.groupSize;
    const everyoneJoined = room.participants.length === totalExpected;
    const allVoted = votedCount === totalExpected && everyoneJoined;

    // If not everyone has voted yet
    if (!allVoted) {
        return json({
            status: 'waiting',
            votedCount,
            totalExpected,
            participantCount: room.participants.length,
            myVote: room.votes[me.id] || null,
        });
    }

    // Everyone has voted — apply privacy logic
    const myVote = room.votes[me.id];
    const allVotes = Object.entries(room.votes);
    const outVoters = allVotes.filter(([, v]) => v === 'out');
    const outCount = outVoters.length;
    const totalVoters = allVotes.length;

    // Case 1: I voted "in" — I never see who voted out
    if (myVote === 'in') {
        if (outCount === totalVoters) {
            // Edge case: shouldn't happen since I voted in, but just in case
            return json({
                status: 'complete',
                outcome: 'on',
                message: 'Plans are on!',
                myVote: 'in',
            });
        }

        return json({
            status: 'complete',
            outcome: 'on',
            message: 'Plans are on!',
            myVote: 'in',
        });
    }

    // Case 2: I voted "out"
    if (myVote === 'out') {
        // Sub-case: everyone voted out
        if (outCount === totalVoters) {
            return json({
                status: 'complete',
                outcome: 'cancelled',
                message: 'Everyone wanted to flake! Plans cancelled.',
                myVote: 'out',
                flakers: outVoters.map(([id]) => {
                    const p = room.participants.find((x) => x.id === id);
                    return { id, name: p?.name || 'Unknown' };
                }),
            });
        }

        // Sub-case: I'm the only one who voted out
        if (outCount === 1) {
            return json({
                status: 'complete',
                outcome: 'safe',
                message: "You wanted to flake, but plans are still on. Your secret is safe.",
                myVote: 'out',
            });
        }

        // Sub-case: some others also voted out (but not everyone)
        return json({
            status: 'complete',
            outcome: 'partial',
            message: `${outCount} out of ${totalVoters} want to cancel.`,
            myVote: 'out',
            flakers: outVoters.map(([id]) => {
                const p = room.participants.find((x) => x.id === id);
                return { id, name: p?.name || 'Unknown' };
            }),
        });
    }

    // Fallback (shouldn't reach here)
    return json({ status: 'error', message: 'Unexpected state' }, 500);
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
