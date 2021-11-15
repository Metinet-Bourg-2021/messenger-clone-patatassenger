require('dotenv/config');
const express = require("express");
const app = express();
const http = require("http");
const server = http.createServer(app);
const { Server } = require("socket.io");
const mongoose = require('mongoose');

const io = new Server(server, { cors: { origin: "*" } });
const controller = require("./controllers/userController");
const allSockets = [];

mongoose.connect(process.env.DB_ADRESS);

app.get("/", (req, res) => {
    res.send("A utiliser pour du debug si vous avez besoin...");
});

server.listen(process.env.PORT, () => {
    console.log("Server is listening on", parseInt(process.env.PORT));
});

io.on("connection", socket => {
    //Penser a conserver le socket pour pouvoir s'en servir plus tard
    //Remplacer les callbacks par des fonctions dans d'autres fichiers.

    socket.on("@authenticate", ({ username, password }, callback) => { 

        if(!allSockets.find(element => element.socket === socket))
            allSockets.push({name : username, socket : socket});
        
        controller.authenticate({ username, password }, callback);
    });
    socket.on("@getUsers", ({ token }, callback) => { controller.getUsers({ token }, callback); });

    socket.on("@getOrCreateOneToOneConversation", ({token, username}, callback) => { controller.getOrCreateOneToOneConversation({ token, username }, callback);  });
    socket.on("@createManyToManyConversation", ({token, usernames}, callback) => { controller.createManyToManyConversation({ token, usernames }, callback); });
    socket.on("@getConversations", ({token}, callback) => { controller.getConversations({ token }, callback); });
    
    socket.on("@postMessage", ({token, conversation_id, content}, callback) => { controller.postMessage({ token, conversation_id, content }, callback); });
    socket.on("@seeConversation", ({token, conversation_id, message_id}, callback) => { controller.seeConversation({ token, conversation_id, message_id }, callback); });
    socket.on("@replyMessage", ({token, conversation_id, message_id, content}, callback) => { controller.replyMessage({ token, conversation_id, message_id, content }, callback); });
    socket.on("@editMessage", ({token, conversation_id, message_id, content}, callback) => { controller.editMessage({ token, conversation_id, message_id, content }, callback); });
    socket.on("@reactMessage", ({token, conversation_id, message_id, reaction}, callback) => { controller.reactMessage({ token, conversation_id, message_id, reaction }, callback); });
    socket.on("@deleteMessage", ({token, conversation_id, message_id, content}, callback) => { controller.deleteMessage({ token, conversation_id, message_id, content }, callback); });
    
    socket.on("disconnect", (reason) =>{ 
        let index = allSockets.findIndex(element => element.socket === socket);
        
        if(index !== -1) {
            console.log('Déconnexion : ', reason, allSockets[index].name);
            allSockets.splice(index, 1);
        }
     });
});

// Addresse du serveur démo: wss://teach-vue-chat-server.glitch.me