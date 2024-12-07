const express = require ('express');
const app = express();

const {handleAdminBackendApi}= require('./routes/private/AdminAPI');
const {HandlePublicBackendApi}= require('./routes/public/API');
const {handleStandardUserBackendApi}= require('./routes/private/UserAPI');
const {GetUser, Authenticate, AuthorizedAdmin, AuthorizedStandardUser}= require('./middleware/auth.js');

app.use(Authenticate);

HandlePublicBackendApi(app);

app.use(Authenticate, AuthorizedAdmin, GetUser);

handleAdminBackendApi(app);

app.use(Authenticate, AuthorizedStandardUser, GetUser);

handleStandardUserBackendApi(app);

app.get('/', (req, res)=>
{
    res.send('A simple Node App is running on this server')
    res.end();
})

const PORT = process.env.PORT|| 5000;
app.listen(PORT, console.log(`server sterted on port ${PORT}`))
