const MessageSchema = require('../models/MessageSchema');

function postMessage({ token, conversation_id, content }, callback) {
    callback({code:"SUCCESS", data:{}});
}

function seeConversation({ token, conversation_id, message_id }, callback) {
    callback({code:"SUCCESS", data:{}});
}

function replyMessage({ token, conversation_id, message_id, content }, callback) {
    callback({code:"SUCCESS", data:{}});
}

function editMessage({ token, conversation_id, message_id, content }, callback) {
    callback({code:"SUCCESS", data:{}});
}

function reactMessage({ token, conversation_id, message_id, reaction }, callback) {
    callback({code:"SUCCESS", data:{}});
}

function deleteMessage({ token, conversation_id, message_id, content }, callback) {
    callback({code:"SUCCESS", data:{}});
}

module.exports = {
    postMessage : postMessage,
    seeConversation : seeConversation,
    replyMessage : replyMessage,
    editMessage : editMessage,
    reactMessage : reactMessage,
    deleteMessage : deleteMessage
};