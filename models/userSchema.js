const mongoose = require('mongoose');

const userSchema = mongoose.Schema({
    username: {
        type: String,
        require: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    picture_url: {
        type: String
    },
    last_activity_at: {
        type: Date
    },
    awake: {
        type: Boolean
    }
});

module.exports = mongoose.model('UserSchema', userSchema);