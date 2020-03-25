
const express = require('express');
// webpacks ssr
global.fetch = require('node-fetch');
const webpack = require('webpack');
// import ReactDOMServer from 'react-dom/server';
const requireFromString = require('require-from-string');
const MemoryFS = require('memory-fs');
const serverConfig = require('./config/development');
const fs = new MemoryFS();
//
const register = require('@react-ssr/express/register');
const session = require('express-session');
const bodyParser = require('body-parser');
const MongoStore = require('connect-mongo')(session);
const mongoose = require('mongoose');

const Database = require('./node_modules/lti-node-library/Provider/mongoDB/Database');
const { platformSchema, registerPlatform } = require('./node_modules/lti-node-library/Provider/register_platform');
const { create_oidc_response, create_unique_string } = require("./node_modules/lti-node-library/Provider/oidc");
const { launchTool } = require("./node_modules/lti-node-library/Provider/launch_validation");
const { tokenMaker } = require("./node_modules/lti-node-library/Provider/token_generator");
const { prep_send_score, send_score } = require("./node_modules/lti-node-library/Provider/student_score");
const path = require('path');
//Required Tool methods
const { grade_project } = require("./tool/grading_tool");

const config = {
    port: process.env.SERVER_PORT ? process.env.SERVER_PORT : 3000
};

const app = express();

// setup webpack stuff
const outputErrors = (err, stats) => {
    if (err) {
        console.error(err.stack || err);
        if (err.details) {
            console.error(err.details);
        }
        return;
    }

    const info = stats.toJson();
    if (stats.hasErrors()) {
        console.error(info.errors);
    }
    if (stats.hasWarnings()) {
        console.warn(info.warnings);
    }
};

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.text());
// this stuff worked but was limited in what we can do
// app.engine('html', require('ejs').renderFile);
// app.set('ejs-views', path.join(__dirname, 'ejs-views'));
// app.set('view engine', 'ejs');
// register(app).then(() => {});
/**
 * Setup MongoDB to store Platform data
 */
mongoose.connect(`mongodb://${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`, {
        useNewUrlParser: true,
        useUnifiedTopology: true
    },
    (err) => {
        if(err) {
            return console.log(err);
        }
    });
mongoose.Promise = Promise;


registerPlatform(
    'https://edconnect.moodlecloud.com',
    'moodle',
    'iutYJxJDXyAkamA',
    'https://edconnect.moodlecloud.com/mod/lti/auth.php',
    'https://edconnect.moodlecloud.com/mod/lti/token.php',
    'https://7d99a65a.ngrok.io/project/submit',
    { method: 'JWK_SET', key: 'https://edconnect.moodlecloud.com/mod/lti/certs.php'}
);

    // register `.jsx` or `.tsx` as a view template engine


app.get('/publickey/:name', async (req, res) => {
    let publicKey = await Database.GetKey(
        'platforms',
        platformSchema,
        { consumerName: req.params.name }
    );
    res.json({key: publicKey});
});

app.use(session({
    name: 'lti_v1p3_library',
    secret: 'secret',
    saveUninitialized: true,
    resave: true,
    secure: true,
    ephemeral: true,
    httpOnly: true,
    store: new MongoStore({ mongooseConnection: mongoose.connection }),
}));

/*
* Routes below are for OAuth, OIDC, and Token usage
*/

app.get('/oidc', (req, res) => {
    //TOOL:  OpenID Connect validation flow
    console.log(`GET /OIDC `);
    create_oidc_response(req, res);
});

// OIDC Login requests
app.post('/oidc', (req, res) => {
   console.log(`POST /OIDC Login requests`);
   create_oidc_response(req, res);
});

app.post("/oauth2/token", (req, res) => {
    //LIBRARY:  Route not currently being used
    console.log(`POST /oauth2/token`);
    tokenMaker(req, res);
});

app.post('auth_code', (req, res) => {
    console.log(`POST auth_code`);
    if(!req.body.error) {
        send_score(req, req.session.grade, 1);
        console.log(req.body);
    } else {
        res.status(401).send(`Access denied: ${req.params.error}`);
    }
});

/*
* Routes below are for running the Tool itself
*/

// Handle Tool Launches
//TOOL:  Validate and launch Tool
app.post('/project/submit', (req, res) => {
   console.log(`POST /project/submit`);
   launchTool(req, res, '/project/submit');
});

//TOOL:  Display the Project Submission page
app.get("/project/submit", (req, res) => {
    res.render("submit", {
        payload: req.session.payload,
        formData: req.body.formData
    });
});

//TOOL:  Grade the project and send the score if no errors; re-render Grading page.
app.post(`/project/grading`, (req, res) => {
    grade_project(req)
        .then(grading => {
            if (!grading.error) {
                req.session.grade = grading.grade;
                // const redir = prep_send_score(req);
                // res.redirect(307, redir);
            }
            res.render("submit", {
                payload: req.session.payload,
                formData: grading
            });
        });
});

//TOOL:  When user is done with Tool, return to Platform
app.post('/project/return', (req, res) => {
    console.log(`POST /project/return`);
   res.redirect(req.session.decoded_launch["https://purl.imsglobal.org/spec/lti/claim/launch_presentation"].return_url);
   req.session.destroy();
});

app.post('/', (req, res) => {
    res.send("<div>" +
        "<bold>hi from LTI TEST TOOL</bold>" +
        "<button>Create Group</button>" +
        "</div>");
    // const message = "THIS IS REACT!!!!";
    // res.render("index");

    // const app = ReactDOMServer.renderToString(<App />);

    // const indexFile = path.resolve('./build/index.html');
    // fs.readFile(indexFile, 'utf8', (err, data) => {
    //     if (err) {
    //         console.error('Something went wrong:', err);
    //         return res.status(500).send('Oops, better luck next time!');
    //     }
    //
    //     return res.send(
    //         data.replace('<div id="root"></div>', `<div id="root">${app}</div>`)
    //     );
    // });

});

app.listen(config.port, (err) => {
    if (err) {
        console.log(`error: ${err}`);
    }
    console.log(`Server Running on PORT: ${config.port}`);
});
