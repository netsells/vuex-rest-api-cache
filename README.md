# Vuex Rest API Cache

[![npm version](https://badge.fury.io/js/%40netsells%2Fvuex-rest-api-cache.svg)](https://badge.fury.io/js/%40netsells%2Fvuex-rest-api-cache)
[![Build Status](https://travis-ci.org/netsells/vuex-rest-api-cache.svg?branch=master)](https://travis-ci.org/netsells/vuex-rest-api-cache)
[![codecov](https://codecov.io/gh/netsells/vuex-rest-api-cache/branch/master/graph/badge.svg)](https://codecov.io/gh/netsells/vuex-rest-api-cache)
[![Mutation testing badge](https://badge.stryker-mutator.io/github.com/netsells/vuex-rest-api-cache/master)](https://stryker-mutator.github.io)
[![Netlify Status](https://api.netlify.com/api/v1/badges/e3db3c4a-3f5d-4126-8c25-33f8aec4db80/deploy-status)](https://app.netlify.com/sites/vuex-rest-api-cache/deploys)

### Vuex Rest API action creator and model cacher

This module makes it easier to create Vuex store actions, mutators, getters and
state for communicating with rest APIs.

It is created and maintained by the [Netsells team](https://netsells.co.uk/)

## Installation

```sh
yarn add @netsells/vuex-rest-api-cache
```

## Setup

```javascript
import Vuex from 'vuex';
import Vrac from 'vuex-rest-api-cache';

const modules = Vrac.createModules({
    posts: {
        baseUrl: `${ API_URL }/posts`,
        children: {
            comments: {
                baseUrl: `${ API_URL }/posts/:post_id/comments`
            },
        },
    },
});

const store = new Vuex.Store({ modules });
```

## Documentation

[Documentation is available here](https://vuex-rest-api-cache.netlify.com)

## Quick Usage

This includes usage examples for root models (e.g. `/api/v1/posts`) and for child models (e.g. `/api/v1/posts/:post_id/comments`)

### Index

Get a list of models from the API. Will cache each model. Will always create a
new API request instead of using the cache.

```javascript
const posts = await this.$store.dispatch('posts/index');

const comments = await this.$store.dispatch('posts/comments/index', {
    fields: {
        post_id: 1,
    },
});
```

### Create

Create a model. Will cache the model returned by the API. Will always create a
new API request.

```javascript
const post = await this.$store.dispatch('posts/create', {
    fields: {
        text: 'Foo bar',
    },
});

const comment = await this.$store.dispatch('posts/comments/create', {
    fields: {
        post_id: post.id,
        message: 'Foo bar',
    },
});
```

### Read

Read a model. Will cache the model returned by the API. Will always use a cached
model over reading from the API.

```javascript
const post = await this.$store.dispatch('posts/read', {
    fields: {
        id: 45,
    },
});

const comment = await this.$store.dispatch('posts/comments/read', {
    fields: {
        post_id: post.id,
        id: 3,
    },
});
```

### Update

Update a model. Will cache the model returned by the API. Will always create a
new API request.

```javascript
const post = await this.$store.dispatch('posts/update', {
    fields: {
        id: 45,
        text: 'Bar foo',
    },
});

const comment = await this.$store.dispatch('posts/comments/update', {
    fields: {
        post_id: post.id,
        id: 3,
        message: 'Hello world',
    },
});
```

### Destroy

Destroy a model. Will remove the model from the cache. Will always create a
new API request.

```javascript
await this.$store.dispatch('posts/destroy', {
    fields: {
        id: 45,
    },
});

await this.$store.dispatch('posts/comments/destroy', {
    fields: {
        post_id: post.id,
        id: 3,
    },
});
```

### Changing the HTTP Requests

Vrac sends all HTTP requests through `Vrac.requestAdapter`. By default, this
passes the params straight through to `axios.request`. By overriding this
function, you can either modify the request (e.g. to add authorization headers)
or use a completely different HTTP library.

```javascript
Vrac.requestAdapter = function(requestParams) {
    return axios.request(requestParams);
};
```
