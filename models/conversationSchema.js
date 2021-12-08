const mongoose = require('mongoose');
const MessageSchema = require('./MessageSchema');

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
        type: [mongoose.Types.ObjectId],
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
        type: [mongoose.Types.ObjectId]
    }
}, { minimize: false });

module.exports = mongoose.model('ConversationSchema', conversationSchema);