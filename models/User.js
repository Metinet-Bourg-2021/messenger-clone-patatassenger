const mongoose = require('mongoose');

const userSchema = mongoose.Schema({
    name:
    {
        type: String,
        require: true,
        unique: true
    },
    password:
    {
            type: String,
            required: true
    },
    picture_url:
    {
        type: String
    },
    awake:
    {
        type: Boolean
    },
    last_activity_at: {
        type: Date
    }
});

module.exports = mongoose.model('User', userSchema);