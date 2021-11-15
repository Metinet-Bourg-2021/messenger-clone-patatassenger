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
const allSockets = [];


async function test(){

const picture_url = require('./services/pictures');
mongoose.connect(process.env.DB_ADDRESS);
picture = picture_url.getRandomURL();

const User = require('./models/UserSchema');
    const userTest = new User({
        username: "Admin",
        password: "Admin123",
        picture_url: picture,
        last_activity_at: new Date()
    });
    /*userTest.save(function (err) {
        if (err) {
            console.log("Error while saving data: " + err);
            return;
        }
    });*/

    const allUsers = await User.find().exec();

    const Conversation = require('./models/ConversationSchema');
    const conversationTest = new Conversation({
        name: "Ma nouvelle conversation",
        type: "one_to_one",
        participants: allUsers,
        messages: null,
        theme: "BLUE",
        updated_at: new Date(),
        seen: null
    });
    /*conversationTest.save(function (err) {
        if (err) {
            console.log("Error while saving data: " + err);
            return;
        }
    });*/

    const allConversations = await Conversation.find().exec();

    const Message = require('./models/MessageSchema');
    const messageTest = new Message({
        from: userTest.username,
        content: "Voici mon message",
        posted_at: new Date(),
        conversation_id: conversationTest._id
    });
    /*messageTest.save(function (err) {
        if (err) {
            console.log("Error while saving data: " + err);
            return;
        }
    });*/

    const allMessages = await Message.find().exec();

}

test();


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