# Graphy service security exercise

This course project provides a small Express and GraphQL API for US city data.

## Run locally

Install the locked dependencies with `npm ci --ignore-scripts`. Set `SESSION_SECRET`
to a randomly generated secret of at least 32 characters in the environment, then
run `node graphserver.js`. The server listens on port 4000.

The GraphQL endpoint is `/graphql`. Obtain a session cookie and token from
`GET /csrf-token`, then include both the cookie and the token in the
`x-csrf-token` header for POST requests. `/form` demonstrates a protected form.

Run `node --test security-check.test.cjs` to verify query behavior, security
headers, CSRF rejection/acceptance and external secret enforcement.

## Container

Build with `docker build -t graphy-secure .`. Supply `SESSION_SECRET` at runtime;
do not put it in the image or repository. Production cookies require HTTPS.
The default session store is only suitable for this single-process exercise;
deployments need a persistent shared store and an appropriately configured HTTPS
reverse proxy.

## Changes

The starter had a syntax error, missing middleware dependencies, incorrectly
invoked Helmet and CSRF middleware, an undefined session store and a hardcoded
secret. These have been corrected. The Debian Buster base was replaced with a
supported Node Alpine base, dependencies are locked, and the container runs as
the unprivileged `node` user.

Both security regression tests pass. npm audit reports zero dependency
vulnerabilities. Snyk and container scan results are recorded separately when
available; npm audit does not replace either scan.
