const express = require("express");
const axios = require("axios");
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(async (req, resp) => {
  try {
    const { referer } = req.headers;

    const fullUrl = `${req.protocol}://${req.get("host")}${req.originalUrl}`;

    const ip =
      req?.headers?.["x-forwarded-for"] || req?.connection?.remoteAddress || "";

    // referer && console.log({ ip, referer });

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
    <iframe id="iframe" src="${fullUrl}"></iframe>
    <script>
      const iframe = document.getElementById('iframe');

      iframe.addEventListener('load', () => {
        try {
          const iframeDocument = iframe.contentDocument || iframe.contentWindow.document;
          const links = iframeDocument.querySelectorAll('a');

          links.forEach((link) => {
            link.addEventListener('click', (event) => {
              event.preventDefault(); 
              window.open(link.href, '_blank');
            });
          });
        } catch (error) {
          console.error('Cross-origin restriction:', error.message);
        }
      });
    </script>
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
    // console.log(
    //   "🚀 ~ file: index.js:50 ~ app.use ~ error:",
    //   error?.message || error
    // );
    resp.status(500).send("Internal Server Error");
  }
});

app.listen(80);
