require('dotenv/config');
const express = require("express");
const app = express();
const http = require("http");
const server = http.createServer(app);
const {
    Server
} = require("socket.io");
const mongoose = require('mongoose');

const io = new Server(server, {
    cors: {
        origin: "*"
    }
});


/*async function patata() {
    mongoose.connect(process.env.DB_ADDRESS);

    const User = require('./models/UserSchema');

    const userTest = new User({
        name: "UserTest",
        password: "MonMdp789"
    });

    userTest.save(function (err) {
        if (err) {
            console.log("Error while saving data: " + err);
            return;
        }
    });

    let allUsers = await User.find().exec();

    require('./models/MessageSchema');
    const Message = mongoose.model('MessageSchema', mongoose.Schema.Types.Message);
    const messageTest = new Message({
        from: "Admin",
        content: "Voici mon troisième message"
    });

    messageTest.save(function (err) {
        if (err) {
            console.log("Error while saving data: " + err);
            return;
        }
    });

    let allMessages = await Message.find().exec();

    require('./models/ConversationSchema');
    const Conversation = mongoose.model('ConversationSchema', mongoose.Schema.Types.Conversation);
    const conversationTest = new Conversation({
        name: "Deuxième nouvelle conversation",
        type: "many_to_many",
        participants: allUsers,
        messages: allMessages
    });

    conversationTest.save(function (err) {
        if (err) {
            console.log("Error while saving data: " + err);
            return;
        }
    });

    let names = [];

    conversationTest.participants.forEach(async participant => {
        console.log("Participant : " + participant);
        let userName = await User.findById(participant);
        names += userName.name;
        console.log({names});
    });
}

patata();*/



app.get("/", (req, res) => {
    res.send("A utiliser pour du debug si vous avez besoin...");
});

server.listen(process.env.PORT, () => {
    console.log("Server is listening");
});

io.on("connection", socket => {
    //Penser a conserver le socket pour pouvoir s'en servir plus tard
    //Remplacer les callbacks par des fonctions dans d'autres fichiers.

    socket.on("@authenticate", ({
        username,
        password
    }, callback) => {
        callback({
            code: "SUCCESS",
            data: {}
        });
    }); //callback remplace le emit

    socket.on("@getUsers", ({
        token
    }, callback) => {
        callback({
            code: "SUCCESS",
            data: {}
        });
    });
    socket.on("@getOrCreateOneToOneConversation", ({
        token,
        username
    }, callback) => {
        callback({
            code: "SUCCESS",
            data: {}
        });
    });
    socket.on("@createManyToManyConversation", ({
        token,
        usernames
    }, callback) => {
        callback({
            code: "SUCCESS",
            data: {}
        });
    });
    socket.on("@getConversations", ({
        token
    }, callback) => {
        callback({
            code: "SUCCESS",
            data: {}
        });
    });

    socket.on("@postMessage", ({
        token,
        conversation_id,
        content
    }, callback) => {
        callback({
            code: "SUCCESS",
            data: {}
        });
    });
    socket.on("@seeConversation", ({
        token,
        conversation_id,
        message_id
    }, callback) => {
        callback({
            code: "SUCCESS",
            data: {}
        });
    });
    socket.on("@replyMessage", ({
        token,
        conversation_id,
        message_id,
        content
    }, callback) => {
        callback({
            code: "SUCCESS",
            data: {}
        });
    });
    socket.on("@editMessage", ({
        token,
        conversation_id,
        message_id,
        content
    }, callback) => {
        callback({
            code: "SUCCESS",
            data: {}
        });
    });
    socket.on("@reactMessage", ({
        token,
        conversation_id,
        message_id,
        reaction
    }, callback) => {
        callback({
            code: "SUCCESS",
            data: {}
        });
    });
    socket.on("@deleteMessage", ({
        token,
        conversation_id,
        message_id,
        content
    }, callback) => {
        callback({
            code: "SUCCESS",
            data: {}
        });
    });

    socket.on("disconnect", (reason) => {});
});

// Addresse du serveur démo: wss://teach-vue-chat-server.glitch.me