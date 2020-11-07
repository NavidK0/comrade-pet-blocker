import {Client} from 'discord.js';
import {config} from "../data/config";
import * as fs from "fs";
import got from "got";
import {promisify} from "util";
import stream from "stream";

const pipeline = promisify(stream.pipeline);
const compareImages = require("resemblejs/compareImages");

/**
 * The Image Listener listens for messages containing blocked emojis and images.
 */
export class ImageListener {
    client: Client;

    constructor(client: Client) {
        this.client = client;
    }

    /**
     * Setup the listener.
     */
    setup() {
        this.client.on('message', async message => {
            let blockMessage = false;

            // First we check for blocked words
            for (let blockEmoji of config.blockEmojis) {
                if (message.content.toLowerCase().includes(blockEmoji)) {
                    blockMessage = true;
                }
            }

            // If the message wasn't already blocked, now we begin the fun part
            if (!blockMessage) {

                // MATCH IT ALL BOIS
                let matches = [...message.content.matchAll(/<a:.+?:\d+>|<:.+?:\d+>/g)];
                let fileCache: string[] = [];

                for (let match of matches) {
                    let id = match[0].match(/\d+/g);

                    if (id) {
                        let path = `${config.cacheDir}/${id}.png`;
                        await this.cacheEmoji(id[0]);

                        if (!fileCache.includes(path))
                            fileCache.push(path);
                    }
                }

                // Check for images uploaded
                for (let attachment of message.attachments) {
                    let url: string = attachment[1].url;

                    if (url.includes(".gif") || url.includes(".png") || url.includes(".jpeg") || url.includes(".jpg")) {
                        let filename = url.substring(url.lastIndexOf('/') + 1);
                        let path = `${config.cacheDir}/${filename}`;
                        await this.cacheImage(url);

                        if (!fileCache.includes(path))
                            fileCache.push(path);
                    }
                }

                let strings = fs.readdirSync(config.bannedDir);

                // Match the images to the banned list of images
                breakLoop:
                    for (let blocked of strings) {
                        blocked = `${config.bannedDir}/${blocked}`;

                        for (let emoji of fileCache) {
                            let comparison = await this.diffImages(blocked, emoji);
                            if (comparison.rawMisMatchPercentage <= 20) {
                                blockMessage = true;
                                console.log(`Blocking message: ${message.content}, matchedPercentage: ${comparison.rawMisMatchPercentage}`)

                                break breakLoop;
                            }
                        }
                    }
            }

            // REK 'EM
            if (blockMessage) {
                await message.delete();

                let item = config.language.successfulBlock[Math.floor(Math.random() * config.language.successfulBlock.length)];
                let replyMessage = await message.reply(item);

                await replyMessage.delete({timeout: 5000});
            }
        });
    }

    /**
     * Compare two images.
     * @param a: first image
     * @param b: second image
     */
    async diffImages(a: string, b: string): Promise<any> {
        const options = {
            output: {
                errorColor: {
                    red: 255,
                    green: 0,
                    blue: 255
                },
                errorType: "movement",
                transparency: 0.3,
                largeImageThreshold: 1200,
                useCrossOrigin: false,
                outputDiff: true
            },
            scaleToSameSize: true,
            ignore: "antialiasing"
        };

        // The parameters can be Node Buffers
        // data is the same as usual with an additional getBuffer() function
        return compareImages(
            await fs.readFileSync(a),
            await fs.readFileSync(b),
            options
        );
    }

    /**
     * Cache an emoji image.
     * @param id
     */
    async cacheEmoji(id: string) {
        let url = `https://cdn.discordapp.com/emojis/${id}.png`;
        let path = `${config.cacheDir}/${id}.png`;

        await pipeline(
            got.stream(url),
            fs.createWriteStream(path)
        );
    }

    /**
     * Cache a file upload.
     * @param url
     */
    async cacheImage(url: string) {
        let filename = url.substring(url.lastIndexOf('/') + 1);
        let path = `${config.cacheDir}/${filename}`;

        await pipeline(
            got.stream(url),
            fs.createWriteStream(path)
        );
    }
}