const express = require("express");
const _path = require("path");
const fs = require("fs");

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/:path", (req, resp) => {
  const { path } = req.params;
  const data = fs.readFileSync(
    _path.join(__dirname, "files", path + ".txt"),
    "utf-8"
  );
  resp.send(JSON.parse(data));
});

app.listen(82);
