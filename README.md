# Chatroom V2

This is a chatroom written in Vuetify/Vue3 to help with monitoring event support requests. Notifications are sent to a [Telegram channel](https://t.me/c/1751689730/1) to quickly let us know when there is problem with our conference equipment. This is not intended as a fully fledged support app, and is simply a glorified notification machine.

![img](https://i.imgur.com/eNi1xii.png)

## Features

* Message history, wiped after a configurable amount of time.
* Intentional implementation of zero auth, allowing for people to use the chat without having to log in to any services or wifi.
* Timer based scheduling for enabling and disabling the chat during OOO hours.
* Limit room names.
* QR code generator for helpful links.
* Telegram integration.
* SSL support.

## Usage

### /\<roomname\>

This sends you to a page to fill out your initial question, then directs you to the chatroom.

### / or /general

If a room name is not specified, or is not in the allowed list of roomname, you'll join the "general" room. There is no difference in this room, apart from having the name "general".

### /admin

This has a list of any chats that are currently open and will allow you to swap between them on a single page. It also displays a notification if you get a message.

### /generate

This allows you to generate a printout page to stick in the breakout rooms. It contains a QR code that links to the chatroom & WiFi details (optional) for that specific room.

## Permanent install

### Install project and dependencies

```*
sudo apt update
sudo apt upgrade
sudo snap install --classic node
sudo snap install --classic certbot
sudo npm install -g npm
sudo apt install nginx

sudo ln -s /snap/bin/certbot /usr/bin/certbot

git clone https://github.com/finn-rm/chatroom.git
cd chatroom
npm install
```

### Setup Telegram bot

1. Log into Telegram and message the [BotFather](https://web.telegram.org/a/#93372553) with `/newbot`.
2. Give the bot a name and ID
3. Copy the ID and add it to `config/production.json`, this is your bot token.
4. Invite the bot to the Telegram chat you will use for notifications.
5. Copy the ID (Bit after the # in the URL) of the Telegram chat, then add it to `config/production.json`, this is your channel ID.

### Enable public access

To validate certificates and host the site to the public we will need to carry out a couple steps:

1. If you have UFW enabled, run: `sudo ufw allow 80,443,3005/tcp`
2. Port forward these to your host machine:
   * 80/tcp - HTTP access for cert renewal, also needed to redirect any http requests.
   * 443/tcp - HTTPS access for the frontend.
   * 3005/tcp - Port used for the websocket server running on the node.js backend.

### Create certificates

If you already have a `fullchain.pem` and `privkey.pem` then you can skip this section and head to [Configure setup files](#configure-setup-files). Otherwise please follow these steps to retrieve both files:

1. Allow HTTP(S) access your machine publicly, this is needed for certbot to obtain the certificates. If you have UFW enabled you will need to run: `sudo ufw allow 80,443/tcp`
2. Run this command to retrieve the certificates: `sudo certbot certonly --standalone -d YOUR_DOMAIN`
3. If successful, both files will be stored in `/etc/letsencrypt/live/YOUR_DOMAIN/` ready for use, keep note of this location.

If you need more information, here is a detailed breakdown on [certbot&#39;s standalone mode](https://www.digitalocean.com/community/tutorials/how-to-use-certbot-standalone-mode-to-retrieve-let-s-encrypt-ssl-certificates-on-ubuntu-22-04).

### Configure setup files

1. Fill out the `config/production.json` file with the values previously discovered from the [setup](#setup-telegram-bot) and [certificate](#create-certificates) stage.

   * **`botToken`**	- This is the Telegram bot token found during the [Telegram Bot Setup](#setup-telegram-bot) section.
   * **`channelID`** 	- This is the ID of the telegram channel you want the messages to be posted to. This was found during the [Telegram Bot Setup](#setup-telegram-bot) section.
   * **`startTime`** 	- This is the hour in which the chat will be open to send messages to. If you set it to 09, the chat will open at 9AM on the dot.
   * **`endTime`** 	- This is the hour that the chat will close and no messages will be able to be sent. If you set it to 20, the chat will close at 8PM on the dot.
   * **`startDate`** 	- This is the date the chat will begin to be open from. It is inclusive, meaning that if you set this to 2023-02-25, the first time the chat will open will be on the 25th at the set `startTime`.
   * **`endDate`** 	- This is the date the chat will end on. It is inclusive, meaning that if you set this to 2023-02-27, the last time the chat will close will be the 27th at the set `endTime`.
   * **`roomList`** 	- This is a list of room names that are allowed to be entered.
   * **`msgExpireTime`**	- This is the amount of seconds it will take for the message/room history to be wiped.
   * **`fullchain & privkey`** 	- This is the file path for the full chain certificate for your domain and the file path for the private key for the certificate.
2. Build the Vue3 project into a static bundle by running:

```
npm run prodclient
```

3. Create the folder to serve the static content by running:

```
sudo mkdir /www
sudo cp -R chatroom/dist/* /www/
```

### NGINX installation for Vue frontend

1. Remove the default nginx demo site with:

```
sudo rm /etc/nginx/sites-enabled/default
```

2. Create a virtual host by creating this example file:

```
# /etc/nginx/sites-enabled/YOUR_DOMAIN

server {
    add_header cache-control no-cache always;
    add_header Last-Modified  "" always;
    etag off;
    if_modified_since off;
    server_name YOUR_DOMAIN;

    location / {
        root /www;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    listen 443 ssl;
    ssl_certificate /etc/letsencrypt/live/YOUR_DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/YOUR_DOMAIN/privkey.pem;
}
server {
    if ($host = YOUR_DOMAIN) {
        return 301 https://$host$request_uri;
    }

    listen 80;
    server_name YOUR_DOMAIN;
    return 404;
}
```

   *Make sure to edit the domain name placeholders ^
   PS:* To quick replace all instances of **`YOUR_DOMAIN`**, run these command:

```*
   DN="REPLACE_ME"
   sudo sed -i "s/YOUR_DOMAIN/$DN/g" /etc/nginx/sites-enabled/$DN
```

3. Start NGINX and enable on reboot by running:

```
sudo systemctl enable nginx --now
```

4. Navigate to your domain and check that the `ZZZ` page is being served with the correct certificates. To access the rest of the site we will need to start the node.js backend.

### Systemd service for Node.js backend

We can now setup the Node.js backend as a service by creating this example file:

```
# /etc/systemd/system/chatroom.service

[Unit]
Description=Chatroom Node.js Server
After=network.target

[Service]
Environment="NODE_ENV=production"
ExecStart=/snap/bin/node /full/path/to/chatroom/server.js
Restart=always
User=EXAMPLE_USER
WorkingDirectory=/full/path/to/chatroom

[Install]
WantedBy=multi-user.target
```

*Make sure to edit the paths and user placeholders ^*

Next, run these commands to enable your service to run on startup and also start the service:

```
sudo systemctl daemon-reload
sudo systemctl enable chatroom.service --now
```

## Development environment

To setup the environment ready for development, follow these steps, otherwise follow the [Permanent install](#permanent-install) section.

1. Copy the `config/production.json` to `config/default.json`.
2. Fill out the `config/default.json` file with the values previously discovered from the setup stage. You will need certificates to start the server, even if they are just self signed.
3. In your first terminal window run `npm run devclient` to start the Vue frontend.
4. In your second terminal window run `npm run devserver` to start the backend Node.js server.
5. Your first terminal will give you an address to browse to, open that and chat away!
