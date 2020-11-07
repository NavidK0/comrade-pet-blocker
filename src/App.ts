import {ImageListener} from "./listeners/image-listener";
import {Client} from "discord.js";
import {config} from "./data/config";

let client = new Client();
let imageListener = new ImageListener(client);

start().then(() => {
    console.log("Pet Blocker is ready, comrade.");
});

async function start() {
    await client.login(config.token);
    console.log("Logged in successfully.")

    imageListener.setup();
}