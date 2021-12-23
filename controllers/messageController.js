require('dotenv/config');
const ConversationSchema = require('../models/conversationSchema');
const MessageSchema = require('../models/messageSchema');
const UserSchema = require('../models/userSchema');
const tokenDecoder = require('jsonwebtoken');

async function postMessage({ token, conversation_id, content }, callback, allSockets) {
    let user = tokenDecoder.verify(token, process.env.SECRET_KEY);
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

    let deliveredTo = {};
    conv.participants.forEach(participant => {
        deliveredTo[participant] = new Date().toISOString();
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
            { messages: conv.messages, updated_at: new Date().toISOString() }
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
    let user = tokenDecoder.verify(token, process.env.SECRET_KEY);

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

    let deliveredTo = {};
    conv.participants.forEach(participant => {
        deliveredTo[participant] = new Date().toISOString();
    });

    let message = new MessageSchema({
        id: conv.messages.length,
        from: user.data,
        content: content,
        posted_at: new Date().toISOString(),
        delivered_to: deliveredTo,
        reply_to: message_id,
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
            { messages: conv.messages, updated_at: new Date().toISOString() }
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
    let user = tokenDecoder.verify(token, process.env.SECRET_KEY);
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

    // Récupère le message entier par rapport à la conversation
    let messageFind = null;
    for (let messageIdConv of conv.messages) {
        let messageBdd = await MessageSchema.findById(messageIdConv);
        if (messageBdd.length !== 0 && messageBdd.id === message_id) {
            messageFind = messageBdd;
            break;
        }
    }

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
    let user = tokenDecoder.verify(token, process.env.SECRET_KEY);
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

    // Récupère le message entier par rapport à la conversation
    let messageFind = null;
    for (let messageIdConv of conv.messages) {
        let messageBdd = await MessageSchema.findById(messageIdConv);
        if (messageBdd.length !== 0 && messageBdd.id === message_id) {
            messageFind = messageBdd;
            break;
        }
    }

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
    let user = tokenDecoder.verify(token, process.env.SECRET_KEY);

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

    // Récupère le message entier par rapport à la conversation
    let messageFind = null;
    for (let messageIdConv of conv.messages) {
        let messageBdd = await MessageSchema.findById(messageIdConv);
        if (messageBdd.length !== 0 && messageBdd.id === message_id) {
            messageFind = messageBdd;
            break;
        }
    }

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