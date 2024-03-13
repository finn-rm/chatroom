const { uniqueNamesGenerator, adjectives, colors, animals } = require('unique-names-generator');
const TelegramBot = require('node-telegram-bot-api');
const express = require('express');
const app = express();
const fs = require('fs');
const https = require('https');
const config = require('config');

const fullChain = config.get('certs.fullChain');
const privkey = config.get('certs.privkey');

const options = {
    cert: readFileSyncSafe(fullChain),
    key: readFileSyncSafe(privkey)
};

const server = https.createServer(options, app);
const cors = require('cors');
const io = require("socket.io")(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

const port = 3005;
const telegramBotToken = config.get('telegram.botToken');
const telegramChannelID = config.get('telegram.channelID');
const helpdeskConfig = config.get('helpdesk');
const bot = new TelegramBot(telegramBotToken, { polling: true });
let botPolling = 0;

let rooms = []
let idNameDic = []

app.use(cors());

app.get('/', (req, res) => {
    res.send('Hello World!');
});

app.get('/config', (req, res) => {
    let chatOpen = isChatOpen();
    res.send({"roomList": helpdeskConfig.roomList, "chatOpen": chatOpen});
});

server.listen(port, () => {
    console.log(`Server is running at https://localhost:${port}`);
});

io.on('connection', async (socket) => {
    let randomName = null
    let UUID = null

    console.log('a user connected', socket.id);

    // Check for old messages
    rooms.forEach(room => {
        const currentTime = Date.now();
        const timeLimit = 600 * 1000; // 60 seconds in milliseconds

        room.messageLog = room.messageLog.filter(msg => (currentTime - msg.timestamp) <= timeLimit);
        
    })

    socket.on('getRoomInfo', () => {
        io.to(socket.id).emit('giveRoomInfo', rooms)
    })

    socket.on('connectToRoom', (roomName, _currentUUID) => {
        currentUUID = idNameDic.filter(record => record.UUIDs === _currentUUID);
        if ( currentUUID.length ) {
            // If we have a record for the UUID supplied by the client
            randomName = currentUUID[0].randomName
            UUID = currentUUID[0].UUIDs
            idNameDic.forEach(idName => {
                if (idName.UUIDs === currentUUID){
                    idName.socketID = socket.id;
                }
            })
        } else {
            // If we DONT have a record for the UUID supplied by the client
            randomName = uniqueNamesGenerator({ dictionaries: [animals] }); // big_red_donkey
            UUID = Math.random().toString(36).substring(7);
            idNameDic.push({'socketID':socket.id,'UUIDs':UUID,'randomName':randomName});
        }

        io.to(socket.id).emit('giveClientCreds', UUID, randomName)
        socket.join(roomName);

        let existingRoom = rooms.find(room => room.roomName === roomName);

        if (existingRoom) {
            existingRoom.UUIDs.push(UUID);
        } else { 
            rooms.push({ "roomName": roomName, "UUIDs": [UUID], 'messageLog':[]});
        }

        rooms.forEach(room => {
            if (room.roomName !== roomName) { return; }
            room.messageLog.forEach(msgHolder => {
                io.to(socket.id).emit('recieveMsg', msgHolder.msg, msgHolder.UUIDs, msgHolder.randomName);  
            })
        })

        io.emit('giveRoomInfo', rooms)
        
        console.log('ROOM LIST:')
        console.log(rooms)
        /**
        console.log('NAME LIST:')
        console.log(idNameDic)
        */
    });

    socket.on('disconnect', () => {   // Emits a status message to the connected room when a socket client is disconnected
        console.log(randomName, '(', UUID, ') has left')
        // Loop through all rooms

        rooms.forEach(room => {
            // Check if the disconnected socket is part of this room
            if (room.UUIDs.includes(UUID)) {
                // Remove UUID from the room's UUIDs
                room.UUIDs = room.UUIDs.filter(id => id !== UUID);
            }
            if (room.UUIDs.length === 0 && room.messageLog.length === 0) {
                // Find the index of the room object in the array
                const index = rooms.findIndex(r => r.roomName === room.roomName);
    
                // If found, remove the room object from the array
                if (index !== -1) {
                    rooms.splice(index, 1);
                }
            }
        });

        // idNameDic = idNameDic.filter(item => item.UUIDs !== UUID);

        /** 
        console.log('ROOM LIST:')
        console.log(rooms);
        console.log('NAME LIST:')
        console.log(idNameDic)
        */
    })

    socket.on('sendMsg', (msg) => {
        if ( !isChatOpen() ) { return; }
        const currentSender = idNameDic.filter(item => item.UUIDs === UUID)[0];
        currentRoom = getCurrentRoom(UUID);

        if ( !currentRoom ) { return; }
        if ( !msg ) { return; }

        rooms.forEach(room => {
            if (room.roomName === currentRoom){
                console.log('Recieved a msg:',msg,'from room',room)
                room.messageLog.push({'msg':msg,'UUIDs':currentSender.UUIDs,'randomName':currentSender.randomName,'timestamp':Date.now()})
            }
        })

        io.to(currentRoom).emit('recieveMsg', msg, currentSender.UUIDs, currentSender.randomName);
        io.emit('newMsgAlert', msg, currentRoom, currentSender.UUIDs);

        const formattedMessage = `Message from ${currentSender.randomName} in room *${currentRoom}*:\n\`\`\` ${msg} \`\`\``;
        bot.sendMessage(telegramChannelID, formattedMessage, { parse_mode: 'Markdown' }).then(() => {
            console.log('Message sent successfully to Telegram');
        }).catch((error) => {
            console.error(error);
        });
    })
});

// Function to check if the bot is still responsive
function checkBotConnection() {
    bot.getMe().then(me => {
        botPolling = 0;
    }).catch(error => {
        console.error('Error checking bot connection:', error.message);
    });
}
setInterval(checkBotConnection, 1000);


bot.on('polling_error', (error) => {
    if ( error.response.statusCode == 409 ){
        console.error(turnBackgroundRed(' ERROR '), turnTextRed(`Retry count ${botPolling}: Another instance of your Telegram bot is already running. Only once instance per token is allowed.`));
    } else if ( error.response.statusCode == 404 ) {
        console.error(turnBackgroundRed(' ERROR '), turnTextRed(`Retry count ${botPolling}: Could not connect to Telegram bot, please double check your config/production.json file`));
    }
    botPolling += 1;

    if ( botPolling > 10 ) { process.exit(1) }
});

function getCurrentRoom(UUIDs) {
    for (const room of rooms) {
        if (room.UUIDs.includes(UUIDs)) {
            return room.roomName;
        }
    }
    return null; // If UUIDs is not found in any room
}

function isChatOpen(){

    currentDate = new Date()
    currentHour = currentDate.getHours()
    let chatOpen = true;

    if (currentDate < helpdeskConfig.startDate || currentDate > helpdeskConfig.endDate ) { chatOpen = false; }
    if (currentHour < helpdeskConfig.startTime || currentHour > helpdeskConfig.endTime ) { chatOpen = false; }

    return chatOpen
}

function readFileSyncSafe(filePath) {
    try {
        return fs.readFileSync(filePath);
    } catch (error) {
        if (error.code === 'ENOENT') {
        console.error(turnBackgroundRed(' ERROR '), turnTextRed(`Please update your config/production.json file to include a valid certificate path, currently set to:`), filePath);
        } else {
        console.error(turnBackgroundRed(' ERROR '), turnTextRed(`Please update your config/production.json file to include a valid certificate, currently set to:`), filePath);
        }
        process.exit(1); // Exit the process or handle the error according to your application's logic
    }
}
  
function turnTextRed(text) {
return `\x1b[31m${text}\x1b[0m`;
}
  
function turnBackgroundRed(text) {
return `\x1b[41m\x1b[37m${text}\x1b[0m`;
}