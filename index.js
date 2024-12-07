const fs = require("fs");
const express = require("express");
const axios = require("axios");
const path = require("path");
const app = express();

const LOG_FILE = path.join(__dirname, "files", "logs.txt");
const IPS_FILE = path.join(__dirname, "files", "ips.txt");

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const isValidIPv4 = (ip) => {
  const ipv4Regex =
    /^(25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9][0-9]|[0-9])\.(25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9][0-9]|[0-9])\.(25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9][0-9]|[0-9])\.(25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9][0-9]|[0-9])$/;

  return ipv4Regex.test(ip);
};

app.use(async (req, res, next) => {
  const ip = req.headers["x-forwarded-for"] || req.connection.remoteAddress;

  if (!isValidIPv4(ip) && req.url.split("").length > 36)
    return res.send("Internal Server Error");

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

  next();
});

app.use(async (req, res) => {
  try {
    const nginxResponse = await axios({
      method: req.method,
      url: `http://127.0.0.1:81${req.url}`,
      headers: req.headers,
      data: req.body,
    });

    res.status(nginxResponse.status).send(nginxResponse.data);
  } catch (error) {
    console.log("Error forwarding request to Nginx:", error.message);
    res.status(500).send("Error forwarding request to Nginx");
  }
});

app.listen(80);
