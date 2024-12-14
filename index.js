const cluster = require("cluster");
const os = require("os");
const express = require("express");
const rateLimit = require("express-rate-limit");
const axios = require("axios");
const ip = require("ip");

const isCssFile = (url) => url.trim().toLowerCase().endsWith(".css");

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(async (req, resp) => {
  try {
    const { referer, origin } = req.headers;

    const fullUrl = `${req.protocol}://${req.get("host")}${req.originalUrl}`;

    const ip =
      req?.headers?.["x-forwarded-for"] || req?.connection?.remoteAddress || "";

    const domains = ["www.filmywap.llc"];

    if (domains.includes(req.get("host"))) {
      return resp
        .status(301)
        .redirect(`${req.protocol}://${"www.filmy-wap.in"}${req.originalUrl}`);
    }

    if (!origin || origin == "https://botdrivea.filesdl.in")
      return resp.send("Invalid activity");

    if (!referer)
      // if (!isValidIP(ip)) return resp.send("Invalid activity");

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

    console.log("After", {
      url: fullUrl,
      referer,
      ip,
      origin: req.headers.origin,
      userAgent: req.headers["user-agent"],
    });

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
