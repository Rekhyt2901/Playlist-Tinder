const cors = require("cors");
const express = require("express");
const https = require("https");
const cookieParser = require("cookie-parser");
const fetch = require("node-fetch");
const fs = require("fs");

const host = "spotify-tinder.alexkleyn.de";
// const host = "127.0.0.1";
const port = 3002;
const domain = "https://spotify-tinder.alexkleyn.de";
// const domain = "http://localhost";
const clientPort = 443;
// const clientPort = 1234;

let app = express();


let corsOptions = {
    origin: `${domain}`,
    optionsSuccessStatus: 200 // some legacy browsers (IE11, various SmartTVs) choke on 204
}
// let static = __dirname + "/../playlist-tinder";
// console.log(static);
// app.use(express.static(static));

app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());

let client_id = 'c38f93c18cd14affa6018a4578cebbb8'; // Your client id
let client_secret = fs.readFileSync("./client_secret", "utf-8");
let redirect_uri = `${domain}:${port}/callback`; // Your redirect uri

let stateKey = 'spotify_auth_state';

function generateRandomString(length) {
    let text = '';
    let possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

    for (let i = 0; i < length; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
};

app.get('/login', (req, res) => {
    console.log("/login");
    let state = generateRandomString(16);
    res.cookie(stateKey, state);

    // your application requests authorization
    let scopes = [
        "user-read-private",
        "user-read-email",
        "playlist-modify-private",
        "playlist-modify-public",
        "playlist-read-private",
        "playlist-read-collaborative",
        "user-library-read"

    ];
    res.redirect('https://accounts.spotify.com/authorize?' + new URLSearchParams({
        response_type: 'code',
        client_id: client_id,
        scope: scopes.join(" "),
        redirect_uri: redirect_uri,
        state: state
    }).toString());
});

app.get('/callback', async (req, res) => {
    console.log("/callback");
    // your application requests refresh and access tokens
    // after checking the state parameter

    let code = req.query.code || null;
    let state = req.query.state || null;
    let storedState = req.cookies ? req.cookies[stateKey] : null;

    if (state === null || state !== storedState) {
        res.redirect(`${domain}:${clientPort}?` +
            new URLSearchParams({
                error: 'state_mismatch'
            }).toString());
    } else {
        res.clearCookie(stateKey);

        let x = await fetch("https://accounts.spotify.com/api/token", {
            method: "POST",
            body: new URLSearchParams({
                code: code,
                redirect_uri: redirect_uri,
                grant_type: 'authorization_code'
            }),
            headers: {
                'Authorization': 'Basic ' + (Buffer.from(client_id + ':' + client_secret).toString('base64')),
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });

        if (!x.ok) {
            console.log("Error!");
            console.log(x.ok);

            res.redirect(`${domain}:${clientPort}?` + new URLSearchParams({ error: 'invalid_token' }).toString());
        }
        let data = await x.json();
        let access_token = data.access_token;
        let refresh_token = data.refresh_token;
        let expires_in = data.expires_in;

        // we can also pass the token to the browser to make requests from there
        res.redirect(`${domain}:${clientPort}?` +
            new URLSearchParams({
                access_token: access_token,
                refresh_token: refresh_token,
                expires: (expires_in * 1000) + Date.now()
            }).toString());
    }
});

app.get('/refresh_token', async (req, res) => {
    console.log("/refresh_token");
    // requesting access token from refresh token
    let refresh_token = req.query.refresh_token;

    let x = await fetch("https://accounts.spotify.com/api/token", {
        method: "POST",
        headers: {
            'Authorization': 'Basic ' + (Buffer.from(client_id + ':' + client_secret).toString('base64')),
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: refresh_token
        }),

    });
    let data = await x.json();

    if (x.ok) {
        let access_token = data.access_token;
        res.send({
            'access_token': access_token
        });
    } else {
        console.log("Error!");
        console.log(x);
    }
});

const options = {
    key: fs.readFileSync('/etc/letsencrypt/live/alexkleyn.de/privkey.pem'),
    cert: fs.readFileSync('/etc/letsencrypt/live/alexkleyn.de/fullchain.pem')
};
https.createServer(options, app).listen(port, host, () => {
    console.log(`Listening on Port ${port}!`);
});
// app.listen(port, host, () => {    
    // console.log(`Listening on Port ${port}!`);
// });