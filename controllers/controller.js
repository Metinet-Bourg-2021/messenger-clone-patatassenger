const picture_url = require('../services/pictures');
const jsonwebtoken = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const UserSchema = require('./../models/UserSchema');

function authenticate({ username, password }, callback) {
    let users = UserSchema.find();
    let userFind = users.find(user => user.username === username);
    let picture = '';

    if (userFind) { // si on essaie de se connecter et que le username existe dans la BDD

        if (!bcrypt.compare(userFind.password, password)) {
            return callback({
                code:"NOT_AUTHENTICATED", 
                data:{}
            });
        }
        picture = userFind.picture;
    } 
    else { // sinon, on crée l'utilisateur
        picture = picture_url.getRandomURL();

        bcrypt.hash(password, 10)
        .then(hash => {
            const user = new UserSchema({
                username: username,
                password: hash,
                picture: picture // TODO: user a enregistré selon le MODEL
            });
            user.save()
                .then((savedUser) => console.log(savedUser))
                .catch(error => console.log({ error: error }));
        })
        .catch(error => res.status(500).json({ error: error }));
    }

    let token = jsonwebtoken.sign({ data : 'secrettoken' }, 'patata', { expiresIn: '1h' });

    return callback({
        code:"SUCCESS", 
        data:{
            "username":username,
            "token": token,
            "picture_url": picture
        }
    });
}

function getUsers({token}, callback) { // liste des utilisateurs présents, token -> vérifie si nous sommes identifiés

    if(token) {
        try {
            let decoded = jsonwebtoken.verify(token, 'patata');
            
            if(!decoded) {
                throw "non connecté";
            }
        } catch (e) {
            return console.log("Erreur : "+e);
        }
        callback({code:"SUCCESS", data:{}});
    }
}

function getOrCreateOneToOneConversation({ token, username }, callback) {
    callback({code:"SUCCESS", data:{}});
}

function createManyToManyConversation({ token, usernames }, callback) {
    callback({code:"SUCCESS", data:{}});
}

function getConversations({ token }, callback) {
    callback({code:"SUCCESS", data:{}});
}

function postMessage({ token, conversation_id, content }, callback) {
    callback({code:"SUCCESS", data:{}});
}

function seeConversation({ token, conversation_id, message_id }, callback) {
    callback({code:"SUCCESS", data:{}});
}

function replyMessage({ token, conversation_id, message_id, content }, callback) {
    callback({code:"SUCCESS", data:{}});
}

function editMessage({ token, conversation_id, message_id, content }, callback) {
    callback({code:"SUCCESS", data:{}});
}

function reactMessage({ token, conversation_id, message_id, reaction }, callback) {
    callback({code:"SUCCESS", data:{}});
}

function deleteMessage({ token, conversation_id, message_id, content }, callback) {
    callback({code:"SUCCESS", data:{}});
}

module.exports = {
    authenticate : authenticate, 
    getUsers : getUsers,
    getOrCreateOneToOneConversation : getOrCreateOneToOneConversation,
    createManyToManyConversation : createManyToManyConversation,
    getConversations : getConversations,
    postMessage : postMessage,
    seeConversation : seeConversation,
    replyMessage : replyMessage,
    editMessage : editMessage,
    reactMessage : reactMessage,
    deleteMessage : deleteMessage
};