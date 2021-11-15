const mongoose = require('mongoose');

const conversationSchema = mongoose.Schema({
    name:
    {
        type: String,
        require: true
    },
    type:
    {
        type: String,
        require: true
    },
    participants:
    {
        type: [mongoose.Schema.Types.User] //TODO A verifier
    },
    messages:
    {
        type: [mongoose.Schema.Types.Message]
    },
    theme: 
    {
        type: String
    },
    updated_at:
    {
        type: Date
    },
    seen:
    {
        type: [mongoose.Schema.Types.User]
    },
    typing: 
    {
        type: [mongoose.Schema.Types.User]
    }
}, { minimize: false });

module.exports = mongoose.model('Conversation', conversationSchema);