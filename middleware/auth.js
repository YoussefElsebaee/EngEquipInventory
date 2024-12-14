const db = require('../connectors/db');
const {getSessionToken,getUser} = require('../utils/session');

async function authMiddleware(req, res, next) {
    const sessionToken = getSessionToken(req);
    //console.log(sessionToken)
    if (!sessionToken) {
      console.log("sesison token is null")
      return res.status(301).redirect('/');
    }
    // We then get the session of the user from our session map
    // that we set in the signinHandler
    const userSession = await db.select('*').from('public.session').where('token', sessionToken).first();
    if (!userSession) {
      console.log("user session token is not found")
      // If the session token is not present in session map, return an unauthorized error
      return res.status(301).redirect('/b');
    }
    // if the session has expired, return an unauthorized error, and delete the 
    // session from our map
    if (new Date() > userSession.expiresAt) {
      console.log("expired session");
      return res.status(301).redirect('/c');
    }
    const user = await db.select('user_id', 'role').from('public.users').where('user_id', userSession.userId).first();
    
    if (!user) {
        console.log("user not found");
        return res.status(301).redirect('/');
    }

    // Attach user details to req.user for later use
    req.user = user;
    
    // Proceed to next middleware or route handler
  
    // If all checks have passed, we can consider the user authenticated
    next();
  };

  module.exports = {authMiddleware };


