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
            password,
        },
    });
    if (user) {
        return jwt.sign({ userId: user.id }, process.env.JWT);
    }
    const error = Error('bad credentials');
    error.status = 401;
    throw error;
};

const salt = 5;
User.beforeCreate(async (user, options) => {
    user.password = await bcrypt.hash(user.password, salt);
    // user.password = bcrypt.hashSync(user.password, salt);
    // await bcrypt.hash(user.password, salt).then(function (hash) {
    //     user.password = hash;
    // });
});

const syncAndSeed = async () => {
    await conn.sync({ force: true });
    const credentials = [
        { username: 'lucy', password: 'lucy_pw' },
        { username: 'moe', password: 'moe_pw' },
        { username: 'larry', password: 'larry_pw' },
        { username: 'joe', password: 'joe_pw' },
    ];
    const [lucy, moe, larry] = await Promise.all(
        credentials.map(credential => User.create(credential))
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
