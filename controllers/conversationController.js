
require('dotenv/config');
const ConversationSchema = require('../models/conversationSchema');

function getOrCreateOneToOneConversation({ token, username }, callback) {
    let decoded = '';

    if(token) {
        try {
            decoded = jsonwebtoken.verify(token, 'patata');
            
            if(!decoded) {
                throw "non connecté";
            }
        } catch (e) {
            return console.log("Erreur : "+e);
        }
    }

    if(decoded.username !== username){

        const conversation = ConversationSchema.find({participants: username});
        console.log(conversation);

        if(conversation)
            return callback({code:"SUCCESS", data:{conversation}});
        const newConversation = new ConversationSchema({
            name: username,
            type: "one_to_one",
            participants: [username, decoded],
            messages: null,
            theme: "BLUE",
            updated_at: new Date(),
            seen: null
        });
        newConversation.save(function (err) {
            if (err) {
                console.log("Error while saving data: " + err);
                return;
            }
        });
        callback({code:"SUCCESS", data:{}});
    }
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