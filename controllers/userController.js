require('dotenv/config');
const picture_url = require('../services/pictures');
const jsonwebtoken = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const UserSchema = require('../models/userSchema');

async function authenticate({ username, password }, callback) {
    let userFind = await UserSchema.find({username : username}).exec();
    let picture = '';

    if (userFind.length !== 0) { // si on essaie de se connecter et que le username existe dans la BDD
        userFind = userFind[0];
        let checkPass = await bcrypt.compare(password, userFind.password);
        
        if (!checkPass) {
            return callback({
                code:"NOT_AUTHENTICATED", 
                data:{}
            });
        }
        picture = userFind.picture_url;
    } 
    else { // sinon, on crée l'utilisateur
        picture = picture_url.getRandomURL();

        bcrypt.hash(password, 10)
        .then(hash => {
            const user = new UserSchema({
                username: username,
                password: hash,
                picture_url: picture,
                last_activity_at: new Date()
            });
            userFind = user;
            user.save()
                .then((savedUser) => console.log(savedUser))
                .catch(error => console.log({ error: error }));
        })
        .catch((error) => {
            return console.log({ error: error })
        });
    }
    let token = jsonwebtoken.sign({data : userFind.username}, process.env.SECRET_KEY, { expiresIn: "1h" });

    return callback({
        code:"SUCCESS", 
        data:{
            "username":username,
            "token": token,
            "picture_url": picture
        }
    });
}

async function getUsers({token}, callback) { // liste des utilisateurs présents, token -> vérifie si nous sommes identifiés
    
    if(token) {

        try {
            let decoded = jsonwebtoken.verify(token, 'patata');
            
            if(!decoded) {
                throw "non connecté";
            }
            const usersBDD = await UserSchema.find().exec();
            let data = [];
            data.forEach(user => {
                data.push({"username" : user.username, "picture_url" : user.picture_url, "awake": true})
            });
            callback({
                code:"SUCCESS", 
                data:{
                    "users": data
                }
            });
        } catch (e) {
            return console.log("Erreur : "+e);
        }
    }
}


module.exports = {
    authenticate : authenticate, 
    getUsers : getUsers
};