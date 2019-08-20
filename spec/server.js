import express from 'express';
import path from 'path';

const app = express();
const port = process.env.PORT || 3000;

/**
 * Format data for a response
 *
 * @param {Object} data
 * @returns {String} body
 */
const createJsonResponse = data => JSON.stringify({
    data,
});

app.get('/', (req, res) => res.send(createJsonResponse([{
    id: 1,
    name: 'Thing 1',
}, {
    id: 2,
    name: 'Stuff 2',
}])));

app.get('/2', (req, res) => res.send(createJsonResponse({
    id: 2,
    name: 'Stuff 2',
})));

app.patch('/2', (req, res) => res.send(createJsonResponse({
    id: 2,
    name: 'Updated stuff',
})));

app.put('/2', (req, res) => res.send(createJsonResponse({
    id: 2,
    name: 'Updated stuff',
})));

app.post('/', (req, res) => res.send(createJsonResponse({
    id: 3,
    name: 'New stuff',
})));

app.delete('/2', (req, res) => {
    if (req.query.noModel) {
        return res.send();
    }

    res.send(createJsonResponse({
        id: 2,
        name: 'Stuff 2',
    }));
});

app.post('/posts/2/bar', (req, res) => res.send(createJsonResponse({
    ok: 'bar',
})));

app.get('/posts/foo', (req, res) => res.send(createJsonResponse([{
    ok: 'foo',
}, {
    ok: 'foo2',
}])));

app.get('/posts/2/comments', (req, res) => res.send(createJsonResponse([{
    id: 1,
    name: 'Comment 1',
}, {
    id: 2,
    name: 'Comment 2',
}])));

app.get('/posts/2/comments/2', (req, res) => res.send(createJsonResponse({
    id: 2,
    name: 'Comment 2',
})));

app.get('/posts/export', (req, res) => {
    const fileName = path.join(__dirname, 'netsells.ico');

    res.download(fileName);
});

app.patch('/singleton', (req, res) => res.send(createJsonResponse({
    name: 'Updated singleton',
})));

app.get('/singleton', (req, res) => res.send(createJsonResponse({
    name: 'single stuff',
})));

app.listen(port);
