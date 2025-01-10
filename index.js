import startBot from "./source/bot.js";
import startDatabase from "./source/database.js";

function startMain(){
    startDatabase();
    startBot();
}

startMain();