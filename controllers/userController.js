require('dotenv/config');
const picture_url = require('../services/pictures');
const jsonwebtoken = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const UserSchema = require('../models/userSchema');

/**
 * Authentifie l'utilisateur
 * @param {Object} { username, password } 
 * @param {Function} callback 
 * @returns 
 */
async function authenticate({ username, password }, callback) {
    let userFind = await UserSchema.findOne({ username: username }).exec();
    let picture = '';

    if (userFind && userFind.length !== 0) { // si on essaie de se connecter et que le username existe dans la BDD
        let checkPass = await bcrypt.compare(password, userFind.password);

        if (!checkPass) {
            return callback({
                code: "NOT_AUTHENTICATED",
                data: {}
            });
        }
        // met à jour "awake" pour dire que l'utilisateur est connecté
        await UserSchema.findOneAndUpdate({ username: username }, { awake: true });
        picture = userFind.picture_url;
    } else { // sinon, on crée l'utilisateur
        picture = picture_url.getRandomURL();
        
        try {
            let hash = await bcrypt.hash(password, 10);
            const user = new UserSchema({
                username: username,
                password: hash,
                picture_url: picture,
                last_activity_at: new Date(),
                awake: true
            });
            userFind = user;
            let savedUser = await user.save();
            console.log({savedUser});
        }
        catch(error) {
            console.log({ error: error });
        }
    }
    let token = jsonwebtoken.sign({ data: userFind.username }, process.env.SECRET_KEY, { expiresIn: "1h" });
    console.log('Connexion :', username);

    return callback({
        code: "SUCCESS",
        data: {
            "username": username,
            "token": token,
            "picture_url": picture
        }
    });
}

/**
 * Liste des utilisateurs présents
 * @param {Object} { token } vérifie si nous sommes identifiés
 * @param {Function} callback 
 * @returns 
 */
async function getUsers({ token }, callback) {

    if (token) {

        try {
            let decoded = jsonwebtoken.verify(token, process.env.SECRET_KEY);

            if (!decoded || decoded.exp * 1000 < Date.now()) {
                return callback({
                    code: "NOT_AUTHENTICATED",
                    data: {}
                });
            }
            const usersBDD = await UserSchema.find().exec();
            let data = [];
            usersBDD.forEach(user => {
                data.push({ "username": user.username, "picture_url": user.picture_url, "awake": user.awake });
            });
            callback({
                code: "SUCCESS",
                data: {
                    "users": data
                }
            });
        } catch (e) {
            return console.log("Erreur : " + e);
        }
    }
}

/**
 * Envoie "awake : false" à la BDD pour l'utilisateur soit déconnecter
 * @param {String} username 
 * @returns 
 */
async function disconnect(username) {

    if (username) {

        try {
            // met à jour "awake" pour dire que l'utilisateur est déconnecté
            await UserSchema.findOneAndUpdate({ username: username }, { awake: false });
        } catch (e) {
            return console.log("Erreur : " + e);
        }
    }
}

module.exports = {
    authenticate: authenticate,
    getUsers: getUsers,
    disconnect: disconnect
};