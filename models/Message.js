const mongoose = require('mongoose');

const messageSchema = mongoose.Schema({
    from: 
    {
        type: [mongoose.Schema.Types.User],//TODO: a verifier aussi
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
        type: mongoose.Schema.Types.ObjectId //TODO: a verifier là aussi
    },
    reply_to:
    {
        type: mongoose.Schema.Types.ObjectId,
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

module.exports = mongoose.model('Message', messageSchema);
