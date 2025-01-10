import { Client, Events, GatewayIntentBits, EmbedBuilder } from "discord.js";
import { registerNewUser, createNrcCode, getUserData, doesUserExist, deleteNrcCode } from "./database.js";
import config from "../config.json" with { type: "json" };
import consult from "./consult.js";

export default function startBot(){
    const client = new Client({ intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ] });

    client.once(Events.ClientReady, readyClient => {
        console.log(`Logging in as: ${readyClient.user.tag}`);
    });

    client.on('messageCreate', (message) => readMessage(message, client));

    client.login(config.token);
}

function readMessage(message, client){
    if(message.author.bot) return;

    if(!message.content.startsWith("!")) return;

    if(message.content.startsWith('!register')){
        processRegisterMessage(client, message.channel.id, message);
    } else if(message.content.startsWith('!code')){
        processAddCodeMessage(client, message.channel.id, message);
    } else if(message.content.startsWith("!delete")) {
        processDeleteCodeMessage(client, message.channel.id, message);
    } else if(message.content.startsWith('!help')){
        const embed = new EmbedBuilder();
        embed.setDescription(`
            For registering use: !register **campus code** **major code**\n
            For adding nrc codes to track use: !code **nrc code** **subject code**\n
            For deleting a code: !delete **nrc code**\n
            For seeing campus codes use: !campus\n
            For starting search: !start\n
            `);
        embed.setColor(0x00AE86);
        sendEmbedMessage(client, message.channel.id, embed);
    } else if(message.content.startsWith('!campus')){
        const embed = new EmbedBuilder();
        embed.setDescription(`
            CUCEA: C\n
            CUCEI: D\n
            CUCS: F\n        
        `)
        embed.setColor(0x00AE86);
        sendEmbedMessage(client, message.channel.id, embed);
    } else if(message.content.startsWith("!start")) {
        doConsults(client, message.channel.id, message.author.tag, message.author.id);
    } else {
        sendMessage(client, message.channel.id, "Use !help to see commands");
    }
}

function processAddCodeMessage(client, channelId, message){
    const args = message.content.split(" ").slice(1);

    if(args.length != 2){
        sendMessage(client, channelId, "Use: !code *nrc code* *subject code*");
        return;
    }

    const [nrc_code, subject_code] = args;

    createNrcCode(client, channelId, message.author.id, message.author.tag, nrc_code, subject_code);
}

function processDeleteCodeMessage(client, channelId, message){
    const args = message.content.split(" ").slice(1);

    if(args.length != 1){
        sendMessage(client, channelId, "Use: !delete *nrc code*");
        return;
    }

    const [nrc_code] = args;
    deleteNrcCode(client, channelId, message.author.id, nrc_code);
}

function processRegisterMessage(client, channelId, message){
    const args = message.content.split(" ").slice(1);

    if(args.length != 2){
        sendMessage(client, channelId, "Use: !register *campus code* *major code*");
        return;
    }

    const [campus_code, major_code] = args;
    
    registerNewUser(client, channelId, message.author.tag, message.author.id, campus_code, major_code);
}

export function sendMessage(client, channelId, message){
    const channel = client.channels.cache.get(channelId);
    channel.send(message);
}

export function sendEmbedMessage(client, channelId, embed){
    const channel = client.channels.cache.get(channelId);

    channel.send({ embeds: [embed] });
}

async function doConsults(client, channelId, username, user_id){
    let user = {
        username: null,
        user_id: null,
        campus_code: null,
        major_code: null,
        codes: [],
    }
    
    const exists = await doesUserExist(user_id);

    if(!exists){
        sendMessage(client, channelId, "Use !help to register");
        return;
    }

    if(exists == null){
        sendMessage(client, channelId, `There was an error checking if ${username} exists`);
        return;
    }

    const rows = await getUserData(user_id);

    if(!rows){
        sendMessage(client, channelId, "Use !help to see how to add codes to consult");
        return;
    }

    if(rows == null){
        sendMessage(client, channelId, "There was a problem getting the user data for consulting");
        return;
    }

    user.username = rows[0].username;
    user.user_id = rows[0].user_id;
    user.campus_code = rows[0].campus_code;
    user.major_code = rows[0].major_code;
    user.codes = rows.map(row => ({
        nrc_code: row.nrc_code,
        subject_code: row.subject_code,
    })).filter(row => row.nrc_code != null);

    if(user.codes.length == 0){
        sendMessage(client, channelId, "Add nrc codes with !code to start a search");
        return;
    }

    sendMessage(client, channelId, `Starting consult for codes: ${user.codes.map(code => code.nrc_code)}`);

    consult(client, channelId, user);
    setInterval(() => {consult(client, channelId, user)}, 30000);
}
