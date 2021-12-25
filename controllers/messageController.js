require('dotenv/config');
const ConversationSchema = require('../models/conversationSchema');
const MessageSchema = require('../models/messageSchema');
const UserSchema = require('../models/userSchema');
const jsonwebtoken = require('jsonwebtoken');

async function postMessage({ token, conversation_id, content }, callback, allSockets) {
    let user = token ? jsonwebtoken.verify(token, process.env.SECRET_KEY) : null;

    if (!user || user.exp * 1000 < Date.now()) {
        return callback({
            code: "NOT_AUTHENTICATED",
            data: {}
        });
    }
    // met à jour "last_activity_at"
    await UserSchema.findOneAndUpdate({ username: user.data }, { last_activity_at: new Date().toString() });

    if (content.replace(/\s/g,'') === '') {
        return callback({
            code: "NOT_VALID_CONTENT",
            data: {}
        });
    }

    let conv = await ConversationSchema.findOne({ id: conversation_id });
    if (conv.length === 0) {
        return callback({
            code: "NOT_FOUND_CONVERSATION",
            data: {}
        });
    }

    let deliveredTo = {};
    conv.participants.forEach(participant => {
        if (participant !== user.data) {
            deliveredTo[participant] = new Date().toISOString();
        }
    });

    let message = new MessageSchema({
        id: conv.messages.length,
        from: user.data,
        content: content,
        posted_at: new Date().toISOString(),
        delivered_to: deliveredTo,
        reply_to: null,
        edited: false,
        deleted: false,
        reactions: {}
    });

    try {
        await message.save();
        console.log('New message', {
            message
        });
    } catch (e) {
        console.log({
            error: e
        });
    }

    // Met à jour les messages de la conversation
    conv.messages.push(message._id);
    conv.seen[user.data] = {
        message_id: message.id,
        time: new Date().toISOString()
    }
    try {
        await ConversationSchema.findOneAndUpdate(
            { id: conversation_id }, 
            { messages: conv.messages, seen: conv.seen, updated_at: new Date().toISOString() }
        );
    } catch (e) {
        console.log({
            error: e
        });
    }

    // Pour chaque participants autres que l'utilisateur, envoie un événement messagePosted
    for (let username of conv.participants) {
        if (username !== user.data) {
            let socketUserOfConv = allSockets.find(element => element.name === username);
            if (socketUserOfConv) {
                socketUserOfConv.socket.emit("@messagePosted", { conversation_id, message });
            }
        }
    }

    callback({
        code: "SUCCESS",
        data: {
            message
        }
    });
}

async function replyMessage({ token, conversation_id, message_id, content }, callback, allSockets) {
    let user = token ? jsonwebtoken.verify(token, process.env.SECRET_KEY) : null;

    if (!user || user.exp * 1000 < Date.now()) {
        return callback({
            code: "NOT_AUTHENTICATED",
            data: {}
        });
    }
    // met à jour "last_activity_at"
    await UserSchema.findOneAndUpdate({ username: user.data }, { last_activity_at: new Date().toString() });

    if (content.replace(/\s/g,'') === '') {
        return callback({
            code: "NOT_VALID_CONTENT",
            data: {}
        });
    }

    let conv = await ConversationSchema.findOne({ id: conversation_id });
    if (conv.length === 0) {
        return callback({
            code: "NOT_FOUND_CONVERSATION",
            data: {}
        });
    }

    // Vérification de message_id
    let messagesConv = [];
    for(let messageId of conv.messages) {
        const message = await MessageSchema.findOne({
            _id: messageId
        });
        if (message && !message.deleted) {
            messagesConv.push(message);
        }
    }
    if(!messagesConv.find(message => message.id === message_id)) {
        return callback({
            code: "NOT_FOUND_MESSAGE",
            data: {}
        });
    }

    let messageFind = messagesConv.find(message => message.id === message_id);
    let deliveredTo = {};
    conv.participants.forEach(participant => {
        if (participant !== user.data) {
            deliveredTo[participant] = new Date().toISOString();
        }
    });

    let message = new MessageSchema({
        id: conv.messages.length,
        from: user.data,
        content: content,
        posted_at: new Date().toISOString(),
        delivered_to: deliveredTo,
        reply_to: messageFind,
        edited: false,
        deleted: false,
        reactions: {}
    });

    try {
        await message.save();
        console.log('New message reply_to', {
            message
        });
    } catch (e) {
        console.log({
            error: e
        });
    }

    // Met à jour les messages de la conversation
    conv.messages.push(message._id);
    conv.seen[user.data] = {
        message_id: message_id,
        time: new Date().toISOString()
    }
    try {
        await ConversationSchema.findOneAndUpdate(
            { id: conversation_id },
            { messages: conv.messages, seen: conv.seen, updated_at: new Date().toISOString() }
        );
    } catch (e) {
        console.log({
            error: e
        });
    }
    
    // Pour chaque participants autres que l'utilisateur, envoie un événement messagePosted
    for (let username of conv.participants) {
        if (username !== user.data) {
            let socketUserOfConv = allSockets.find(element => element.name === username);
            if (socketUserOfConv) {
                socketUserOfConv.socket.emit("@messagePosted", { conversation_id, message });
            }
        }
    }

    callback({
        code: "SUCCESS",
        data: {
            message
        }
    });
}

async function editMessage({ token, conversation_id, message_id, content }, callback, allSockets) {
    let user = token ? jsonwebtoken.verify(token, process.env.SECRET_KEY) : null;

    if (!user || user.exp * 1000 < Date.now()) {
        return callback({
            code: "NOT_AUTHENTICATED",
            data: {}
        });
    }
    // met à jour "last_activity_at"
    await UserSchema.findOneAndUpdate({ username: user.data }, { last_activity_at: new Date().toString() });

    let conv = await ConversationSchema.findOne({ id: conversation_id });
    if (conv.length === 0) {
        return callback({
            code: "NOT_FOUND_CONVERSATION",
            data: {}
        });
    }

    // Vérification de message_id
    let messagesConv = [];
    for(let messageId of conv.messages) {
        const message = await MessageSchema.findOne({
            _id: messageId
        });
        if (message && !message.deleted) {
            messagesConv.push(message);
        }
    }
    if(!messagesConv.find(message => message.id === message_id)) {
        return callback({
            code: "NOT_FOUND_MESSAGE",
            data: {}
        });
    }

    let messageFind = messagesConv.find(message => message.id === message_id);

    messageFind.content = content;
    messageFind.edited = true;
    await MessageSchema.findByIdAndUpdate(messageFind._id, {
        content: content,
        edited: true
    });

    // Pour chaque participants de la conversation, envoie un événement messageEdited
    for (let username of conv.participants) {
        let socketUserOfConv = allSockets.find(element => element.name === username);
        if (socketUserOfConv) {
            socketUserOfConv.socket.emit("@messageEdited", { conversation_id, message: messageFind });
        }
    }

    callback({
        code: "SUCCESS",
        data: {}
    });
}

/**
 * Ajoute une réaction au message et l'enregistre dans la bdd
 * @param {Object} { token, conversation_id, message_id, reaction } 
 * @param {Function} callback 
 * @param {Object} allSockets 
 * @returns 
 */
async function reactMessage({ token, conversation_id, message_id, reaction }, callback, allSockets) {
    let user = token ? jsonwebtoken.verify(token, process.env.SECRET_KEY) : null;
    if (!user || user.exp * 1000 < Date.now()) {
        return callback({
            code: "NOT_AUTHENTICATED",
            data: {}
        });
    }
    // met à jour "last_activity_at"
    await UserSchema.findOneAndUpdate({ username: user.data }, { last_activity_at: new Date().toString() });

    let conv = await ConversationSchema.findOne({ id: conversation_id });
    if (conv.length === 0) {
        return callback({
            code: "NOT_FOUND_CONVERSATION",
            data: {}
        });
    }

    // Vérification de message_id
    let messagesConv = [];
    for(let messageId of conv.messages) {
        const message = await MessageSchema.findOne({
            _id: messageId
        });
        if (message && !message.deleted) {
            messagesConv.push(message);
        }
    }
    if(!messagesConv.find(message => message.id === message_id)) {
        return callback({
            code: "NOT_FOUND_MESSAGE",
            data: {}
        });
    }

    let messageFind = messagesConv.find(message => message.id === message_id);

    let message = await MessageSchema.findById(messageFind._id);
    message.reactions[user.data] = reaction;
    await MessageSchema.findByIdAndUpdate(messageFind._id, {
        reactions: message.reactions
    });

    // Pour chaque participants de la conversation, envoie un événement messageReacted
    for (let username of conv.participants) {
        let socketUserOfConv = allSockets.find(element => element.name === username);
        if (socketUserOfConv) {
            socketUserOfConv.socket.emit("@messageReacted", { conversation_id, message });
        }
    }

    callback({
        code: "SUCCESS",
        data: {}
    });
}

/**
 * Passe un message en "deleted: true" dans la bdd
 * @param {Object} { token, conversation_id, message_id, content } 
 * @param {Function} callback 
 * @param {Object} allSockets 
 * @returns 
 */
async function deleteMessage({ token, conversation_id, message_id, content }, callback, allSockets) {
    let user = token ? jsonwebtoken.verify(token, process.env.SECRET_KEY) : null;

    if (!user || user.exp * 1000 < Date.now()) {
        return callback({
            code: "NOT_AUTHENTICATED",
            data: {}
        });
    }
    // met à jour "last_activity_at"
    await UserSchema.findOneAndUpdate({ username: user.data }, { last_activity_at: new Date().toString() });

    let conv = await ConversationSchema.findOne({ id: conversation_id });
    if (conv.length === 0) {
        return callback({
            code: "NOT_FOUND_CONVERSATION",
            data: {}
        });
    }

    // Vérification de message_id
    let messagesConv = [];
    for(let messageId of conv.messages) {
        const message = await MessageSchema.findOne({
            _id: messageId
        });
        if (message && !message.deleted) {
            messagesConv.push(message);
        }
    }
    if(!messagesConv.find(message => message.id === message_id)) {
        return callback({
            code: "NOT_FOUND_MESSAGE",
            data: {}
        });
    }

    let messageFind = messagesConv.find(message => message.id === message_id);

    messageFind.deleted = true;
    await MessageSchema.findByIdAndUpdate(messageFind._id, {
        deleted: true
    });

    // Pour chaque participants de la conversation, envoie un événement messageDeleted
    for (let username of conv.participants) {
        let socketUserOfConv = allSockets.find(element => element.name === username);
        if (socketUserOfConv) {
            socketUserOfConv.socket.emit("@messageDeleted", { conversation_id, message_id });
        }
    }

    callback({
        code: "SUCCESS",
        data: {}
    });
}


module.exports = {
    postMessage: postMessage,
    replyMessage: replyMessage,
    editMessage: editMessage,
    reactMessage: reactMessage,
    deleteMessage: deleteMessage
};