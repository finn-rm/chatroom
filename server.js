const { uniqueNamesGenerator, adjectives, colors, animals } = require('unique-names-generator');
const TelegramBot = require('node-telegram-bot-api');
const express = require('express');
const app = express();
const fs = require('fs');
const https = require('https');
const config = require('config');
const qrcode = require('wifi-qr-code-generator')
const bodyParser = require('body-parser');

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
app.use(bodyParser.json());

const validTimeFormat = /^(0\d|1\d|2[0-4]|00|24)$/;
const validDateFormat = /^\d{4}-(0[1-9]|1[0-2])-(0\d|1\d|2\d|3[01])$/;

if ( !validTimeFormat.test(helpdeskConfig.startTime) || !validTimeFormat.test(helpdeskConfig.endTime) ) { 
    console.error(turnBackgroundRed(' ERROR '), turnTextRed(`Please update your config/production.json file with a starting and ending time in the format of "HH"`));
    process.exit(1); // Exit the process or handle the error according to your application's logic
}

if ( !validDateFormat.test(helpdeskConfig.startDate) || !validDateFormat.test(helpdeskConfig.endDate) ) { 
    console.error(turnBackgroundRed(' ERROR '), turnTextRed(`Please update your config/production.json file with a starting and ending date in the format of "YYYY-MM-DD"`));
    process.exit(1); // Exit the process or handle the error according to your application's logic
}

app.get('/', (req, res) => {
    res.send('Hello World!');
});

app.get('/config', (req, res) => {
    let chatOpen = isChatOpen();
    res.send({"roomList": helpdeskConfig.roomList, "chatOpen": chatOpen});
});

app.post('/qrcode', (req, res) => {

    const option = req.body;

    const pr = qrcode.generateWifiQRCode({
        ssid: option.ssid,
        password: option.password,
        encryption: 'WPA',
        hiddenSSID: false,
        outputFormat: { type: 'svg' }
    })

    pr.then((data) => res.send({"qrCode": data}));
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

let currentChatState = isChatOpen();
function checkChatOpen(){
    const now = new Date(); // Get the current date and time
    const localIsoString = new Date(now - now.getTimezoneOffset() * 60000).toISOString();
    if ( currentChatState !== isChatOpen() ){
        currentChatState = isChatOpen();

        console.log(`Chat state has changed, now ${currentChatState ? 'OPEN.' : 'CLOSED.'} Local time ${localIsoString}`)

        if ( botPolling == 0 ) {
            const formattedMessage = `Chat state has changed, now ${currentChatState ? 'OPEN.' : 'CLOSED.'} Local time ${localIsoString}`;
            bot.sendMessage(telegramChannelID, formattedMessage, { parse_mode: 'Markdown' }).then(() => {
                console.log('Message sent successfully to Telegram');
            }).catch((error) => {
                console.error(error);
            });
        }
    }
};
setInterval(checkChatOpen, 1000);

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

    const [yearStart, monthStart, dayStart] = helpdeskConfig.startDate.split('-');
    const [yearEnd, monthEnd, dayEnd] = helpdeskConfig.endDate.split('-');
    let openDate = new Date(yearStart, monthStart - 1, dayStart)
    let closeDate = new Date(yearEnd, monthEnd - 1, dayEnd)
    closeDate.setHours(23, 59, 59, 999);

    let openHour = parseInt(helpdeskConfig.startTime, 10);
    let closeHour = parseInt(helpdeskConfig.endTime, 10)

    enableTimeDebug = false;

    if ( enableTimeDebug ){
        console.log("\nCurrent values:")
        console.log("openDate", openDate, "closeDate", closeDate, "currentDate", currentDate)
        console.log("openHour", openHour, "closeHour", closeHour, "currentHour", currentHour)
        console.log("\nTruthy statements:")
        console.log("Before start date:", currentDate < openDate, "After end date:", currentDate > closeDate)
        console.log("Before start time:", currentHour < openHour, "After end time:", currentHour >= closeHour)
    }

    if ( currentDate < openDate || currentDate > closeDate ) { chatOpen = false; }
    if ( currentHour < openHour || currentHour >= closeHour ) { chatOpen = false; }

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