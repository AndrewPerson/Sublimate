# Sublimate

This is a slightly altered version of [quadruple-slap-old/sublimate](https://github.com/quadrupleslap-old/sublimate);

---
**Warning:** It's a little rough around the edges right now.

## Dependencies

```js
npm install
```

The above code *probably* works, but I haven't tested it.

## License

MIT. I know you know what that means.

## How to Use

Register your app at the School Portal first. Make sure to register the redirect as /callback.

### Developing

Create a file named **config.js** in the root directory, with the following stuff in it:

```js
module.exports = {
    id: "<insert APP ID>",
    secret: "<insert APP SECRET>",
    host: "<insert APP HOST>"
}
```

### Production

For a production scenario, instead of using config.js, set the following environment variables:

1. PRODUCTION=TRUE
2. ID=\<insert APP ID\>
3. SECRET=\<insert APP SECRET\>
4. HOST=\<insert APP HOST\>

## Credits

Well, the epic thingumabobs used  are:

- JQuery, the cheap way to code your client. (TM)
- Countdown.js, which doesn't seem to have a good CDN behind it. = (
- Node.js, which I don't think I have to *actually* credit, but meh.
- Express, the cheap way to code your server. (TM)
