# Chatroom V2

This is a chatroom written in Vuetify/Vue3 to help with monitoring support requests for events. It also sends the output of the chat to a [Telegram channel](https://t.me/c/1751689730/1) that we use for event support.

![img](https://i.imgur.com/eNi1xii.png)

## Usage

### /

This is just the generic landing page, it prompts you to enter a room name and you'll get redirected there.

### /admin

This has a list of any chats that are currently open and will allow you to swap between them on a single page. It also displays a notification if you get a message.

### /generate

This allows you to generate a printout page to stick in the breakout rooms. It contains a QR code that links to the chatroom for that specific room.

### /\<roomname\>

This sends you to a page to fill out your initial question, then directs you to the chatroom.

## Install project

```
npm install
```

### Configure project

1. Log into Telegram and message the [BotFather](https://web.telegram.org/a/#93372553) with `/newbot`.
2. Give the bot a name and ID
3. Copy the ID and add it to `config/default.json`
4. Copy the ID (Bit after the # in the URL) of a Telegram chat and add it to `config/default.json`.

### Run project

```bash
npm run server; npm run client
```
