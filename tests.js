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
const req = require('express/lib/request');

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

    // test userController
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

    /* Exemple de body à envoyer
    {
        "users": [
            {"username": "Patata", "picture_url":"https://patataestlaplusbelle", "awake": true},
            ...
        ]
    }
    */
    let getUsers = userController.getUsers({ token: responses.authenticate.data.token }, callbackPost, allSockets);
    await getUsers.then(response => {
        responses.getUsers = response;
    })

    // test messageController
    /* Exemple de body à envoyer
    {
        "message": {
            "id":42,
            "from":"Patata",
            "content": "Aimes tu les patates ?",
            "posted_at": "2021-12-24T00:42:00",
            "delivered_to": ["Camille": "2021-12-24T00:42:00", ...],
            "reply_to": null,
            "edited": false,
            "deleted": false,
            "reactions": {}
        }
    }
    */
    let postMessage = messageController.postMessage({ token : responses.authenticate.data.token, conversation_id:req.body.conversation_id, content:req.body.content }, callbackPost, allSockets)
    await postMessage.then(response=>{
        response.postMessage=response;
    });

    /* Exemple de body à envoyer
    {
        "message": {
            "id":43,
            "from":"Camille",
            "content": "Oui j'adore ca !",
            "posted_at": "2021-12-24T00:43:00",
            "delivered_to": ["Camille": "2021-12-24T00:43:00", ...],
            "reply_to": ["id":"42", ...],
            "edited": false,
            "deleted": false,
            "reactions": {}
        }
    }
    */
    let replyMessage = messageController.replyMessage({ token : responses.authenticate.data.token, conversation_id:req.body.conversation_id, message_id:req.body.message_id, content:req.body.content }, callbackPost, allSockets)
    await replyMessage.then(response=>{
        response.replyMessage=response;
    });

    /* Exemple de body à envoyer
    {

    }
    */
    let editMessage = messageController.editMessage({ token : responses.authenticate.data.token, conversation_id:req.body.conversation_id, message_id:req.body.message_id, content:req.body.content }, callbackPost, allSockets)
    await editMessage.then(response=>{
        response.editMessage=response;
    });
    
    /* Exemple de body à envoyer
    {
        
    }
    */
    let reactMessage = messageController.reactMessage({ token : responses.authenticate.data.token, conversation_id:req.body.conversation_id, message_id:req.body.message_id, reaction:req.body.reaction }, callbackPost, allSockets)
    await reactMessage.then(response=>{
        response.reactMessage=response;
    });

    /* Exemple de body à envoyer
    {

    }
    */
    let deleteMessage = messageController.deleteMessage({ token : responses.authenticate.data.token, conversation_id:req.body.conversation_id, message_id:req.body.message_id, content:req.body.content }, callbackPost, allSockets)
    await deleteMessage.then(response=>{
        response.deleteMessage=response;
    });


    // test conversationController
    /* Exemple de body à envoyer
    {
        "conversation": {
            "id":3,
            "type":"one_to_one",
            "participants": ["Patata", "Camille"],
            "messages": [{...}],
            "title": "Cpasmaconversation",
            "theme": "YELLOW",
            "updated_at": "2021-12-24T00:43:00",
            "seen": {},
            "typing": {}
        }
    }
    */
    let getOrCreateOneToOneConversation = conversationController.getOrCreateOneToOneConversation({ token : responses.authenticate.data.token, username:req.body.username }, callbackPost, allSockets)
    await getOrCreateOneToOneConversation.then(response=>{
        response.getOrCreateOneToOneConversation=response;
    });
    
    /* Exemple de body à envoyer
    {
        "conversation": {
            "id":4,
            "type":"many_to_many",
            "participants": ["Patata", "Camille","Emma"],
            "messages": [{...}],
            "title": "Cpasmaconversationaplusieurs",
            "theme": "YELLOW",
            "updated_at": "2021-12-24T00:53:00",
            "seen": {},
            "typing": {}
        }
    }
    */
    let createManyToManyConversation = conversationController.createManyToManyConversation({ token : responses.authenticate.data.token, usernames:req.body.usernames }, callbackPost, allSockets)
    await createManyToManyConversation.then(response=>{
        response.createManyToManyConversation=response;
    });

    /* Exemple de body à envoyer
    {
        "conversations": [{
            "id":42,
            "type":"one_to_one",
            "participants": ["Patata", "Camille"],
            "messages": [{...}],
            "title": "Cpasmaconversation",
            "theme": "YELLOW",
            "updated_at": "2021-12-24T00:43:00",
            "seen": {},
            "typing": {}
        },
        ...
        ]
    }
    */
    getConversations({ token }, callback)
    let getConversations = conversationController.getConversations({ token : responses.authenticate.data.token }, callbackPost)
    await getConversations.then(response=>{
        response.getConversations=response;
    });
    
    /* Exemple de body à envoyer
    {
        
    }
    */
    let seeConversation = conversationController.seeConversation({ token : responses.authenticate.data.token, conversation_id:req.body.conversation_id, message_id:req.body.message_id }, callbackPost, allSockets)
    await seeConversation.then(response=>{
        response.seeConversation=response;
    });

    // reponse a l'ecran
    res.json({responses});
});


io.on("connection", socket => {
    socket.on("@authenticate", ({ username, password }, callback) => {

        if (!allSockets.find(element => element.socket === socket)) {
            allSockets.push({ name: username, socket: socket });
        }
        
        // Envoie l'évènement usersAvailable au cas où dans les 0,5 secondes 
        // la variable usersAvailable n'aurait pas changé de length
        if (!usersAvailable.find(value => value === username)) {
            usersAvailable.push(username);
            socket.emit("@usersAvailable", { usernames : usersAvailable });
        }

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

            // Envoie l'évènement usersAvailable au cas où dans les 0,5 secondes 
            // la variable usersAvailable n'aurait pas changé de length
            let indexUser = usersAvailable.findIndex(value => value === allSockets[index].name);
            if (indexUser !== -1) {
                usersAvailable.splice(indexUser, 1);
                socket.emit("@usersAvailable", { usernames : usersAvailable });
            }
            
            console.log('Déconnexion : ', allSockets[index].name, reason);
            allSockets.splice(index, 1);
        }
    });
});
