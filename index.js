const cluster = require("cluster");
const os = require("os");
const express = require("express");
const axios = require("axios");

const isValidIP = (ip) => {
  const ipv4Regex =
    /^(25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9][0-9]|[0-9])\.(25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9][0-9]|[0-9])\.(25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9][0-9]|[0-9])\.(25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9][0-9]|[0-9])$/;
  const ipv6Regex =
    /^(?:[a-fA-F0-9]{1,4}:){7}[a-fA-F0-9]{1,4}$|^(?:[a-fA-F0-9]{1,4}:){1,7}:$|^:(?::[a-fA-F0-9]{1,4}){1,7}$|^(?:[a-fA-F0-9]{1,4}:){1,6}:[a-fA-F0-9]{1,4}$|^(?:[a-fA-F0-9]{1,4}:){1,5}(?::[a-fA-F0-9]{1,4}){1,2}$|^(?:[a-fA-F0-9]{1,4}:){1,4}(?::[a-fA-F0-9]{1,4}){1,3}$|^(?:[a-fA-F0-9]{1,4}:){1,3}(?::[a-fA-F0-9]{1,4}){1,4}$|^(?:[a-fA-F0-9]{1,4}:){1,2}(?::[a-fA-F0-9]{1,4}){1,5}$|^[a-fA-F0-9]{1,4}:((?::[a-fA-F0-9]{1,4}){1,6}|:)$|^(?::((:[a-fA-F0-9]{1,4}){1,7}|:))$/;

  return ipv4Regex.test(ip) || ipv6Regex.test(ip);
};

if (cluster.isMaster) {
  // Get the number of CPU cores
  const numCPUs = os.cpus().length;

  console.log(`Master process is running. Forking ${numCPUs} workers...`);

  // Fork workers
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

  let respawnCount = 0;
  const MAX_RESPAWNS = 25;

  cluster.on("exit", (worker, code, signal) => {
    console.log(
      `Worker ${worker.process.pid} died with code: ${code}, signal: ${signal}`
    );

    if (respawnCount < MAX_RESPAWNS) {
      console.log("Spawning a new worker...");
      cluster.fork();
      respawnCount++;
    } else {
      console.log("Max respawn attempts reached. Not spawning new workers.");
    }
  });
} else {
  // Worker processes
  const app = express();

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Main proxy route
  app.use(async (req, resp) => {
    try {
      const { referer } = req.headers;

      const fullUrl = `${req.protocol}://${req.get("host")}${req.originalUrl}`;

      const ip =
        req?.headers?.["x-forwarded-for"] ||
        req?.connection?.remoteAddress ||
        "";

      const domains = ["www.filmywap.llc"];

      // Redirect domain logic
      if (domains.includes(req.get("host"))) {
        return resp
          .status(301)
          .redirect(
            `${req.protocol}://${"www.filmy-wap.in"}${req.originalUrl}`
          );
      }

      //  console.log("Before", { url: fullUrl, host: req.headers.host });

      if (!isValidIP(ip) || req?.ip?.includes("ffff"))
        return resp.send("Invalid activity");

      if (!referer)
        return resp.send(`
        <!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${req.get("host")}</title>
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
iframe { width: 100%; height: 100vh; border: none; outline: none; }
</style>
</head>
<body>
<iframe id="iframe" src="${fullUrl}"></iframe>
<script>
const iframe = document.getElementById("iframe");
iframe.addEventListener("load", () => {
try {
const iframeDocument =
iframe.contentDocument || iframe.contentWindow.document;
const links = iframeDocument.querySelectorAll("a");
const meta = iframeDocument.querySelectorAll("meta");
const title = iframeDocument.querySelector("title")?.innerText;
if (title) document.title = title;
meta?.forEach((metaTag) => {
document?.head?.appendChild(metaTag?.cloneNode(true));
});
links.forEach((link) => {
link.addEventListener("click", (event) => {
event.preventDefault();
window.open(link.href, "_blank");
});
});
} catch (error) {
console.log("Cross-origin restriction:", error.message);
}
});
</script>
</body>
</html>
      `);

      console.log("After", { url: fullUrl, referer, ip: req.ip });

      const isCssFile = (url) => url.trim().toLowerCase().endsWith(".css");

      const nginxResponse = await axios({
        method: req.method,
        url: `http://127.0.0.1:81${req.url}`,
        headers: req.headers,
        data: req.body,
        timeout: 5000,
      });

      const contentType = nginxResponse?.headers?.["content-type"];

      resp.setHeader(
        "Content-Type",
        isCssFile(req.url) ? "text/css" : contentType
      );

      resp.status(nginxResponse.status).send(nginxResponse.data);
    } catch (error) {
      console.log("🚀 ~ file: index.js:131 ~ app.use ~ error:", error?.message);
      resp.status(500).send("Internal Server Error");
    }
  });

  setInterval(() => {
    const memoryUsage = process.memoryUsage();
    const memoryLimit = 500 * 1024 * 1024;

    if (memoryUsage.rss > memoryLimit) {
      console.warn(
        `Worker ${process.pid} exceeding memory limit: ${memoryUsage.rss}`
      );
      process.exit(1);
    }
  }, 60000);

  app.listen(80);

  process.on("uncaughtException", (err) => {
    console.log(`Worker ${process.pid} encountered an error:`, err);
    process.exit(1); // Graceful exit
  });

  process.on("unhandledRejection", (reason, promise) => {
    console.log(
      `Unhandled rejection in Worker ${process.pid}:`,
      promise,
      "Reason:",
      reason
    );
  });
}
