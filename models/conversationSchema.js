const mongoose = require('mongoose');

const conversationSchema = mongoose.Schema({
    title:
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
        type: [String],
        require: true
    },
    messages:
    {
        type: [mongoose.Types.ObjectId]
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
        type: {}
    },
    typing:
    {
        type: {}
    }
}, { minimize: false });

module.exports = mongoose.model('ConversationSchema', conversationSchema);