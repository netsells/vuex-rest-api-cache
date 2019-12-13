# CHANGELOG.md

## Unreleased

- Allow falsy but valid values, e.g. `0`, to be used as a URL parameter

## 2.7.1 (2019-09-19)

- Fix build issue

## 2.7.0 (2019-09-19)

- Added toJSON to BaseModel to prevent nuxt errors

## 2.6.0 (2019-09-18)

- Added meta support for multiple model endpoints

## 2.5.0 (2019-08-20)

Features:

- Added support for binary file downloads

## 2.4.0 (2019-06-06)

Tweaks:

- None identified requests which read from the cache now will only read from the cache if there's something in it.

## 2.3.1 (2019-03-22)

Bug fixes:

  - Fix models not always being returns as instance of their class

## 2.3.0 (2019-03-20)

Features:

  - Added support for extra paths for custom calls, e.g. `/posts/count` or `/posts/2/touch`

## 2.2.0 (2019-03-20)

    - Changelog created
