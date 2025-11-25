export async function createUser(name: string) {
    const response = await fetch('http://localhost:5001/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
    });
    return response.json();
}

export async function createClique(name: string) {
    const response = await fetch('http://localhost:5001/api/cliques', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
    });
    return response.json();
}

export async function sendMessage(senderId: string, cliqueId: string, text: string) {
    const response = await fetch('http://localhost:5001/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ senderId, cliqueId, text }),
    });
    return response.json();
}
