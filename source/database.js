import sqlite3 from "sqlite3";
import { sendMessage } from "./bot.js";

const db = new sqlite3.Database("./db.sqlite3");

export default function startDatabase(){
    db.run(`CREATE TABLE IF NOT EXISTS users (
        user_id TEXT UNIQUE PRIMARY KEY NOT NULL,
        username TEXT UNIQUE NOT NULL,
        campus_code TEXT NOT NULL,
        major_code TEXT NOT NULL
    );`);

    db.run(`CREATE TABLE IF NOT EXISTS nrc_codes(
        user_id TEXT NOT NULL,
        nrc_code INTEGER UNIQUE NOT NULL,
        subject_code TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE
    );`);
}

export function doesUserExist(user_id) {
    return new Promise((resolve, reject) => {
        db.get(`SELECT user_id FROM users WHERE user_id = ?;`, [user_id], (err, row) => {
            if (err) {
                console.error("Error running query: ", err);
                reject(err);
            } else {
                resolve(!!row); // Resolve with true if user exists, false otherwise
            }
        });
    });
}

export function getUserData(user_id) {
    return new Promise((resolve, reject) => {
        db.all(
            `SELECT users.*, nrc_codes.nrc_code, nrc_codes.subject_code 
             FROM users 
             LEFT JOIN nrc_codes ON users.user_id = nrc_codes.user_id 
             WHERE users.user_id = ?`,
            [user_id],
            (err, rows) => {
                if (err) {
                    console.error("Error running query: ", err);
                    reject(err);
                } else {
                    let user = {
                        username: null,
                        user_id: null,
                        campus_code: null,
                        major_code: null,
                        codes: [],
                    }
                    user.username = rows[0].username;
                    user.user_id = rows[0].user_id;
                    user.campus_code = rows[0].campus_code;
                    user.major_code = rows[0].major_code;
                    user.codes = rows.map(row => ({
                        nrc_code: row.nrc_code,
                        subject_code: row.subject_code,
                    })).filter(row => row.nrc_code != null);
                    resolve(user);
                }
            }
        );
    });
}

export async function registerNewUser(client, channelId, username, user_id, campus_code, major_code){
    const exists = await doesUserExist(user_id);
    if(exists){
        sendMessage(client, channelId, "You are already registered");
        return;
    }

    if(exists == null){
        sendMessage(client, channelId, "There was an error checking the register");
        return;
    }

    db.run(`INSERT INTO users (username, user_id, campus_code, major_code) VALUES (?, ?, ?, ?);`, [username, user_id, campus_code, major_code],
        (err) => {
            if (err){
                console.error("Error creating new user: ", err.message);
                sendMessage(client, channelId, `Error creating register for user: ${username}`);
            } else {
                sendMessage(client, channelId, `Created register for user: ${username}`);
            }
        }
    );
}

export async function createNrcCode(client, channelId, user_id, username, nrc_code, subject_code){
    const exists = await doesUserExist(user_id);

    if(!exists){
        sendMessage(client, channelId, "Use !help for how to register");
        return;
    }

    if(exists == null){
        sendMessage(client, channelId, `There was a problem checking if ${username} already exists`);
        return;
    }

    db.run(`INSERT INTO nrc_codes (user_id, nrc_code, subject_code) VALUES (?, ?, ?);`, [user_id, nrc_code, subject_code],
        (err) => {
            if(err){
                console.error("Error inserting code: ", err.message);
                sendMessage(client, channelId, `There was an error adding the nrc code: ${nrc_code} with subject code: ${subject_code} to ${username}`);
            } else {
                sendMessage(client, channelId, "Code successfully added");
            }
        }
    )
}

export async function deleteNrcCode(client, channelId, user_id, nrc_code){
    const exists = await doesUserExist(user_id);

    if(!exists){
        sendMessage(client, channelId, "You aren't registered, use !help to register");
        return;
    }

    if(exists == null){
        sendMessage(client, channelId, "There was an error looking for you in the database");
        return;
    }

    db.run(`DELETE FROM nrc_codes where nrc_code = ?;`, [nrc_code], 
        (err) => {
            if(err){
                console.err("Error running query: ", err);
            } else {
                sendMessage(client, channelId, "nrc_code successfully deleted");
            }
        }
    )
}