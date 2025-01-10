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
        processRegisterMessage(client, message);
    } else if(message.content.startsWith('!codes')){
        processViewCodesMessage(client, message);
    } else if(message.content.startsWith("!delete")) {
        processDeleteCodeMessage(client, message);
    } else if(message.content.startsWith("!code")){
        processAddCodeMessage(client, message);
    } else if(message.content.startsWith('!help')){
        sendHelpMessage(client, message.channel.id);
    } else if(message.content.startsWith('!campus')){
        sendCampusInfoMessage(client, message.channel.id);
    } else if(message.content.startsWith("!start")) {
        doConsults(client, message.channel.id, message.author.tag, message.author.id);
    } else {
        sendMessage(client, message.channel.id, "Use !help to see commands");
    }
}

function processAddCodeMessage(client, message){
    const args = message.content.split(" ").slice(1);

    if(args.length != 2){
        sendMessage(client, message.channel.id, "Use: !code *nrc code* *subject code*");
        return;
    }

    const [nrc_code, subject_code] = args;

    createNrcCode(client, message.channel.id, message.author.id, message.author.tag, nrc_code, subject_code);
}

function processDeleteCodeMessage(client, message){
    const args = message.content.split(" ").slice(1);

    if(args.length == 0){
        sendMessage(client, message.channel.id, "Use: !delete *nrc code*");
        return;
    }

    const nrc_codes = args;
    for(let i = 0; i < nrc_codes.length; i++){
        deleteNrcCode(client, message.channel.id, message.author.id, nrc_codes[i]);
    }
}

function processRegisterMessage(client, message){
    const args = message.content.split(" ").slice(1);

    if(args.length != 2){
        sendMessage(client, message.channel.id, "Use: !register *campus code* *major code*");
        return;
    }

    const [campus_code, major_code] = args;
    
    registerNewUser(client, message.channel.id, message.author.tag, message.author.id, campus_code, major_code);
}

async function processViewCodesMessage(client, message){
    const embed = new EmbedBuilder();
    const user = await getUserData(message.author.id);

    if(user.codes.length <= 0){
        sendMessage(client, message.channel.id, "You have no codes registered");
        return;
    }

    embed.setTitle(`Codes for user: ${message.author.tag}`);
    embed.setDescription(`
        nrc code: subject code\n
        ${user.codes.map(code => {return `${code.nrc_code}: ${code.subject_code}\n`})}
    `);
    embed.setColor(0x00AE86);
    sendEmbedMessage(client, message.channel.id, embed);
}

function sendHelpMessage(client, channelId){
    const embed = new EmbedBuilder();
    embed.setDescription(`
        For registering use: !register **campus code** **major code**\n
        For adding nrc codes to track use: !code **nrc code** **subject code**\n
        For deleting a code: !delete **nrc code**\n
        For viewing your codes: !codes\n
        For seeing campus codes use: !campus\n
        For starting search: !start\n
        `);
    embed.setColor(0x00AE86);
    sendEmbedMessage(client, channelId, embed);
}

function sendCampusInfoMessage(client, channelId){
    const embed = new EmbedBuilder();
    embed.setDescription(`
        CUCEA: C\n
        CUCEI: D\n
        CUCS: F\n        
    `)
    embed.setColor(0x00AE86);
    sendEmbedMessage(client, channelId, embed);
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
    const exists = await doesUserExist(user_id);

    if(!exists){
        sendMessage(client, channelId, "Use !help to register");
        return;
    }

    if(exists == null){
        sendMessage(client, channelId, `There was an error checking if ${username} exists`);
        return;
    }

    const user = await getUserData(user_id);

    if(!user){
        sendMessage(client, channelId, "Use !help to see how to add codes to consult");
        return;
    }

    if(user == null){
        sendMessage(client, channelId, "There was a problem getting the user data for consulting");
        return;
    }

    if(user.codes.length == 0){
        sendMessage(client, channelId, "Add nrc codes with !code to start a search");
        return;
    }

    sendMessage(client, channelId, `Starting consult for codes: ${user.codes.map(code => code.nrc_code)}`);

    consult(client, channelId, user);
    setInterval(() => {consult(client, channelId, user)}, 30000);
}
