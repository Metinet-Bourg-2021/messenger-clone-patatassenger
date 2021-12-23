require('dotenv/config');
const express = require("express");
const userController = require("./controllers/userController");
const messageController = require("./controllers/messageController");
const conversationController = require("./controllers/conversationController");
const UserSchema = require('./models/userSchema');
const http = require("http");
const { Server } = require("socket.io");
const mongoose = require('mongoose');
const { response } = require('express');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });
const allSockets = [];
let sizeUsersAvailable = 0;

mongoose.connect(process.env.DB_ADDRESS);

server.listen(process.env.PORT, () => {
    console.log("Server is listening on", parseInt(process.env.PORT));
});

// Pour chaque sockets, envoie la liste des utilisateurs connectés et vérifie chaque 0,5 secondes
setInterval(async () => {
    const usersAvailable = [];
    for (let socketUser of allSockets) {
        let user = await UserSchema.findOne({username : socketUser.name});
        
        if (user) {
            // Au bout de 2min sans activité, considère l'utilisateur comme déconnecté
            let lastActivity = new Date(user.last_activity_at);
            lastActivity.setMinutes(lastActivity.getMinutes() + 2);

            if(lastActivity > new Date()) {
                usersAvailable.push(user.username)
            }
        }
    }
    // Si la taille du nombre d'utilisateur est différente, alors envoie l'évènement usersAvailable
    if(usersAvailable.length !== sizeUsersAvailable) {
        sizeUsersAvailable = usersAvailable.length;
        for (let socketUser of allSockets) {
            socketUser.socket.emit("@usersAvailable", { usernames : usersAvailable });
        }
    }
}, 500);

/**
 * 
 * TESTS POUR PROJET POSTMAN
 * 
 */
app.use(express.json())

function callbackPost({code, data}){ 
    return({code, data});
}

app.get("/", (req, res) => {
    res.send("Test controlleurs");
});
app.post("/", async (req, res) => {
    let responses = {};

    /* Exemple de body à envoyer
    {
        "username" : "Patata",
        "password" : "patata"
    }
    */
    let authenticate = userController.authenticate({ username : req.body.username, password : req.body.password }, callbackPost, allSockets);
    await authenticate.then(response => {
        responses.authenticate = response;
    })

    let getUsers = userController.getUsers({ token: responses.authenticate.data.token }, callbackPost, allSockets);
    await getUsers.then(response => {
        responses.getUsers = response;
    })
    res.json({responses});
});