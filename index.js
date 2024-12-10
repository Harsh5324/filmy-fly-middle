const cluster = require("cluster");
const os = require("os");

if (cluster.isMaster) {
  // Get the number of CPU cores
  const numCPUs = os.cpus().length;

  console.log(`Master process is running. Forking ${numCPUs} workers...`);

  // Fork workers
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

  // Restart worker if it dies
  cluster.on("exit", (worker, code, signal) => {
    console.log(`Worker ${worker.process.pid} died. Spawning a new one...`);
    cluster.fork();
  });
} else {
  // Worker processes
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
        req?.headers?.["x-forwarded-for"] ||
        req?.connection?.remoteAddress ||
        "";

      const domains = ["www.filmywap.llc"];

      if (domains.includes(req.get("host")))
        return resp
          .status(301)
          .redirect(
            `${req.protocol}://${"www.filmy-wap.in"}${req.originalUrl}`
          );

      if (!referer)
        return resp.send(`
       <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>${req.get("host")}</title>
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
                    window.open(link.href, 'blank');
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

      // console.log({ ip, referer });

      const isCssFile = (url) => url.trim().toLowerCase().endsWith(".css");

      const nginxResponse = await axios({
        method: req.method,
        url: `http://127.0.0.1:81${req.url}`,
        headers: req.headers,
        data: req.body,
      });

      const contentType = nginxResponse?.headers?.["content-type"];

      console.log({ contentType, url: req.url });

      resp.setHeader(
        "Content-Type",
        isCssFile(req.url) ? "text/css" : contentType
      );

      resp.status(nginxResponse.status).send(nginxResponse.data);
    } catch (error) {
      resp.status(500).send("Internal Server Error");
    }
  });

  app.listen(80, () => {
    console.log(`Worker ${process.pid} listening on port 80`);
  });
}
