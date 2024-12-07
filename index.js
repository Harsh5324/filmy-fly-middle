const express = require("express");
const axios = require("axios");
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(async (req, resp) => {
  try {
    const { referer } = req.headers;

    if (!referer)
      return resp.send(`
    <!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>FilmyFly</title>
    <style>
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }

      iframe {
        width: 100%;
        height: 100vh;
        border: none;
        outline: none;
      }
    </style>
  </head>
  <body>
    <iframe src="${referer}"></iframe>
  </body>
</html>
    `);

    const nginxResponse = await axios({
      method: req.method,
      url: `http://127.0.0.1:81${req.url}`,
      headers: req.headers,
      data: req.body,
    });

    resp.status(nginxResponse.status).send(nginxResponse.data);
  } catch (error) {
    console.log("🚀 ~ file: index.js:50 ~ app.use ~ error:", error);
    resp.status(500).send("Internal Server Error");
  }
});

app.listen(80);
