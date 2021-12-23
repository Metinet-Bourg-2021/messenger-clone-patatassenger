const mongoose = require('mongoose');

const messageSchema = mongoose.Schema({
    id: 
    {
        type: Number,
        require: true
    },
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
        type: Number,
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
