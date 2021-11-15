require('dotenv/config');
const picture_url = require('../services/pictures');
const jsonwebtoken = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const UserSchema = require('../models/UserSchema');

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
                picture_url: picture // TODO: user a enregistré selon le MODEL
            });
            user.save()
                .then((savedUser) => console.log(savedUser))
                .catch(error => console.log({ error: error }));
            userFind = user;
        })
        .catch(error => res.status(500).json({ error: error }));
    }

    let token = jsonwebtoken.sign({ data : process.env.SECRET_KEY }, userFind, { expiresIn: '1h' });

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


module.exports = {
    authenticate : authenticate, 
    getUsers : getUsers
};