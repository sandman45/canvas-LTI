const express = require('express');
const bodyParser = require('body-parser');

const app = express();

const config = {
    port: 3000
};

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.post('/test', (req, res, next) => {
   console.log(`${req.body}`);
   res.send("ok");
});


app.listen(config.port, (err) => {
    if (err) {
        console.log(`error: ${err}`);
    }
    console.log(`Server Running on PORT: ${config.port}`);
});
