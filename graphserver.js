const { graphqlHTTP } = require('express-graphql');
const { buildSchema } = require('graphql');
const express = require('express');
const session = require('express-session');
const helmet = require('helmet');
const { csrfSync } = require('csrf-sync');
const cities = require('./UScities.json');

const schema = buildSchema(`
  type Query {
    city(name: String): City
    cities(state: String): [City]
  }
  type City { city: String, state: String }
`);
const rootValue = {
  city: ({ name }) => cities.find(city => city.city === name),
  cities: ({ state }) => state ? cities.filter(city => city.state === state) : cities,
};

function createApp({ sessionSecret = process.env.SESSION_SECRET, production = process.env.NODE_ENV === 'production' } = {}) {
  if (typeof sessionSecret !== 'string' || sessionSecret.length < 32) {
    throw new Error('Set SESSION_SECRET to at least 32 random characters.');
  }
  const app = express();
  app.disable('x-powered-by');
  app.use(helmet());
  app.use(express.json({ limit: '16kb' }));
  app.use(express.urlencoded({ extended: false, limit: '16kb' }));
  app.use(session({
    secret: sessionSecret,
    name: 'graphy',
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, sameSite: 'strict', secure: production, maxAge: 1800000 },
  }));
  const { generateToken, csrfSynchronisedProtection } = csrfSync({
    getTokenFromRequest: req => req.is('application/x-www-form-urlencoded')
      ? req.body._csrf : req.headers['x-csrf-token'],
  });
  app.get('/csrf-token', (req, res) => res.json({ csrfToken: generateToken(req) }));
  app.get('/form', (req, res) => {
    const token = generateToken(req);
    res.type('html').send(`<form method="post" action="/posts/create"><input type="hidden" name="_csrf" value="${token}"><textarea name="message"></textarea><button>Send</button></form>`);
  });
  app.use(csrfSynchronisedProtection);
  app.post('/posts/create', (req, res) => res.json({ status: 'data is being processed' }));
  app.use('/graphql', graphqlHTTP({ schema, rootValue, graphiql: !production }));
  app.get('/', (req, res) => res.type('text').send('GraphQL endpoint: /graphql'));
  app.use((error, req, res, next) => {
    if (res.headersSent) return next(error);
    if (error.code === 'EBADCSRFTOKEN') return res.status(403).json({ error: 'Invalid CSRF token' });
    return res.status(error.status >= 400 && error.status < 500 ? error.status : 500)
      .json({ error: 'Request could not be processed' });
  });
  return app;
}

if (require.main === module) {
  createApp().listen(4000, () => console.log('Express GraphQL server running on port 4000/graphql'));
}
module.exports = { createApp };
