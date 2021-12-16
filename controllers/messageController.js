require('dotenv/config');

const conversationSchema = require('../models/conversationSchema');
const MessageSchema = require('../models/messageSchema');
const tokenDecoder = require('jsonwebtoken');
const messageSchema = require('../models/messageSchema');

async function postMessage({token,conversation_id,content}, callback,allSockets) {
    let user = tokenDecoder.verify(token, process.env.SECRET_KEY);
    if(!user || user.exp * 1000 < Date.now()) {
        return callback({
            code: "NOT_AUTHENTICATED",
            data: {}
        });
    }

    console.log(conversation_id);
    let conv = await conversationSchema.findById(conversation_id);
    let deliveredTo = {};
    console.log(conv);
    conv.participants.forEach(participant => {
        if(participant!==user.data){
            deliveredTo[participant]=new Date().toISOString();
        }
    });

    let message = new MessageSchema({
        from: user.data,
        content: content,
        posted_at: new Date().toISOString(),
        delivered_to:deliveredTo,
        reply_to: null,
        edited: false,
        deleted: false,
        reactions: {}      
    });
    
    try{
        await message.save();
        console.log(message);
    }
    catch(e){
        console.log({ error: e });
    }

    conv.messages.push(message._id.toString());
    conv.seen[user.data]={message_id:message._id.toString(), time: new Date().toISOString()}

    try{
        await conversationSchema.findByIdAndUpdate(conversation_id,{messages:conv.messages});
        console.log(conv);
    }
    catch(e){
        console.log({ error: e });
    }

    // Pour chaque participants autres que l'utilisateur, envoie un événement messagePosted
    for(let participant of conv.participants) {
        if(participant!==user.data){
            let socketUserOfConv = allSockets.find(element => element.name === participant.username);
            if(socketUserOfConv) {
                socketUserOfConv.socket.emit("@messagePosted", {conversation_id : conversation_id, message : message.toObject({virtuals : true, versionKey : false})});
            }
        }
    }

    callback({
        code: "SUCCESS",
        data: {
            message: message.toObject({virtuals : true, versionKey : false})
        }
    });
}


async function replyMessage({token,conversation_id,message_id,content}, callback,allSockets) {
    let user = tokenDecoder.verify(token, process.env.SECRET_KEY);
    if(!user || user.exp * 1000 < Date.now()) {
            return callback({
                code: "NOT_AUTHENTICATED",
                data: {}
            });
        }

    let conv = await conversationSchema.findById(conversation_id);
    let deliveredTo = [];
    conv.participants.forEach(participant => {
        if(participant!==user.data){
            deliveredTo[participant]=new Date().toISOString();
        }
    });

    let message = new MessageSchema({
        from: user.data,
        content: content,
        posted_at: new Date().toISOString(),
        delivered_to:deliveredTo,
        reply_to: messageSchema.findById(message_id),
        edited: false,
        deleted: false,
        reactions: {}      
    });

    try{
        await message.save();
        console.log(message);
    }
    catch(e){
        console.log({ error: e });
    }

    conv.messages.push(message);

    try{
        await conversationSchema.findByIdAndUpdate(conversation_id,{messages:conv.messages});
        console.log(conv);
    }
    catch(e){
        console.log({ error: e });
    }

    callback({
        code: "SUCCESS",
        data: {
            message: message
        }
    });
}

async function editMessage({token,message_id,content}, callback,allSockets) {
    let user = tokenDecoder.verify(token, process.env.SECRET_KEY);
    if(!user || user.exp * 1000 < Date.now()) {
        return callback({
            code: "NOT_AUTHENTICATED",
            data: {}
        });
    }

    await MessageSchema.findByIdAndUpdate( message_id, {content:content, edited:true});
    
    callback({
        code: "SUCCESS",
        data: {}
    });
}

async function reactMessage({token,message_id,reaction}, callback,allSockets) {
    let user = tokenDecoder.verify(token, process.env.SECRET_KEY);
    if(!user || user.exp * 1000 < Date.now()) {
        return callback({
            code: "NOT_AUTHENTICATED",
            data: {}
        });
    }

    let message = await MessageSchema.findById(message_id);
    message.reactions.push(reaction);
    await MessageSchema.findByIdAndUpdate(message_id, {reactions:message.reactions});

    callback({
        code: "SUCCESS",
        data: {}
    });
}

async function deleteMessage({token,message_id}, callback,allSockets) {
    let user = tokenDecoder.verify(token, process.env.SECRET_KEY);
    if(!user || user.exp * 1000 < Date.now()) {
        return callback({
            code: "NOT_AUTHENTICATED",
            data: {}
        });
    }

    await MessageSchema.findByIdAndRemove(message_id);

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