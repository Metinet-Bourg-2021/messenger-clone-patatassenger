const mongoose = require('mongoose');

const messageSchema = mongoose.Schema({
    from: 
    {
        type: String,
        require: true
    },
    content:
    {
        type: String,
        require: true
    },
    posted_at:
    {
        type: Date
    },
    conversation_id: //a qui et quand ils l'ont vu ?
    {
        type: mongoose.Types.ObjectId //TODO: a verifier là aussi
    },
    reply_to:
    {
        type: mongoose.Types.ObjectId,
        default: null
    },
    edited:
    {
        type: Boolean,
        default: false
    },
    deleted:
    {
        type: Boolean,
        default: false
    },
    reactions:
    {
        type: Array
    }
}, { minimize: false });

module.exports = mongoose.model('MessageSchema', messageSchema);
