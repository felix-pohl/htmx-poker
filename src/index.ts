import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import express, { Request, Response } from "express";
import crypto from 'node:crypto';
import { randomName } from './randomName';

interface Connection {
    id: string,
    client: Client,
    response: Response,
}

interface Client {
    id: string,
    name: string,
    value: number | null | string
}

interface Session {
    id: string,
    revealed: boolean,
    connections: Connection[],
    clients: Client[],
    name: string
}

interface Vote {
    clientId: string,
    revealed: boolean,
    value: number | null | string
}

const app = express()
const port = 3000

var path = require('path');

app.use(express.static(path.join(__dirname, './static')));
app.use(bodyParser.json());
app.use(cookieParser())
app.use(bodyParser.urlencoded({ extended: false }));

let connections: Connection[] = [];
let sessions: Session[] = [];

function cards(value: string | null, session: Session) {
    const fib = [1, 2, 3, 5, 8, 13, 21, '?', '☕']
    const options = fib.map(f => `
    <div>
        <input class="hidden peer" 
            ${value === f + '' ? 'onClick="document.getElementById(\'null\').click()"' : ""}
            name="value" type="radio" id="fib${f}" value="${f}" 
            ${value === f + '' ? 'checked' : ''}
        />
        <label for="fib${f}" class="
            block w-12 h-12 text-center
            rounded p-2 cursor-pointer border-2 text-xl 
            bg-indigo-600 text-slate-200 border-slate-400 
            peer-checked:bg-slate-200 peer-checked:text-indigo-600 peer-checked:border-indigo-400
        ">${f}</label>
    </div>
    `).join('')
    const resetOption = `<input class="hidden" name="value" type="radio" id="null" value="" ${value === '' ? 'checked' : ''} /><label class="hidden" for="null" >null</label>`
    return `
    <form hx-post="/session/${session.id}/select" hx-trigger="change from:input" hx-swap="outerHTML" class="space-x-2 flex gap-2 p-8 flex-wrap justify-center">
        ${options}
        ${resetOption}
    </form>
`}

function voteContent(session: Session) {
    if (session.revealed) {
        return session.clients.map(c => `<div>${c.name}: ` + ((c.value) || 'no vote') + '</div>').join('');
    }
    return session.clients.map(c => `<div>${c.name}: ` + ((c.value) ? '✔' : '❌') + '</div>').join('');
}

function renderVotes(session: Session) {
    const button = session.revealed ?
        `<div><button hx-get="/session/${session.id}/reset" class="rounded bg-indigo-600 p-2 text-slate-200">Zurücksetzen</button></div>` :
        `<div><button hx-get="/session/${session.id}/reveal" class="rounded bg-indigo-600 p-2 text-slate-200">Aufdecken</button></div>`;
    return button + '<div class="flex flex-wrap gap-2" style="max-width:600px;">' + voteContent(session) + '</div>'
}

app.get('/session/:uuid/cards', (req, res) => {
    const session = getSession(req);
    if (!session) {
        res.setHeader('HX-Redirect', '/sessionExpired.html');
        res.send()
        return;
    }
    res.send(cards(null, session))
})

function sessionJoined(session: Session) {
    return `
    <div hx-ext="sse" sse-connect="/session/${session.id}/events" class="flex flex-col align-center">
        <div class="flex justify-between">
            <div hx-get="/session/${session.id}/sessionstate" hx-swap="innerHtml" hx-trigger="sse:sessions" class="p-2"></div>
            <div hx-get="/session/${session.id}/clientinfo" hx-swap="innerHtml" hx-trigger="sse:sessions" class="p-2">hi</div>
        </div>
        <div hx-get="/session/${session.id}/votes" hx-swap="innerHtml" hx-trigger="sse:votes" class="flex p-4 flex-col items-center gap-4"></div>
        <div hx-get="/session/${session.id}/cards" hx-swap="innerHtml" hx-target="#cards" hx-trigger="sse:reset"></div>
        <div id="cards" class="mx-auto">
        ${cards(null, session)}
        </div>
    </div>
    `
}


const newSession = `
<form hx-post="/newSession" class="p-4 mx-auto flex flex-col ">
<input name="sessionname" placeholder="Session" class="border-2 rounded p-2 text-lg placeholder:text-center mb-2" required>
<button class="rounded bg-indigo-600 p-2 text-slate-200">
    Session erstellen
</button>
</form>
`

function chooseName(session: Session) {
    return `
    <form hx-post="/session/${session.id}/clientname" hx-swap="outerHTML" class="p-4 mx-auto flex flex-col ">
        <input name="name" placeholder="Name" class="border-2 rounded p-2 text-lg placeholder:text-center mb-2" required>
        <button class="rounded bg-indigo-600 p-2 text-slate-200" type="submit">
            Teilnehmen
        </button>
    </form>
    `
}


const head = `
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>HTMX Poker</title>
    <script src="/htmx.min.js"></script>
    <script src="https://unpkg.com/htmx.org/dist/ext/sse.js"></script>
    <script src="/tw.js"></script>
    <link rel="icon" type="image/png" sizes="64x64" href="/favicon.png">
</head>
`

const index = `
<!DOCTYPE html>
<html lang="de" class="bg-gradient-to-br from-cyan-500 to-blue-500 h-full">
${head}
<body>
    <div class="absolute top-2 left-2">
        <a href="/" class="text-3xl">
            🃏
        </a>
    </div>
    <div class="container p-4 mx-auto flex flex-col" align-center>
        <h1 class="text-3xl font-bold text-center">
            Let's Poker!
        </h1>
        ${newSession}
    </div>
</body>

</html>
`

function renderSession(session: Session) {
    return `
<!DOCTYPE html>
<html lang="de" class="bg-gradient-to-br from-cyan-500 to-blue-500 h-full">
${head}
<body>
    <div class="absolute top-2 left-2">
        <a href="/" class="text-3xl">
            🃏
        </a>
    </div>
    <div class="container p-4 mx-auto flex flex-col" align-center>
        <h1 class="text-3xl font-bold text-center">
            Let's Poker!
        </h1>
        ${chooseName(session)}
    </div>
</body>

</html>
`}

function renderSessionWithVotes(session: Session) {
    return `
<!DOCTYPE html>
<html lang="de" class="bg-gradient-to-br from-cyan-500 to-blue-500 h-full">
${head}
<body>
    <div class="absolute top-2 left-2">
        <a href="/" class="text-3xl">
            🃏
        </a>
    </div>
    <div class="container p-4 mx-auto flex flex-col" align-center>
        <h1 class="text-3xl font-bold text-center">
            Let's Poker!
        </h1>
        ${sessionJoined(session)}
    </div>
</body>

</html>
`}

function eventsHandler(req: Request, res: Response, next: any) {
    const session = getSession(req);
    if (!session) {
        res.setHeader('HX-Redirect', '/sessionExpired.html');
        res.send()
        return;
    }
    const headers = {
        'Content-Type': 'text/event-stream',
        'Connection': 'keep-alive',
        'Cache-Control': 'no-cache'
    };
    res.writeHead(200, headers);

    const connectionId = crypto.randomUUID();

    let client = session.clients.find(c => c.id === req.cookies.client)

    if (!client) {
        console.log('you shall not pass', req.cookies.client, session.clients.map(c => c.id))
        res.end('done')
        return;
    }
    console.log('CONNECTED // client', client.id, 'connection', connectionId, 'at session', session.id)
    const newConnection = {
        id: connectionId,
        client,
        response: res
    };
    connections.push(newConnection);

    sendSessionsToAll();
    sendVotesToAll();

    req.on('close', () => {
        console.log('DISCONNECTED // client', newConnection.client.id, 'connection', connectionId, 'at session', session.id)
        console.log(`${connectionId} Connection closed`);
        const lastConnection = connections.filter(c => c.client.id === newConnection.client.id).length === 1
        connections = connections.filter(connection => connection.id !== connectionId);
        if (lastConnection) {
            //clients = clients.filter(c => c.id !== newConnection.client.id)
        }
        sendSessionsToAll();
    });
}

app.get('/', (req, res) => {
    res.send(index)
})

app.get('/session/:uuid/reveal', (req, res) => {
    const session = getSession(req);
    if (!session) {
        res.setHeader('HX-Redirect', '/sessionExpired.html');
        res.send()
        return;
    }
    session.revealed = true;
    sendVotesToAll();
    res.send()
})

app.get('/session/:uuid/reset', (req, res) => {
    const session = getSession(req);
    if (!session) {
        res.setHeader('HX-Redirect', '/sessionExpired.html');
        res.send()
        return;
    }
    session.revealed = false;
    session.clients.forEach(c => c.value = null)
    session.revealed = false;
    sendVotesToAll();
    sendSessionsToAll();
    sendResetToAll()
    res.send()
})

app.get('/session/:uuid/events', eventsHandler);

app.get('/session/:uuid/clientinfo', (req, res) => {
    const client = getClient(req);
    res.send(`
        <div>Name: ${client?.name}</div>
    `)
})

function getClient(req: Request) {
    return getSession(req)?.clients.find(c => c.id === req.cookies.client)
}

app.post('/session/:uuid/select', (req, res) => {
    const session = getSession(req);
    if (!session) {
        res.setHeader('HX-Redirect', '/sessionExpired.html');
        res.send()
        return;
    }
    const vote = session?.clients.find(v => v.id === req.cookies.client)
    const value = escape(req.body.value)
    if (vote) {
        vote.value = value
    } else {
        //
    }
    res.send(cards(value, session))
    sendVotesToAll()
})

app.get('/session/:uuid/votes', (req, res) => {
    const session = getSession(req);
    if (!session) {
        res.setHeader('HX-Redirect', '/sessionExpired.html');
        res.send()
        return;
    }
    res.send(renderVotes(session))
})

function getSession(req: Request | string) {
    if (typeof req === 'string') {
        return sessions.find(s => s.id === req);
    }
    return sessions.find(s => s.id === req.cookies.session);
}

function escape(html: string) {
    return String(html)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/'/g, '&#39;')
        .replace(/"/g, '&quot;');
};

app.post('/session/:uuid/clientname', (req, res) => {
    const session = getSession(req);
    if (!session) {
        res.setHeader('HX-Redirect', '/sessionExpired.html');
        res.send()
        return;
    }
    const existingClient = getClient(req)
    const clientName = escape(req.body.name);
    if (existingClient) {
        existingClient.name = clientName
    } else {
        const clientId = crypto.randomUUID();
        session.clients.push({
            id: clientId,
            name: clientName,
            value: null
        })
        res.cookie('client', clientId, { path: '/session/' + session.id })
    }
    sendSessionsToAll()
    res.send(sessionJoined(session))
})

app.get('/sessionExpired.html', (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html lang="de" class="bg-gradient-to-br from-cyan-500 to-blue-500 h-full">
    ${head}
    <body>
        <div class="absolute top-2 left-2">
            <a href="/" class="text-3xl">
                🃏
            </a>
        </div>
        <div class="container p-12 flex flex-col items-center mx-auto gap-4">
            <h1 class="text-3xl font-bold underline mb-2">
                Ooops, die Sessions ist nicht mehr vorhanden
            </h1>
            <a href="/" class="inline-block rounded bg-indigo-600 p-2 text-slate-200">Neue Session</a>
        </div>
    </body>
    
    </html>
    `)
})

app.get('/session/:uuid', (req, res) => {
    const uuid = req.params.uuid;
    const session = getSession(uuid);
    if (!session) {
        res.setHeader('HX-Redirect', '/sessionExpired.html');
        res.redirect('/sessionExpired.html')
        return;
    }
    res.cookie('session', uuid, { path: '/session/' + uuid });
    if (req.cookies.client) {
        if (getClient(req)) {
            res.send(renderSessionWithVotes(session))
            return;
        }
    }
    res.send(renderSession(session))
})

app.get('/session/:uuid/sessionstate', (req, res) => {
    const session = getSession(req);
    res.send(`Session: ${session?.name}`)
})

function addSession(name: string) {
    let runs = 0;
    while (runs < 10) {
        runs++;
        const sessionId = randomName()
        const sessionWithSameId = sessions.filter(s => s.id === sessionId)
        if (sessionWithSameId.length === 0) {
            sessions.push({
                clients: [],
                connections: [],
                id: sessionId,
                revealed: false,
                name
            })
            return sessionId;
        }
    }
    return 'nope'
}

app.get('/newSession', (req, res) => {
    const sessionId = addSession('Neue Session');
    res.redirect('/session/' + sessionId)
})

app.post('/newSession', (req, res) => {
    const sessionId = addSession(escape(req.body.sessionname) || 'Neue Session');
    res.setHeader('HX-Redirect', '/session/' + sessionId);
    res.send()
})

function sendSessionsToAll() {
    connections.forEach(c => c.response.write(`event: sessions\ndata: Sessions ${connections.length}\n\n`))
}

function sendVotesToAll() {
    connections.forEach(c => c.response.write(`event: votes\ndata: Sessions ${connections.length}\n\n`))
}

function sendResetToAll() {
    connections.forEach(c => c.response.write(`event: reset\ndata: Sessions ${connections.length}\n\n`))
}

app.listen(port, () => {
    console.log(`HTMX Poker listening on port ${port}`)
})