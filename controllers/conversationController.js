const ConversationSchema = require('../models/ConversationSchema');

function getOrCreateOneToOneConversation({ token, username }, callback) {
    callback({code:"SUCCESS", data:{}});
}

function createManyToManyConversation({ token, usernames }, callback) {
    callback({code:"SUCCESS", data:{}});
}

function getConversations({ token }, callback) {
    callback({code:"SUCCESS", data:{}});
}

module.exports = {
    getOrCreateOneToOneConversation : getOrCreateOneToOneConversation,
    createManyToManyConversation : createManyToManyConversation,
    getConversations : getConversations
};