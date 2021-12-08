const ConversationSchema = require('../models/conversationSchema');

function getOrCreateOneToOneConversation({ token, username }, callback) {
    callback({code:"SUCCESS", data:{}});
}

function createManyToManyConversation({ token, usernames }, callback) {
    callback({code:"SUCCESS", data:{}});
}

function getConversations({ token }, callback) {
    callback({code:"SUCCESS", data:{}});
}

function seeConversation({ token, conversation_id, message_id }, callback) {
    callback({code:"SUCCESS", data:{}});
}

module.exports = {
    getOrCreateOneToOneConversation : getOrCreateOneToOneConversation,
    createManyToManyConversation : createManyToManyConversation,
    seeConversation : seeConversation,
    getConversations : getConversations
};