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
    delivered_to:
    {
        type: Object
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
        type: Object
    }
}, { minimize: false });

module.exports = mongoose.model('MessageSchema', messageSchema);
