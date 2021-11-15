const mongoose = require('mongoose');

const conversationSchema = mongoose.Schema({

}, { minimize: false });

module.exports = mongoose.model('ConversationSchema', conversationSchema);