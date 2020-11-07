import * as fs from "fs";

export let config = require("../config.json");

// Clean up cache dir
if (fs.existsSync(config.cacheDir))
    fs.rmdirSync(config.cacheDir, {recursive: true})

fs.mkdirSync(config.cacheDir);

if (!fs.existsSync(config.bannedDir))
    fs.mkdirSync(config.bannedDir);