function decodeToken(token){
    let decoded = jsonwebtoken.verify(token, process.env.SECRET_KEY);
    try {
        if (!decoded) {
            throw "non connecté";
        }
    } catch (e) {
        console.log("Erreur : " + e);
        return null
    }
    return decoded;
}

module.exports= { decodeToken: decodeToken}