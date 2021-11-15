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
        type: [mongoose.Types.ObjectId], //TODO A verifier
        require: true
    },
    messages:
    {
        type: [mongoose.Types.ObjectId] //ne marche pas
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
        type: [mongoose.Types.ObjectId]
    },
    typing: 
    {
        type: [mongoose.Types.ObjectId]
    }
}, { minimize: false });

module.exports = mongoose.model('ConversationSchema', conversationSchema);