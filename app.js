const express = require('express');
const app = express();
app.use(express.json());
const {
    models: { User },
} = require('./db');
const path = require('path');

async function requireToken(req, res, next) {
    try {
        const token = req.headers.authorization;
        const user = await User.byToken(token);
        req.user = user;
        next();
    } catch (ex) {
        next(ex);
    }
}

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

app.post('/api/auth', async (req, res, next) => {
    try {
        res.send({ token: await User.authenticate(req.body) });
    } catch (ex) {
        next(ex);
    }
});

app.get('/api/auth', requireToken, (req, res, next) => {
    try {
        res.send(req.user);
    } catch (ex) {
        next(ex);
    }
});

app.get('/api/users/:id/notes', requireToken, async (req, res, next) => {
    try {
        const user = req.user;
        if (user.dataValues.id === Number(req.params.id))
            res.send(await user.getNotes());
        else throw new Error('requested id does not match current user');
    } catch (ex) {
        next(ex);
    }
});

app.use((err, req, res, next) => {
    console.log(err);
    res.status(err.status || 500).send({ error: err.message });
});

module.exports = app;
