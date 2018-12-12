import express from 'express';

const app = express();
const port = process.env.PORT || 3000;

app.get('/', (req, res) => res.send(JSON.stringify([{
    id: 1,
    name: 'Thing 1',
}, {
    id: 2,
    name: 'Stuff 2',
}])));

app.get('/2', (req, res) => res.send(JSON.stringify({
    id: 2,
    name: 'Stuff 2',
})));

app.patch('/2', (req, res) => res.send(JSON.stringify({
    id: 2,
    name: 'Updated stuff',
})));

app.listen(port, () => console.log(`Example app listening on port ${port}!`));
