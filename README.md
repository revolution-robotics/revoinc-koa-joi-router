# koa-joi-router

Joi-validated [Koa][] routing.

[![NPM version][npm-image]][npm-url]
[![Test coverage][codecov-image]][codecov-url]
[![npm download][download-image]][download-url]

[npm-image]: https://img.shields.io/npm/v/koa-joi-router.svg?style=flat-square
[npm-url]: https://www.npmjs.com/package/@revoinc/koa-joi-router
[codecov-image]: https://codecov.io/github/koajs/joi-router/coverage.svg?branch=master
[codecov-url]: https://codecov.io/github/revolution-robotics/revoinc-koa-joi-router?branch=main
[download-image]: https://img.shields.io/npm/dm/koa-joi-router.svg?style=flat-square
[download-url]: https://npmjs.org/package/@revoinc/koa-joi-router
[co]: https://github.com/tj/co
[koa]: http://koajs.com
[co-body]: https://github.com/visionmedia/co-body
[@revoinc/async-busboy]: https://github.com/revolution-robotics/revoinc-async-busboy
[joi]: https://github.com/hapijs/joi
[@koa/router]: https://github.com/koajs/router
[generate API documentation]: https://github.com/a-s-o/koa-docs
[path-to-regexp]: https://github.com/pillarjs/path-to-regexp

#### Features:

- built in input validation using [joi][]
- built in [output validation](#validating-output) using [joi][]
- built in body parsing using [co-body][] and [@revoinc/async-busboy][]
- built on the great [@koa/router][]
- [exposed route definitions](#routes) for later analysis
- string path support
- [regexp-like path support](#path-regexps)
- [multiple method support](#multiple-methods-support)
- [multiple middleware support](#multiple-middleware-support)
- [continue on error support](#handling-errors)
- [router prefixing support](#prefix)
- [router level middleware support](#use)
- meta data support
- HTTP 405 and 501 support

#### Node compatibility

NodeJS `>= 16` is required.

#### Example

```js
import Koa from 'koa'
import koaRouter from '@revoinc/koa-joi-router'

const Joi = koaRouter.Joi
const public = koaRouter()

public.get('/', async (ctx) => {
  ctx.body = 'hello joi-router!'
})

public.route({
  method: 'post',
  path: '/signup',
  validate: {
    body: {
      name: Joi.string().max(100),
      email: Joi.string().lowercase().email(),
      password: Joi.string().max(100),
      _csrf: Joi.string().token()
    },
    type: 'form',
    output: {
      200: {
        body: {
          userId: Joi.string(),
          name: Joi.string()
        }
      }
    }
  },
  handler: async (ctx) => {
    const user = await createUser(ctx.request.body)
    ctx.status = 201
    ctx.body = user
  }
})

const app = new Koa()
app.use(public.middleware())
app.listen(3000)
```

## Usage
`koa-joi-router` returns a constructor which you use to define your routes.
The design is such that you construct multiple router instances, one for
each section of your application which you then add as koa middleware.

```js
import Koa from 'koa'
import koaRouter from '@revoinc/koa-joi-router'

const pub = koaRouter()
const admin = koaRouter()
const auth = koaRouter()

// add some routes ..
pub.get('/some/path', async () => {})
admin.get('/admin', async () => {})
auth.post('/auth', async () => {})

const app = new Koa()
app.use(pub.middleware())
app.use(admin.middleware())
app.use(auth.middleware())
app.listen()
```

## Module properties

### .Joi

It is **HIGHLY RECOMMENDED** you use this bundled version of Joi
to avoid bugs related to passing an object created with a different
release of Joi into the router.

```js
import Koa from 'koa'
import koaRouter from '@revoinc/koa-joi-router'
const Joi = koaRouter.Joi
```

## Router instance methods

### .route()

Adds a new route to the router. `route()` accepts an object or array of objects
describing route behavior.

```js
import koaRouter from '@revoinc/koa-joi-router'
const public = koaRouter()

public.route({
  method: 'post',
  path: '/signup',
  validate: {
    header: joiObject,
    query: joiObject,
    params: joiObject,
    body: joiObject,
    maxBody: '64kb',
    output: { '400-600': { body: joiObject } },
    type: 'form',
    failure: 400,
    continueOnError: false
  },
  pre: async (ctx, next) => {
    await checkAuth(ctx);
    return next();
  },
  handler: async (ctx) => {
    await createUser(ctx.request.body);
    ctx.status = 201;
  },
  meta: { 'this': { is: 'stored internally with the route definition' }}
})
```

or

```js
import koaRouter from '@revoinc/koa-joi-router'
const public = koaRouter()

const routes = [
  {
    method: 'post',
    path: '/users',
    handler: async (ctx) => {}
  },
  {
    method: 'get',
    path: '/users',
    handler: async (ctx) => {}
  }
]

public.route(routes)
```

##### .route() options

- `method`: **required** HTTP method like "get", "post", "put", etc
- `path`: **required** string
- `validate`
  - `header`: object which conforms to [Joi][] validation
  - `query`: object which conforms to [Joi][] validation
  - `params`: object which conforms to [Joi][] validation
  - `body`: object which conforms to [Joi][] validation
  - `maxBody`: max incoming body size for forms or json input
  - `failure`: HTTP response code to use when input validation fails. default `400`
  - `type`: if validating the request body, this is **required**. either `form`, `json` or `multipart`
  - `formOptions`: options for co-body form parsing when `type: 'form'`
  - `jsonOptions`: options for co-body json parsing when `type: 'json'`
  - `multipartOptions`: options for [busboy][] parsing when `type: 'multipart'`
     - [any busboy constructor option][busboy]. eg `{ limits: { files: 1 }}`
  - `output`: see [output validation](#validating-output)
  - `continueOnError`: if validation fails, this flags determines if `koa-joi-router` should [continue processing](#handling-errors) the middleware stack or stop and respond with an error immediately. useful when you want your route to handle the error response. default `false`
  - `validateOptions`: options for Joi validate. default `{}`
- `handler`: **required** async function or functions
- `pre`: async function or function, will be called before parser and validators
- `meta`: meta data about this route. `koa-joi-router` ignores this but stores it along with all other route data

### .get(),post(),put(),delete() etc - HTTP methods

`koa-joi-router` supports the traditional `router.get()`, `router.post()` type APIs
as well.

```js
import koaRouter from '@revoinc/koa-joi-router'
const admin = koaRouter()

// signature: router.method(path [, config], handler [, handler])

admin.put('/thing', handler)
admin.get('/thing', middleware, handler)
admin.post('/thing', config, handler)
admin.delete('/thing', config, middleware, handler)
```

### .use()
Middleware run in the order they are defined by .use()(or .get(), etc.) They are invoked sequentially, requests start at the first middleware and work their way "down" the middleware stack which matches Express 4 API.

```js
import koaRouter from '@revoinc/koa-joi-router'
const users = koaRouter()

users.get('/:id', handler)
users.use('/:id', runThisAfterHandler)
```

### .prefix()

Defines a route prefix for all defined routes. This is handy in "mounting" scenarios.

```js
import koaRouter from '@revoinc/koa-joi-router'
const users = koaRouter()

users.get('/:id', handler)
// GET /users/3 -> 404
// GET /3 -> 200

users.prefix('/users')
// GET /users/3 -> 200
// GET /3 -> 404
```

### .param()

Defines middleware for named route parameters. Useful for auto-loading or validation.

_See [@koa/router](https://github.com/koajs/router/blob/master/API.md#module_koa-router--Router+param)_

```js
import koaRouter from '@revoinc/koa-joi-router'
const users = koaRouter()

const findUser = (id) => {
  // stub
  return Promise.resolve('Cheddar')
}

users.param('user', async (id, ctx, next) => {
  const user = await findUser(id)
  if (!user) return ctx.status = 404
  ctx.user = user
  await next()
})

users.get('/users/:user', (ctx) => {
  ctx.body = `Hello ${ctx.user}`
})

// GET /users/3 -> 'Hello Cheddar'
```

### .middleware()

Generates routing middleware to be used with `koa`. If this middleware is
never added to your `koa` application, your routes will not work.

```js
import koaRouter from '@revoinc/koa-joi-router'
const public = koaRouter()

public.get('/home', homepage)

const app = koa()
app.use(public.middleware()) // wired up
app.listen()
```

## Additions to ctx.state

The route definition for the currently matched route is available
via `ctx.state.route`. This object is not the exact same route
definition object which was passed into koa-joi-router, nor is it
used internally - any changes made to this object will
not have an affect on your running application but is available
to meet your introspection needs.

```js
import koaRouter from '@revoinc/koa-joi-router'
const public = koaRouter()

public.get('/hello', async (ctx) => {
  console.log(ctx.state.route)
})
```

## Additions to ctx.request

When using the `validate.type` option, `koa-joi-router` adds a few new properties
to `ctx.request` to faciliate input validation.

### ctx.request.body

The `ctx.request.body` property will be set when either of the following
`validate.type`s are set:

- json
- form

#### json

When `validate.type` is set to `json`, the incoming data must be JSON. If it is not,
validation will fail and the response status will be set to 400 or the value of
`validate.failure` if specified. If successful, `ctx.request.body` will be set to the
parsed request input.

```js
admin.route({
  method: 'post',
  path: '/blog',
  validate: { type: 'json' },
  handler: async (ctx) => {
    console.log(ctx.request.body) // the incoming json as an object
  }
})
```

#### form

When `validate.type` is set to `form`, the incoming data must be form data
(x-www-form-urlencoded). If it is not, validation will fail and the response
status will be set to 400 or the value of `validate.failure` if specified.
If successful, `ctx.request.body` will be set to the parsed request input.

```js
admin.route({
  method: 'post',
  path: '/blog',
  validate: { type: 'form' },
  handler: async (ctx) => {
    console.log(ctx.request.body) // the incoming form as an object
  }
})
```

### ctx.request.multipart

The `ctx.request.multipart` property will be set when either of the following
`validate.type`s are set:

- multipart

#### multipart

When `validate.type` is set to `multipart`, the incoming data must be multipart data.
If it is not, validation will fail and the response
status will be set to 400 or the value of `validate.failure` if specified.
If successful, `ctx.request.multipart` will be set to an
[async-busboy][] object.

```js
admin.route({
  method: 'post',
  path: '/blog',
  validate: { type: 'multipart' },
  handler: async (ctx) => {
    let files, fields
    let part

    try {
      { files, fields } = await ctx.request.multipart
      files.forEach(file => {
        // do something with the incoming file stream
        file.pipe(someOtherStream)
      })
    } catch (err) {
      // handle the error
    }

    console.log(fields.name) // form data
  }
});
```

## Handling non-validated input

_Note:_ if you do not specify a value for `validate.type`, the
incoming payload will not be parsed or validated. It is up to you to
parse the incoming data however you see fit.

```js
admin.route({
  method: 'post',
  path: '/blog',
  validate: { },
  handler: async (ctx) => {
    console.log(ctx.request.body, ctx.request.multipart); // undefined undefined
  }
})
```

## Validating output

Validating the output body and/or headers your service generates on a
per-status-code basis is supported. This comes in handy when contracts
between your API and client are strict e.g. any change in response
schema could break your downstream clients. In a very active codebase, this
feature buys you stability. If the output is invalid, an HTTP status 500
will be used.

Let's look at some examples:

### Validation of an individual status code

```js
router.route({
  method: 'post',
  path: '/user',
  validate: {
    output: {
      200: { // individual status code
        body: {
          userId: Joi.string(),
          name: Joi.string()
        }
      }
    }
  },
  handler: handler
})
```

### Validation of multiple individual status codes

```js
router.route({
  method: 'post',
  path: '/user',
  validate: {
    output: {
      '200,201': { // multiple individual status codes
        body: {
          userId: Joi.string(),
          name: Joi.string()
        }
      }
    }
  },
  handler: handler
})
```

### Validation of a status code range

```js
router.route({
  method: 'post',
  path: '/user',
  validate: {
    output: {
      '200-299': { // status code range
        body: {
          userId: Joi.string(),
          name: Joi.string()
        }
      }
    }
  },
  handler: handler
})
```

### Validation of multiple individual status codes and ranges combined

You are free to mix and match ranges and individual status codes.

```js
router.route({
  method: 'post',
  path: '/user',
  validate: {
    output: {
      '200,201,300-600': { // mix it up
        body: {
          userId: Joi.string(),
          name: Joi.string()
        }
      }
    }
  },
  handler: handler
})
```

### Validation of output headers

Validating your output headers is also supported via the `headers` property:

```js
router.route({
  method: 'post',
  path: '/user',
  validate: {
    output: {
      '200,201': {
        body: {
          userId: Joi.string(),
          name: Joi.string()
        },
        headers: Joi.object({ // validate headers too
          authorization: Joi.string().required()
        }).options({
          allowUnknown: true
        })
      },
      '500-600': {
        body: { // this rule only runs when a status 500 - 600 is used
          error_code: Joi.number(),
          error_msg: Joi.string()
        }
      }
    }
  },
  handler: handler
})
```

## Router instance properties

### .routes

Each router exposes it's route definitions through it's `routes` property.
This is helpful when you'd like to introspect the previous definitions and
take action e.g. to [generate API documentation][] etc.

```js
import koaRouter from '@revoinc/koa-joi-router'
const admin = koaRouter()

admin.post('/thing', { validate: { type: 'multipart' }}, handler)

console.log(admin.routes)
// [ { path: '/thing',
//     method: [ 'post' ],
//     handler: [ [Function] ],
//     validate: { type: 'multipart' } } ]
```

## Path RegExps

Sometimes you need `RegExp`-like syntax support for your route definitions.
Because [path-to-regexp][]
supports it, so do we!

```js
import koaRouter from '@revoinc/koa-joi-router'
const admin = koaRouter()

admin.get('/blog/:year(\\d{4})-:day(\\d{2})-:article(\\d{3})', async (ctx, next) => {
 console.log(ctx.request.params) // { year: '2017', day: '01', article: '011' }
});
```

## Multiple methods support

Defining a route for multiple HTTP methods in a single shot is supported.

```js
import koaRouter from '@revoinc/koa-joi-router'
const admin = koaRouter()

admin.route({
  path: '/',
  method: ['POST', 'PUT'],
  handler: fn
});
```

## Multiple middleware support

Often times you may need to add additional, route specific middleware to a
single route.

```js
import koaRouter from '@revoinc/koa-joi-router'
const admin = koaRouter()

admin.route({
  path: '/',
  method: ['POST', 'PUT'],
  handler: [ yourMiddleware, yourHandler ]
});
```

## Nested middleware support

You may want to bundle and nest middleware in different ways for reuse and
organization purposes.

```js
import koaRouter from '@revoinc/koa-joi-router'
const admin = koaRouter()
const commonMiddleware = [ yourMiddleware, someOtherMiddleware ];

admin.route({
  path: '/',
  method: ['POST', 'PUT'],
  handler: [ commonMiddleware, yourHandler ]
});
```

This also works with the .get(),post(),put(),delete(), etc HTTP method helpers.

```js
import koaRouter from '@revoinc/koa-joi-router'
const admin = koaRouter()

const commonMiddleware = [ yourMiddleware, someOtherMiddleware ];
admin.get('/', commonMiddleware, yourHandler);
```

## Handling errors

By default, `koa-joi-router` stops processing the middleware stack when either
input validation fails. This means your route will not be reached. If
this isn't what you want, for example, if you're writing a web app which needs
to respond with custom html describing the errors, set the `validate.continueOnError`
flag to true. You can find out if validation failed by checking `ctx.invalid`.

```js
admin.route({
  method: 'post',
  path: '/add',
  validate: {
    type: 'form',
    body: {
      id: Joi.string().length(10)
    },
    continueOnError: true
  },
  handler: async (ctx) => {
    if (ctx.invalid) {
      console.log(ctx.invalid.header);
      console.log(ctx.invalid.query);
      console.log(ctx.invalid.params);
      console.log(ctx.invalid.body);
      console.log(ctx.invalid.type);
    }

    ctx.body = await render('add', { errors: ctx.invalid });
  }
});
```

## Development

### Running tests

- `npm test` runs tests + code coverage + lint
- `npm run lint` runs lint only
- `npm run lint-fix` runs lint and attempts to fix syntax issues
- `npm run test-cov` runs tests + test coverage
- `npm run open-cov` opens test coverage results in your browser
- `npm run test-only` runs tests only

## LICENSE

[MIT](https://github.com/koajs/joi-router/blob/master/LICENSE)

[busboy]: https://github.com/mscdex/busboy#busboy-methods
