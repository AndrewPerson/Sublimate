var config;

if (process.env.PRODUCTION) {
    config = {
        id: process.env.ID,
        secret: process.env.SECRET,
        host: process.env.HOST
    };
}
else {
    config = require("./config");
}

var id = config.id,
    secret = config.secret,
    callback = (process.env.PRODUCTION ? 'https://' : "http://") + config.host + '/callback';

var port = process.env.PORT || 8080;

var express = require('express'),
    app = express(),
    passport = require('passport'),
    SBHSStrategy = require('passport-sbhs'),
    uuid = require('node-uuid'),
    request = require('request');

app.use(express.static(__dirname + '/public', { maxAge: 5184000 /*One Day*/ }));

passport.serializeUser(function (user, done) { done(null, user) });
passport.deserializeUser(function (user, done) { done(null, user) });

app.set('view engine', 'ejs');
app.use(require('cookie-parser')());
app.use(require('express-session')({
    secret: secret,
    key: id,
    cookie: {
        maxAge: 7776000000 /* 90 Days */
    },
    resave: true,
    saveUninitialized: true
}));
app.use(passport.initialize());
app.use(passport.session());

var state = uuid.v4();

var SBHS = new SBHSStrategy(
    {
        clientID: id,
        clientSecret: secret,
        state: state,
        callbackURL: callback
    },
    function (accessToken, refreshToken, profile, done) {
        profile.tokens = { accessToken: accessToken, refreshToken: refreshToken, expires: Date.now() + 3600000 /* 1 Hour */ };
        done(null, profile);
    }
);

passport.use(SBHS);

function getTokens(tokens, done) {
    if (Date.now() <= tokens.expires) {
        done(null, tokens);
    } else {
        request.post({
            'uri': 'https://student.sbhs.net.au/api/token',
            'headers': { 'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8' },
            'body': 'grant_type=refresh_token&refresh_token=' + tokens.refreshToken + '&client_id=' + encodeURIComponent(id) + '&client_secret=' + secret
        }, function (err, response, body) {
            if (err) return done(err);
            var result = JSON.parse(body);
            var newTokens = {
                accessToken: result.access_token,
                refreshToken: tokens.refreshToken,
                expires: Date.now() + 3600000
            };
            done(null, newTokens);
        });

    }
};

app.get('/', function (req, res) {
    if (req.user) {
        res.render('index');
    } else {
        res.render('login');
    }
});

app.get('/fallback', function (req, res) {
    if (req.user) {
        res.render('offline');
    } else {
        res.status(401).send("401 Unauthorized");
    }
});

app.get('/api/dailynotices.json', function (req, res) {
    if (req.user) {
        getTokens(req.user.tokens, function (err, tokens) {
            req.user.tokens = tokens;
            SBHS.dailyNotices(req.user.tokens.accessToken, function (err, o) {
                if (!err && o) {
                    /* EXPERIMENTAL CACHE SETTINGS */
                    res.set('Cache-Control', 'private, max-age=300');
                    res.jsonp(o);
                } else {
                    res.status(500).send(err);
                }
            }, req.query.date);
        });
    } else {
        res.status(401).send("401 Unauthorized");
    }
});

app.get('/api/timetable.json', function (req, res) {
    if (req.user) {
        getTokens(req.user.tokens, function (err, tokens) {
            req.user.tokens = tokens;
            SBHS.timetable(req.user.tokens.accessToken, function (err, o) {
                if (!err && o) {
                    res.jsonp(o);
                } else {
                    res.status(500).send("500 Internal Server Error");
                }
            });
        });
    } else {
        res.status(401).send("401 Unauthorized");
    }
});

app.get('/api/calendar/terms.json', function (req, res) {
    var year = new Date().getFullYear();
    request("https://student.sbhs.net.au/api/calendar/terms.json", function (err, response, body) {
        if (!err && response.statusCode == 200) {
            body = JSON.parse(body);
            res.jsonp(body);
        };
    });
});

app.get('/api/daytimetable.json', function (req, res) {
    if (req.user) {
        getTokens(req.user.tokens, function (err, tokens) {
            req.user.tokens = tokens;
            SBHS.day(req.user.tokens.accessToken, function (err, o) {
                if (!err && o) {
                    /* EXPERIMENTAL CACHE SETTINGS */
                    res.set('Cache-Control', 'private, max-age=300');

                    if (o.shouldDisplayVariations) {
                        var t = o.bells[o.bells.length - 1].time.split(':'),
                            end = new Date(o.date);
                        end.setHours(parseInt(t[0])); end.setMinutes(parseInt(t[1]));
                        res.set('Cache-Control', 'private, max-age=' + (end.getTime() - Date.now()) / 1000);
                    }

                    res.jsonp(o);
                } else {
                    res.status(500).send("500 Internal Server Error");
                }
            }, req.query.date);
        });
    } else {
        res.status(401).send("401 Unauthorized");
    }
});

app.get('/login', passport.authenticate('sbhs'));

app.get('/logout', function (req, res) {
    req.logout();
    res.redirect('/');
});

app.get('/callback', passport.authenticate('sbhs', {
    successRedirect: '/',
    failureRedirect: '/'
}));

app.get('/*', function (req, res) {
    res.status(404).render('404', { name: req.user ? req.user.givenName : null })
});

app.listen(port);