
import xpath from "xpath";
import { JSDOM } from "jsdom";
import { sendMessage } from "./bot.js";
import puppeteer from "puppeteer";

export default async function consult(client, channelId, user){
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    for(let i = 0; i < user.codes.length; i++){
        await page.goto("https://siiauescolar.siiau.udg.mx/wal/sspseca.forma_consulta");
        await page.select('select[name="ciclop"]', "202510");
        await page.select('select[name="cup"]', `${user.campus_code}`);
        await page.type('input[name="majrp"]', `${user.major_code}`);
        await page.type('input[name="crsep"]', `${user.codes[i].subject_code}`);
        await page.click('input[id="idConsultar"]');

        await page.waitForNavigation();
        const content = await page.content();
        const dom = new JSDOM(content);
        const document = dom.window.document;

        const table = document.querySelector("table");
        const table_body = table.querySelector("tbody");
        const table_rows = Array.from(table_body.querySelectorAll("tr"));
        
        //remove the two titles
        table_rows.splice(0, 2);  

        table_rows.forEach(table_row => {
            const table_row_elements = Array.from(table_row.children);
            const table_row_elements_array = Array.from(table_row_elements);
            if(table_row_elements_array[6] != undefined) console.log(table_row_elements_array[6].outerHTML);
            if(user.codes[i].nrc_code == table_row_elements_array[0].innerHTML && table_row_elements_array[6].innerHTML != 0){
                sendMessage(client, channelId, `Code: ${user.codes[i].nrc_code} has a spot available <@${user.user_id}>`);
            }
            
        });
    }

    await browser.close();
}