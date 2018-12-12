# Vuex Rest API Cache

[![Build Status](https://travis-ci.org/netsells/vuex-rest-api-cache.svg?branch=master)](https://travis-ci.org/netsells/vuex-rest-api-cache)

Vuex Rest API action creator and model cacher

## Installation

```sh
yarn add @netsells/vuex-rest-api-cache
```

## Setup

```javascript
import Vuex from 'vuex';
import Vrac from 'vuex-rest-api-cache';

const posts = new Vrac({
    baseUrl: `${ API_URL }/posts`,
    children: {
        comments: {
            baseUrl: `${ API_URL }/posts/:post_id/comments`
        },
    },
}).store;

const store = new Vuex.Store({
    modules: {
        posts,
    },
});
```

## Usage

This includes usage examples for root models (e.g. `/api/v1/posts`) and for child models (e.g. `/api/v1/posts/:post_id/comments`)

### Index

```javascript
const posts = await this.$store.dispatch('posts/index');

const comments = await this.$store.dispatch('posts/comments/index', {
    fields: {
        post_id: 1,
    },
});
```

### Create

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
