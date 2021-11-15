const conversationSchema = require('../models/ConversationSchema');
const MessageSchema = require('../models/MessageSchema');
const tokenDecoder = require('../services/token');

function postMessage({token,conversation_id,content}, callback) {
    let user = tokenDecoder.decodeToken(token);
    if(!user){
        return callback({
            code: "NOT_AUTHENTICATED",
            data: {}
        });
    }
    
    let message = new MessageSchema({
        from: user.username,
        content: content,
        posted_at: Date(now),
        conversation_id: conversation_id,
        reply_to: false,
        edited: false,
        deleted: false,
        reactions: []        
    });
    message.save()
    .then((savedMessage) => console.log(savedMessage))
    .catch(error => console.log({ error: error }));
    
    callback({
        code: "SUCCESS",
        data: {
            message: message
        }
    });
}


function replyMessage({token,conversation_id,message_id,content}, callback) {
    let user = tokenDecoder.decodeToken(token);
    if(!user){
        return callback({
            code: "NOT_AUTHENTICATED",
            data: {}
        });
    }

    let message = new MessageSchema({
        from: user.username,
        content: content,
        posted_at: new Date(),
        conversation_id: conversation_id,
        reply_to: message_id,
        edited: false,
        deleted: false,
        reactions: []        
    });
    message.save()
    .then((savedMessage) => console.log(savedMessage))
    .catch(error => console.log({ error: error }));

    callback({
        code: "SUCCESS",
        data: {
            message: message
        }
    });
}

async function editMessage({token,conversation_id,message_id,content}, callback) {
    let user = tokenDecoder.decodeToken(token);
    if(!user){
        return callback({
            code: "NOT_AUTHENTICATED",
            data: {}
        });
    }

    MessageSchema.findByIdAndUpdate({ id: { $eq: message_id}, conversation_id:{ $eq: conversation_id}}, {content:content, edited:true});

    callback({
        code: "SUCCESS",
        data: {}
    });
}

function reactMessage({
    token,
    conversation_id,
    message_id,
    reaction
}, callback) {
    callback({
        code: "SUCCESS",
        data: {}
    });
}

function deleteMessage({
    token,
    conversation_id,
    message_id,
    content
}, callback) {
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