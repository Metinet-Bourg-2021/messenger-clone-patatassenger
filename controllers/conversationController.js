require('dotenv/config');
const ConversationSchema = require('../models/conversationSchema');
const MessageSchema = require('../models/messageSchema');
const jsonwebtoken = require('jsonwebtoken');
const conversationSchema = require('../models/conversationSchema');
const mongoose = require('mongoose');

/**
 * Récupère ou crée une conversation one to one
 * @param {Object} { token, username } 
 * @param {Function} callback 
 * @param {Object} allSockets 
 * @returns callback
 */
async function getOrCreateOneToOneConversation({ token, username }, callback, allSockets) {
    let userSession = jsonwebtoken.verify(token, process.env.SECRET_KEY);
    
    if(!userSession || userSession.exp * 1000 < Date.now()) {
        return callback({
            code: "NOT_AUTHENTICATED",
            data: {}
        });
    }

    if(userSession.data !== username){
        
        const conversation = await ConversationSchema.findOne({participants: { "$all" : [username, userSession.data] }, type: 'one_to_one'});
        
        // Si une conversation a été trouvée
        if (conversation && conversation.length !== 0) 
        {
            let messagesConv = [];
            
            await conversation.messages.forEach(async (message_id) => {
                const message = await MessageSchema.find({_id : message_id});
                messagesConv.push(message);
            });
            conversation.messages = messagesConv;
            
            return callback({
                code:"SUCCESS", 
                data:{conversation : conversation}
            });
        }
        else {
            let lenghtTableConv = await ConversationSchema.count({});
            const newConversation = new ConversationSchema({
                id: lenghtTableConv,
                title: "",
                type: "one_to_one",
                participants: [username, userSession.data],
                messages: [],
                theme: "BLUE",
                updated_at: new Date(),
                seen: {},
                typing: {}
            });
            newConversation.participants.forEach(username => {
                newConversation.seen[username] = {
                    message_id : -1,
                    time : new Date().toISOString()
                };
            });
    
            try {
                await newConversation.save();
                console.log('Create new conversation one_to_one', newConversation);
            }
            catch(error) {
                console.log({ error: error });
            }
            let socketUserOfConv = allSockets.find(element => element.name === username);
            if(socketUserOfConv) {
                socketUserOfConv.socket.emit("@conversationCreated", {conversation : newConversation});
            }
            newConversation.title = username;
    
            return callback({
                code:"SUCCESS", 
                data:{conversation : newConversation}
            });
        }
    } 
    else {
        return callback({
            code:"NOT_VALID_USERNAMES", 
            data:{}
        });
    }
}

/**
 * Crée une conversation many to many
 * @param {Object} { token, usernames } 
 * @param {Function} callback 
 * @param {Object} allSockets 
 * @returns callback
 */
async function createManyToManyConversation({ token, usernames }, callback, allSockets) {
    let userSession = jsonwebtoken.verify(token, process.env.SECRET_KEY);

    if(!userSession || userSession.exp * 1000 < Date.now()) {
        return callback({
            code: "NOT_AUTHENTICATED",
            data: {}
        });
    }
    
    let title = "Groupe: ";
    let participants = [userSession.data];
    usernames.forEach(username => {
        participants.push(username);

        if(usernames[usernames.length - 1] === username) {
            title += username;
        } else {
            title += username+', ';
        }
    });
    let lenghtTableConv = await ConversationSchema.count({});
    const newConversation = new ConversationSchema({
        id: lenghtTableConv,
        title: "",
        type: "many_to_many",
        participants: participants,
        messages: [],
        theme: "BLUE",
        updated_at: new Date(),
        seen: {},
        typing: {}
    });
    newConversation.participants.forEach(username => {
        newConversation.seen[username] = {
            message_id : -1,
            time : new Date().toISOString()
        };
    });

    try {
        await newConversation.save();
        console.log('Create new conversation many_to_many', {newConversation});
    }
    catch(error) {
        console.log({ error: error });
    }
    
    // Pour chaque participants autres que l'utilisateur, envoie un événement conversationCreated
    for(let username of usernames) {
        let socketUserOfConv = allSockets.find(element => element.name === username);
        if(socketUserOfConv) {
            socketUserOfConv.socket.emit("@conversationCreated", {conversation : newConversation});
        }
    }
    newConversation.title = title;

    return callback({
        code:"SUCCESS", 
        data:{conversation : newConversation}
    });
}

/**
 * Récupère toutes les conversations pour l'utilisateur
 * @param {Object} { token } 
 * @param {Function} callback 
 * @returns 
 */
async function getConversations({ token }, callback) {
    let userSession = jsonwebtoken.verify(token, process.env.SECRET_KEY);

    if(!userSession || userSession.exp * 1000 < Date.now()) {
        return callback({
            code: "NOT_AUTHENTICATED",
            data: {}
        });
    }
    
    const conversations = await ConversationSchema.find().exec();
    let conversationsUser = [];

    for(let conversation of conversations) {

        // Si une conversation a été trouvée avec le nom de l'utilisateur 
        if(conversation._id && conversation.participants.includes(userSession.data)) {
            let conversationToReturn = {
                _id: conversation._id,
                id: conversation.id,
                title: conversation.title,
                type: conversation.type,
                participants: conversation.participants,
                messages: [],
                theme: conversation.theme,
                updated_at: conversation.updated_at,
                seen: conversation.seen,
                typing: conversation.typing
            };
            
            for(let message_id of conversation.messages) {
                try {
                    const message = await MessageSchema.findOne({_id : message_id});
                    conversationToReturn.messages.push(message);
                }
                catch(error) {
                    console.log({ error: error });
                }
            }
            
            let title = 'Groupe: ';
            conversation.participants.forEach(participant => {

                if(conversation.participants.length === 2 && participant !== userSession.data) {
                    title = participant;
                } else if(participant !== userSession.data) {

                    if(conversation.participants[conversation.participants.length - 1] === participant) {
                        title += participant;
                    } else {
                        title += participant+', ';
                    }
                }
            });

            conversationToReturn.title = title;
            conversationsUser.push(conversationToReturn);
        }
    }

    return callback({
        code:"SUCCESS", 
        data:{conversations : conversationsUser}
    });
}

// TODO : à tester
/**
 * Met à jour les participants ayant vu la conversation en envoyant l'information aux participants connectés
 * @param {Object} { token, conversation_id, message_id } 
 * @param {Function} callback 
 * @param {Object} allSockets 
 * @returns 
 */
async function seeConversation({ token, conversation_id, message_id }, callback, allSockets) {
    let userSession = jsonwebtoken.verify(token, process.env.SECRET_KEY);
    
    if(!userSession || userSession.exp * 1000 < Date.now()) {
        return callback({
            code: "NOT_AUTHENTICATED",
            data: {}
        });
    }
    let conversation = {};

    try {
        conversation = await conversationSchema.findOne({id: conversation_id});
    }
    catch(error) {
        console.log({ error: error });
    }

    if (conversation._id){
        conversation.seen[userSession.data] = {
            message_id : message_id,
            time : new Date().toISOString()
        };
        
        try {
            await conversationSchema.findOneAndUpdate({id: conversation_id}, {seen: conversation.seen});
        }
        catch(error) {
            console.log({ error: error });
        }

        for(let username of conversation.participants) {
            if(username !== userSession.data) {
                let socketUserOfConv = allSockets.find(element => element.name === username);
                if(socketUserOfConv) {
                    socketUserOfConv.socket.emit("@conversationSeen", conversation.toObject({virtuals : true, versionKey : false}));
                }
            }
        }
        
        console.log(conversation)
        return callback({
            code:"SUCCESS", 
            data:{conversation : conversation.toObject({virtuals : true, versionKey : false})}
        });
    }
    return callback({
        code:"NOT_FOUND_CONVERSATION", 
        data:{}
    });
    
}

module.exports = {
    getOrCreateOneToOneConversation : getOrCreateOneToOneConversation,
    createManyToManyConversation : createManyToManyConversation,
    getConversations : getConversations,
    seeConversation : seeConversation
};