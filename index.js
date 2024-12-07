const fs = require("fs");
const express = require("express");
const axios = require("axios");
const path = require("path");
const app = express();

const LOG_FILE = path.join(__dirname, "files", "logs.txt");
const IPS_FILE = path.join(__dirname, "files", "ips.txt");

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const isValidIP = (ip) => {
  const ipv4Regex =
    /^(25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9][0-9]|[0-9])\.(25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9][0-9]|[0-9])\.(25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9][0-9]|[0-9])\.(25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9][0-9]|[0-9])$/;
  const ipv6Regex =
    /^(?:[a-fA-F0-9]{1,4}:){7}[a-fA-F0-9]{1,4}$|^(?:[a-fA-F0-9]{1,4}:){1,7}:$|^:(?::[a-fA-F0-9]{1,4}){1,7}$|^(?:[a-fA-F0-9]{1,4}:){1,6}:[a-fA-F0-9]{1,4}$|^(?:[a-fA-F0-9]{1,4}:){1,5}(?::[a-fA-F0-9]{1,4}){1,2}$|^(?:[a-fA-F0-9]{1,4}:){1,4}(?::[a-fA-F0-9]{1,4}){1,3}$|^(?:[a-fA-F0-9]{1,4}:){1,3}(?::[a-fA-F0-9]{1,4}){1,4}$|^(?:[a-fA-F0-9]{1,4}:){1,2}(?::[a-fA-F0-9]{1,4}){1,5}$|^[a-fA-F0-9]{1,4}:((?::[a-fA-F0-9]{1,4}){1,6}|:)$|^(?::((:[a-fA-F0-9]{1,4}){1,7}|:))$/;

  return ipv4Regex.test(ip) || ipv6Regex.test(ip);
};

app.use(async (req, res, next) => {
  try {
    const ip =
      req?.headers?.["x-forwarded-for"] || req?.connection?.remoteAddress || "";

    // if (ip != "103.161.98.228") return res.send("Site under maintenance");

    const cats = [
      "bollywood-movies",
      "hollywood-movies-in-english",
      "south-indian-hindi-dubbed-movies",
      "punjabi-movies",
      "animation-movies",
      "web-series",
    ];

    if (
      req.url.includes("cat-page") &&
      !cats.includes(req.url.match(/\/cat-page\/(.*)\.html/)?.[1])
    )
      return res.send("Invalid activity");

    if (
      !isValidIP(ip) ||
      req.url.split("").length > 70 ||
      ip == "2001:16a2:f99d:3a00:2176:89ae:129f:c7d2" ||
      req.url.split("/").length > 4
    ) {
      return res.send("Internal Server Error");
    }

    console.log("success", { ip, url: req.url });

    const logData = {
      ip,
      method: req.method,
      url: req.url,
      headers: req.headers,
      body: req.body,
      timestamp: new Date().toString(),
    };

    let logs = [],
      ips = {};

    if (fs.existsSync(LOG_FILE)) {
      const data = fs.readFileSync(LOG_FILE, "utf-8");
      logs = JSON.parse(data);
    }

    if (fs.existsSync(IPS_FILE)) {
      const data = fs.readFileSync(IPS_FILE, "utf-8");
      ips = JSON.parse(data);
    }

    ips[ip] = (ips[ip] || 0) + 1;

    logs.push(logData);

    fs.writeFileSync(LOG_FILE, JSON.stringify(logs, null));
    fs.writeFileSync(IPS_FILE, JSON.stringify(ips, null));

    try {
      const nginxResponse = await axios({
        method: req.method,
        url: `http://127.0.0.1:81${req.url}`,
        headers: req.headers,
        data: req.body,
      });

      res.status(nginxResponse.status).send(nginxResponse.data);
    } catch (error) {
      // console.log("Error forwarding request to Nginx:", error.message, req.url);
      res.status(500).send("Error forwarding request to Nginx");
    }
  } catch (err) {
    console.error("Error processing request:", err.message);
    res.send("Something went wrong");
  }
});

app.listen(80);
