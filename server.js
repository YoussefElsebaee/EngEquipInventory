const express = require ('express');
const app = express();
const bodyParser = require("body-parser");
const {handleAdminBackendApi}= require('./routes/private/AdminAPI');
const {HandlePublicBackendApi}= require('./routes/public/API');
const {handleStandardUserBackendApi}= require('./routes/private/UserAPI');
const {authMiddleware}= require('./middleware/auth.js');

app.use(bodyParser.json());

HandlePublicBackendApi(app);

app.use(authMiddleware);
handleStandardUserBackendApi(app);
handleAdminBackendApi(app);

app.get('/', (req, res)=>
{
    res.send('A simple Node App is running on this server')
    res.end();
})

const PORT = process.env.PORT|| 5000;
app.listen(PORT, console.log(`server sterted on port ${PORT} on http://localhost:5000/`))
//console.log("Server is now listening at port 5000 on http://localhost:5000/");
