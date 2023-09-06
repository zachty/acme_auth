const Sequelize = require('sequelize');
const { STRING } = Sequelize;
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const config = {
    logging: false,
};

if (process.env.LOGGING) {
    delete config.logging;
}
const conn = new Sequelize(
    process.env.DATABASE_URL || 'postgres://localhost/acme_db',
    config
);

const User = conn.define('user', {
    username: STRING,
    password: STRING,
});

const Note = conn.define('note', {
    text: STRING,
});

User.byToken = async token => {
    try {
        const user = await User.findByPk(
            jwt.verify(token, process.env.JWT).userId
        );
        if (user) {
            return user;
        }
        const error = Error('bad credentials');
        error.status = 401;
        throw error;
    } catch (ex) {
        const error = Error('bad credentials');
        error.status = 401;
        throw error;
    }
};

User.authenticate = async ({ username, password }) => {
    const user = await User.findOne({
        where: {
            username,
        },
    });
    if (bcrypt.compare(password, user.password)) {
        return jwt.sign({ userId: user.id }, process.env.JWT);
    }
    const error = Error('bad credentials');
    error.status = 401;
    throw error;
};

const salt = 5;
User.beforeCreate(async (user, options) => {
    user.password = await bcrypt.hash(user.password, salt);

    //other options
    // user.password = bcrypt.hashSync(user.password, salt);
    // await bcrypt.hash(user.password, salt).then(function (hash) {
    //     user.password = hash;
    // });
});

Note.belongsTo(User);
User.hasMany(Note);

const syncAndSeed = async () => {
    await conn.sync({ force: true });
    const credentials = [
        { username: 'lucy', password: 'lucy_pw' },
        { username: 'moe', password: 'moe_pw' },
        { username: 'larry', password: 'larry_pw' },
    ];
    const notes = [
        { text: 'hey', userId: 1 },
        { text: 'hi', userId: 1 },
        { text: 'note3', userId: 2 },
        { text: 'who dun it', userId: 3 },
        { text: 'idk', userId: 3 },
    ];

    const [lucy, moe, larry] = await Promise.all(
        credentials.map(credential => User.create(credential))
    );
    const [a, b, c, d, e] = await Promise.all(
        notes.map(note => Note.create(note))
    );
    return {
        users: {
            lucy,
            moe,
            larry,
        },
    };
};

module.exports = {
    syncAndSeed,
    models: {
        User,
    },
};
