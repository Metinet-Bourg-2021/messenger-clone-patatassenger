require('dotenv/config');
const ConversationSchema = require('../models/conversationSchema');
const MessageSchema = require('../models/messageSchema');
const tokenDecoder = require('jsonwebtoken');

async function postMessage({ token, conversation_id, content }, callback, allSockets) {
    let user = tokenDecoder.verify(token, process.env.SECRET_KEY);
    if (!user || user.exp * 1000 < Date.now()) {
        return callback({
            code: "NOT_AUTHENTICATED",
            data: {}
        });
    }

    let conv = await ConversationSchema.findOne({
        id: conversation_id
    });
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
        message_id: message._id.toString(),
        time: new Date().toISOString()
    }
    try {
        await ConversationSchema.findOneAndUpdate({ id: conversation_id }, { messages: conv.messages });
    } catch (e) {
        console.log({
            error: e
        });
    }

    // Pour chaque participants autres que l'utilisateur, envoie un événement messagePosted
    for (let participant of conv.participants) {
        if (participant !== user.data) {
            let socketUserOfConv = allSockets.find(element => element.name === participant.username);
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

    let conv = await ConversationSchema.findOne({ id: conversation_id });
    let deliveredTo = [];
    conv.participants.forEach(participant => {
        if (participant !== user.data) {
            deliveredTo[participant] = new Date().toISOString();
        }
    });

    // Récupère le message entier par rapport à la conversation
    let messageFind = null;
    for (let messageIdConv of conv.messages) {
        let messageBdd = await MessageSchema.findById(messageIdConv);
        if (messageBdd.length !== 0 && messageBdd.id === message_id) {
            messageFind = messageBdd;
            break;
        }
    }

    let message = new MessageSchema({
        id: conv.messages.length,
        from: user.data,
        content: content,
        posted_at: new Date().toISOString(),
        delivered_to: deliveredTo,
        reply_to: messageFind._id,
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
        message_id: message._id.toString(),
        time: new Date().toISOString()
    }
    try {
        await ConversationSchema.findOneAndUpdate({ id: conversation_id }, { messages: conv.messages });
    } catch (e) {
        console.log({
            error: e
        });
    }
    
    // Pour chaque participants autres que l'utilisateur, envoie un événement messagePosted
    for (let participant of conv.participants) {
        if (participant !== user.data) {
            let socketUserOfConv = allSockets.find(element => element.name === participant.username);
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

    // Récupère le message entier par rapport à la conversation
    let conv = await ConversationSchema.findOne({ id: conversation_id });
    let messageFind = null;
    for (let messageIdConv of conv.messages) {
        let messageBdd = await MessageSchema.findById(messageIdConv);
        if (messageBdd.length !== 0 && messageBdd.id === message_id) {
            messageFind = messageBdd;
            break;
        }
    }

    await MessageSchema.findByIdAndUpdate(messageFind._id, {
        content: content,
        edited: true
    });

    callback({
        code: "SUCCESS",
        data: {}
    });
}

async function reactMessage({ token, conversation_id, message_id, reaction }, callback, allSockets) {
    let user = tokenDecoder.verify(token, process.env.SECRET_KEY);
    if (!user || user.exp * 1000 < Date.now()) {
        return callback({
            code: "NOT_AUTHENTICATED",
            data: {}
        });
    }

    // Récupère le message entier par rapport à la conversation
    let conv = await ConversationSchema.findOne({ id: conversation_id });
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

    // Pour chaque participants autres que l'utilisateur, envoie un événement messageReacted
    for (let participant of conv.participants) {
        let socketUserOfConv = allSockets.find(element => element.name === participant.username);
        if (socketUserOfConv) {
            socketUserOfConv.socket.emit("@messageReacted", { conversation_id, message });
        }
    }

    callback({
        code: "SUCCESS",
        data: {}
    });
}

async function deleteMessage({ token, conversation_id, message_id, content }, callback, allSockets) {
    let user = tokenDecoder.verify(token, process.env.SECRET_KEY);

    if (!user || user.exp * 1000 < Date.now()) {
        return callback({
            code: "NOT_AUTHENTICATED",
            data: {}
        });
    }

    // Récupère le message entier par rapport à la conversation
    let conv = await ConversationSchema.findOne({ id: conversation_id });
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

    // Pour chaque participants autres que l'utilisateur, envoie un événement messagePosted
    for (let participant of conv.participants) {
        let socketUserOfConv = allSockets.find(element => element.name === participant.username);
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