const mongoose = require('mongoose');

const userSchema = mongoose.Schema({
    username: {
        type: String,
        require: true,
        unique: true
    },
    password: {
        type: String,
        require: true
    },
    picture_url: {
        type: String
    },
    last_activity_at: {
        type: Date
    }
});

module.exports = mongoose.model('UserSchema', userSchema);