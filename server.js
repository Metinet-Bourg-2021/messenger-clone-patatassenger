require('dotenv/config');
const express = require("express");
const app = express();
const http = require("http");
const server = http.createServer(app);
const { Server } = require("socket.io");
const mongoose = require('mongoose');

const io = new Server(server, { cors: { origin: "*" } });
const userController = require("./controllers/userController");
const messageController = require("./controllers/messageController");
const conversationController = require("./controllers/conversationController");
const UserSchema = require('./models/userSchema');
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

io.on("connection", socket => {
    socket.on("@authenticate", ({ username, password }, callback) => {

        if (!allSockets.find(element => element.socket === socket))
            allSockets.push({ name: username, socket: socket });
        userController.authenticate({ username, password }, callback, allSockets);
    });
    socket.on("@getUsers", ({ token }, callback) => {
        userController.getUsers({ token }, callback, allSockets);
    });

    socket.on("@getOrCreateOneToOneConversation", ({ token, username }, callback) => {
        conversationController.getOrCreateOneToOneConversation({ token, username }, callback, allSockets);
    });
    socket.on("@createManyToManyConversation", ({ token, usernames }, callback) => {
        conversationController.createManyToManyConversation({ token, usernames }, callback, allSockets);
    });
    socket.on("@getConversations", ({ token }, callback) => {
        conversationController.getConversations({ token }, callback);
    });
    socket.on("@seeConversation", ({ token, conversation_id, message_id }, callback) => {
        conversationController.seeConversation({ token, conversation_id, message_id }, callback, allSockets);
    });

    socket.on("@postMessage", ({ token, conversation_id, content }, callback) => {
        messageController.postMessage({ token, conversation_id, content }, callback, allSockets);
    });
    socket.on("@replyMessage", ({ token, conversation_id, message_id, content }, callback) => {
        messageController.replyMessage({ token, conversation_id, message_id, content }, callback, allSockets);
    });
    socket.on("@editMessage", ({ token, conversation_id, message_id, content }, callback) => {
        messageController.editMessage({ token, conversation_id, message_id, content }, callback, allSockets);
    });
    socket.on("@reactMessage", ({ token, conversation_id, message_id, reaction }, callback) => {
        messageController.reactMessage({ token, conversation_id, message_id, reaction }, callback, allSockets);
    });
    socket.on("@deleteMessage", ({ token, conversation_id, message_id, content }, callback) => {
        messageController.deleteMessage({ token, conversation_id, message_id, content }, callback, allSockets);
    });

    socket.on("disconnect", async(reason) => {
        let index = allSockets.findIndex(element => element.socket === socket);

        if (index !== -1) {
            //await userController.disconnect(allSockets[index].name);
            console.log('Déconnexion : ', allSockets[index].name, reason);
            allSockets.splice(index, 1);
        }
    });
});

// Addresse du serveur démo: wss://teach-vue-chat-server.glitch.me