const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const bcrypt = require('bcryptjs');
const ws = require('ws');
const User = require('./models/User.js');
const Message = require('./models/Message.js');
const fs = require('fs');
const path = require('path');
const base64url = require('base64url');

dotenv.config();
mongoose.connect(process.env.MONGO_URL);
const jwtsecret = process.env.JWT_SECRET;
const bcryptSalt = bcrypt.genSaltSync(10);

const app = express();
app.use(bodyParser.json());
app.use(cookieParser());
app.use('/uploads' , express.static(path.join(__dirname , 'uploads')));
app.use(cors({
    credentials:true,
    origin:process.env.CLIENT_URL,
}));

app.get('/test' , (req , res) => {
    res.json('test ok');
});

app.get('/profile' , (req , res) => {
    const token = req.cookies?.token;
    if (token) {
        jwt.verify(token , jwtsecret , {} , (err , userData) => {
            if (err) throw err;
            res.json(userData);
        });
    } else {
        res.status(401).json('no token');
    }
    
});

async function getUserDataFromReq(req) {
    return new Promise((resolve , reject) => {
        const token = req.cookies?.token;
        if (token) {
            jwt.verify(token , jwtsecret , {} , (err , userData) => {
                if (err) throw err;
                resolve(userData);
            });
        } else {
            reject('no token');
        }
    });
}

app.get('/messages/:userId' , async (req , res) => {
    const {userId} = req.params;
    const userData = await getUserDataFromReq(req);
    const ourUserId = userData.userId;
    const messages = await Message.find({
        sender:{$in:[userId , ourUserId]},
        recipient:{$in:[userId , ourUserId]},
    }).sort({createdAt:1});
    res.json(messages)
});

app.get('/people' ,async (req , res) => {
    const users = await User.find({} , {'_id':1,username:1});
    res.json(users);
})



app.post('/login' , async (req , res) => {
    const {username , password} = req.body;
    const foundUser = await User.findOne({username});
    if (foundUser) {
        const passOk = bcrypt.compareSync(password , foundUser.password);
        if (passOk) {
            jwt.sign({userId : foundUser._id , username} , jwtsecret , {} , (err , token) => {
                res.cookie('token' , token).json({
                    id:foundUser._id
                })
            });
        }
    }
})

app.post('/logout' , (req , res) => {
    res.cookie('token' , '').json('ok');
});


app.post('/register' , async (req , res) => {
    const {username , password} = req.body;
    const hashedPassword = bcrypt.hashSync(password , bcryptSalt);
    const createdUser = await User.create({
        username:username ,
        password:hashedPassword
    });
    jwt.sign({userId:createdUser._id ,username}  , jwtsecret , {} , (err , token) =>{
        if (err) throw err ;
        res.cookie('token' , token ).status(201).json({
            id : createdUser._id,
        });
    })
});

const server = app.listen(4040); 


const wss = new ws.WebSocketServer({server});
wss.on('connection' , (connection , req) => {

    function notifyToOnlinePeople() {
        [...wss.clients].forEach(client => {
            client.send(JSON.stringify({
                online : [...wss.clients].map(c => ({userId:c.userId , username:c.username})),
            }))
        })
    }

    connection.isAlive = true;

    connection.timer = setInterval(() => {
        connection.ping();
        connection.deathTimer = setTimeout(() => {
            connection.isAlive = false;
            clearInterval(connection.timer)
            connection.terminate();
            notifyToOnlinePeople();
            console.log('death');
        }, 1000);
    }, 5000);

    connection.on('pong' , () => {
        clearTimeout(connection.deathTimer);
    })

    const cookies = req.headers.cookie;
    if (cookies) {
        const tokenCookieString = cookies.split(';').find(str => str.startsWith('token='));
        if  (tokenCookieString) {
            const token = tokenCookieString.split('=')[1];
            if (token) {
                jwt.verify(token , jwtsecret , {} , (err , userData)=>{
                    if (err) throw err;
                    const {userId , username} = userData;
                    connection.userId = userId;
                    connection.username = username;
                })
            }
        }
    }


    connection.on('message' , async (message) => {
        const messageData = JSON.parse(message.toString());
        const {recipient , text , file } = messageData;
        let filename = null;
        if (file) {
            const parts = file.name.split('.');
            const ext = parts[parts.length -  1];
            filename = Date.now()+'.'+ext ;
            const uploadDirectory = path.join(__dirname, 'uploads');
            const filePath = path.join(uploadDirectory, filename);
            const bufferData = Buffer.from(file.data.split(',')[1] , 'base64');
            fs.writeFile(filePath , bufferData , (err) => { 
                if (err) {
                    console.error('Error saving file:', err);
                } else {
                    console.log('File saved:', filePath);
                }
            });
        }
        if (recipient && (text || file)) {
            const messageDoc = await Message.create({
                sender:connection.userId,
                recipient, 
                text,
                file: file ? filename : null ,
            });
            [...wss.clients].filter(c => c.userId === recipient)
            .forEach(c => c.send(JSON.stringify({
                text,
                sender:connection.userId,
                recipient,
                file: file ? filename : null,
                _id:messageDoc._id
            })));
        }
    });

    notifyToOnlinePeople();
});