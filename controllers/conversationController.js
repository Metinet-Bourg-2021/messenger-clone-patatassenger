require('dotenv/config');
const ConversationSchema = require('../models/conversationSchema');
const MessageSchema = require('../models/messageSchema');
const UserSchema = require('../models/userSchema');
const jsonwebtoken = require('jsonwebtoken');

/**
 * Récupère ou crée une conversation one to one
 * @param {Object} { token, username } 
 * @param {Function} callback 
 * @param {Object} allSockets 
 * @returns callback
 */
async function getOrCreateOneToOneConversation({ token, username }, callback, allSockets) {
    let userSession = jsonwebtoken.verify(token, process.env.SECRET_KEY);

    if (!userSession || userSession.exp * 1000 < Date.now()) {
        return callback({
            code: "NOT_AUTHENTICATED",
            data: {}
        });
    }

    if (userSession.data !== username) {
        // met à jour "last_activity_at"
        await UserSchema.findOneAndUpdate({ username: userSession.data }, { last_activity_at: new Date().toString() });

        const conversation = await ConversationSchema.findOne({
            participants: {
                "$all": [username, userSession.data]
            },
            type: 'one_to_one'
        });

        // Si une conversation a été trouvée
        if (conversation && conversation.length !== 0) {
            // On recrée un objet conversation pour ne pas avoir les contraintes de l'objet mongoose
            let conversationToReturn = {
                _id: conversation._id,
                id: conversation.id,
                title: conversation.title,
                type: conversation.type,
                participants: conversation.participants,
                messages: [],
                theme: conversation.theme,
                updated_at: conversation.updated_at,
                seen: conversation.seen,
                typing: conversation.typing
            };

            // On push les objects message de la bdd dans le tableau messages de conversationToReturn
            for (let message_id of conversation.messages) {
                try {
                    const message = await MessageSchema.findOne({
                        _id: message_id
                    });
                    conversationToReturn.messages.push(message);
                } catch (error) {
                    console.log({
                        error: error
                    });
                }
            }

            return callback({
                code: "SUCCESS",
                data: {
                    conversation: conversationToReturn
                }
            });
        } else {
            let lenghtTableConv = await ConversationSchema.count({});
            const newConversation = new ConversationSchema({
                id: lenghtTableConv,
                title: "",
                type: "one_to_one",
                participants: [username, userSession.data],
                messages: [],
                theme: "BLUE",
                updated_at: new Date(),
                seen: {},
                typing: {}
            });
            newConversation.participants.forEach(username => {
                newConversation.seen[username] = {
                    message_id: -1,
                    time: new Date().toISOString()
                };
            });

            try {
                await newConversation.save();
                console.log('Create new conversation one_to_one', newConversation);
            } catch (error) {
                console.log({
                    error: error
                });
            }

            // Envoie un événement conversationCreated à l'autre utilisateur de la conversation
            let socketUserOfConv = allSockets.find(element => element.name === username);
            if (socketUserOfConv) {
                socketUserOfConv.socket.emit("@conversationCreated", {
                    conversation: newConversation
                });
            }
            newConversation.title = username;

            return callback({
                code: "SUCCESS",
                data: {
                    conversation: newConversation
                }
            });
        }
    } else {
        return callback({
            code: "NOT_VALID_USERNAMES",
            data: {}
        });
    }
}

/**
 * Crée une conversation many to many
 * @param {Object} { token, usernames } 
 * @param {Function} callback 
 * @param {Object} allSockets 
 * @returns callback
 */
async function createManyToManyConversation({ token, usernames }, callback, allSockets) {
    let userSession = jsonwebtoken.verify(token, process.env.SECRET_KEY);

    if (!userSession || userSession.exp * 1000 < Date.now()) {
        return callback({
            code: "NOT_AUTHENTICATED",
            data: {}
        });
    }
    // met à jour "last_activity_at"
    await UserSchema.findOneAndUpdate({ username: userSession.data }, { last_activity_at: new Date().toString() });

    // Défini le titre de la conversation et les particpants
    let title = "Groupe: ";
    let participants = [userSession.data];
    usernames.forEach(username => {
        participants.push(username);

        if (usernames[usernames.length - 1] === username) {
            title += username;
        } else {
            title += username + ', ';
        }
    });
    
    let lenghtTableConv = await ConversationSchema.count({});
    const newConversation = new ConversationSchema({
        id: lenghtTableConv,
        title: "",
        type: "many_to_many",
        participants: participants,
        messages: [],
        theme: "BLUE",
        updated_at: new Date(),
        seen: {},
        typing: {}
    });
    newConversation.participants.forEach(username => {
        newConversation.seen[username] = {
            message_id: -1,
            time: new Date().toISOString()
        };
    });

    try {
        await newConversation.save();
        console.log('Create new conversation many_to_many', {
            newConversation
        });
    } catch (error) {
        console.log({
            error: error
        });
    }

    // Pour chaque participants autres que l'utilisateur, envoie un événement conversationCreated
    for (let username of usernames) {
        let socketUserOfConv = allSockets.find(element => element.name === username);
        if (socketUserOfConv) {
            socketUserOfConv.socket.emit("@conversationCreated", {
                conversation: newConversation
            });
        }
    }
    newConversation.title = title;

    return callback({
        code: "SUCCESS",
        data: {
            conversation: newConversation
        }
    });
}

/**
 * Récupère toutes les conversations pour l'utilisateur
 * @param {Object} { token } 
 * @param {Function} callback 
 * @returns 
 */
async function getConversations({ token }, callback) {
    let userSession = jsonwebtoken.verify(token, process.env.SECRET_KEY);

    if (!userSession || userSession.exp * 1000 < Date.now()) {
        return callback({
            code: "NOT_AUTHENTICATED",
            data: {}
        });
    }
    // met à jour "last_activity_at"
    await UserSchema.findOneAndUpdate({ username: userSession.data }, { last_activity_at: new Date().toString() });

    const conversations = await ConversationSchema.find().exec();
    let conversationsUser = [];

    for (let conversation of conversations) {

        // Si une conversation a été trouvée avec le nom de l'utilisateur 
        if (conversation.length !== 0 && conversation.participants.includes(userSession.data)) {
            // On recrée un objet conversation pour ne pas avoir les contraintes de l'objet mongoose
            let conversationToReturn = {
                _id: conversation._id,
                id: conversation.id,
                title: conversation.title,
                type: conversation.type,
                participants: conversation.participants,
                messages: [],
                theme: conversation.theme,
                updated_at: conversation.updated_at,
                seen: conversation.seen,
                typing: conversation.typing
            };

            // On push les objects message de la bdd dans le tableau messages de conversationToReturn
            for (let message_id of conversation.messages) {
                try {
                    const message = await MessageSchema.findOne({
                        _id: message_id
                    });
                    if (!message.deleted) {
                        conversationToReturn.messages.push(message);
                    }
                } catch (error) {
                    console.log({
                        error: error
                    });
                }
            }

            // Défini le titre de la conversation différent pour chaque utilisateur
            let title = 'Groupe: ';
            conversationToReturn.participants.forEach(participant => {

                if (conversation.participants.length === 2 && participant !== userSession.data) {
                    title = participant;
                } else if (participant !== userSession.data) {

                    if (conversation.participants[conversation.participants.length - 1] === participant) {
                        title += participant;
                    } else {
                        title += participant + ', ';
                    }
                }
            });

            conversationToReturn.title = title;
            conversationsUser.push(conversationToReturn);
        }
    }

    return callback({
        code: "SUCCESS",
        data: {
            conversations: conversationsUser
        }
    });
}

/**
 * Met à jour les participants ayant vu la conversation en envoyant l'information aux participants connectés
 * @param {Object} { token, conversation_id, message_id } 
 * @param {Function} callback 
 * @param {Object} allSockets 
 * @returns 
 */
async function seeConversation({ token, conversation_id, message_id }, callback, allSockets) {
    let userSession = jsonwebtoken.verify(token, process.env.SECRET_KEY);

    if (!userSession || userSession.exp * 1000 < Date.now()) {
        return callback({
            code: "NOT_AUTHENTICATED",
            data: {}
        });
    }
    // met à jour "last_activity_at"
    await UserSchema.findOneAndUpdate({ username: userSession.data }, { last_activity_at: new Date().toString() });

    let conversation = {};

    try {
        conversation = await ConversationSchema.findOne({
            id: conversation_id
        });
    } catch (error) {
        console.log({
            error: error
        });
    }

    // Si une conversation a été trouvé
    if (conversation.length !== 0) {
        conversation.seen[userSession.data] = {
            message_id: message_id,
            time: new Date().toISOString()
        };

        try {
            await ConversationSchema.findOneAndUpdate({
                id: conversation_id
            }, {
                seen: conversation.seen
            });
        } catch (error) {
            console.log({
                error: error
            });
        }

        // On recrée un objet conversation pour ne pas avoir les contraintes de l'objet mongoose
        let conversationToReturn = {
            _id: conversation._id,
            id: conversation.id,
            title: conversation.title,
            type: conversation.type,
            participants: conversation.participants,
            messages: [],
            theme: conversation.theme,
            updated_at: conversation.updated_at,
            seen: conversation.seen,
            typing: conversation.typing
        };

        // On push les objects message de la bdd dans le tableau messages de conversationToReturn
        for (let message_id of conversation.messages) {
            try {
                const message = await MessageSchema.findOne({
                    _id: message_id
                });
                if (!message.deleted) {
                    conversationToReturn.messages.push(message);
                }
            } catch (error) {
                console.log({
                    error: error
                });
            }
        }

        // Envoi un événement conversationSeen à chaque participants de la conversation
        for (let username of conversationToReturn.participants) {
            let socketUserOfConv = allSockets.find(element => element.name === username);

            if (socketUserOfConv) {
                socketUserOfConv.socket.emit("@conversationSeen", {
                    conversation: conversationToReturn
                });
            }
        }

        return callback({
            code: "SUCCESS",
            data: {
                conversation: conversationToReturn
            }
        });
    }
    return callback({
        code: "NOT_FOUND_CONVERSATION",
        data: {}
    });

}

module.exports = {
    getOrCreateOneToOneConversation: getOrCreateOneToOneConversation,
    createManyToManyConversation: createManyToManyConversation,
    getConversations: getConversations,
    seeConversation: seeConversation
};