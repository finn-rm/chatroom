<template>
  <v-app-bar color="blue" app>
    <v-toolbar-title class="white--text">{{ roomName }}</v-toolbar-title>
  </v-app-bar>

  <v-container class="fill-height">
    <v-row class="fill-height pb-14" align="end">
      <v-col>
        <div class="message-container" ref="messageContainer">
          <div
            v-for="(message, index) in messages"
            :key="index"
            :class="['d-flex flex-row align-center my-2', message.from == 'user' ? 'justify-end' : null]"
          >
            <span v-if="message.from == 'user'" class="blue--text mr-3">{{ message.msg }}</span>
            <v-avatar :color="message.from == 'user' ? 'indigo' : 'red'" size="36">
              <span class="white--text">{{ message.username[0] }}</span>
            </v-avatar>
            <span v-if="message.from != 'user'" class="blue--text ml-3">{{ message.msg }}</span>
          </div>
        </div>
      </v-col>
    </v-row>
  </v-container>

  <v-footer app>
    <v-row>
      <v-col>
        <div class="d-flex flex-row align-center">
          <v-text-field hide-details v-model="msg" @keyup.enter="sendMessage" placeholder="Type Something"></v-text-field>
          <v-btn ref="sendButton" icon class="ml-4" @click="sendMessage"><v-icon>mdi-send</v-icon></v-btn>
        </div>
      </v-col>
    </v-row>
  </v-footer>

</template>

<script>
import io from 'socket.io-client';

let UUID = '';
let randomName = '';

export default {
  props: {
    initialMessage: String, // Define a prop to receive the initial message
    roomNameString: String,
  },

  data() {
    return {
      msg: '',
      messages: []
    };
  },

  methods: {
    sendMessage() {
      this.socket.emit('sendMsg', this.msg);
      this.msg = '';
    },
    scrollToBottom() {
      const container = this.$refs.messageContainer;
      container.scrollTop = container.scrollHeight;
    }
  },

  computed: {
    roomName() {
      // Extract the room name from the title text
      const titleText = 'Help room for ' + this.roomNameString
      return titleText;
    }
  },
  watch: {
    roomNameString(newVal){
      // This does not run the this.socket.on('giveClientCreds');
      return;
      this.socket = io(`${window.location.protocol}//${window.location.hostname}:3005`);

      const storedUUID = getCookie('UUID');
      console.log('I have', storedUUID, 'previously stored.')
      this.socket.emit('connectToRoom', this.roomNameString, storedUUID)
    }
  },
  mounted() {
    this.socket = io(`${window.location.protocol}//${window.location.hostname}:3005`);

    const storedUUID = getCookie('UUID');
    console.log('I have', storedUUID, 'previously stored.')
    this.socket.emit('connectToRoom', this.roomNameString, storedUUID)

    this.socket.on('giveClientCreds', (_UUID, _randomName) => {
      UUID = _UUID;
      randomName = _randomName
      document.cookie = `UUID=${UUID}`;

      console.log('I received the name:', randomName);
      console.log('I received the ID:', UUID);
      this.$refs.sendButton.$el.click();
    })

    this.socket.on('recieveMsg', (_msg, _UUID, _randomName) => {
      console.log('MSG RECEIVED:', _msg, _UUID, _randomName)

      const message = {
        from: _UUID == UUID ? 'user' : 'remote',
        msg: _msg,
        username: _randomName
      };

      this.messages.push(message);
      this.$nextTick(() => this.scrollToBottom());
    })

    this.socket.on("debug", (arg) => {
      console.log(arg);
    });

    // Use the initialMessage prop
    if (this.initialMessage) {
      this.msg = this.initialMessage;
    }
  },

  beforeUnmount() {
    this.socket.disconnect(); // Disconnect the socket when the component is unmounted
  }
}

function getCookie(cookieName) {
  const name = cookieName + "=";
  const decodedCookie = decodeURIComponent(document.cookie);
  const cookieArray = decodedCookie.split(';');
  for(let i = 0; i < cookieArray.length; i++) {
    let cookie = cookieArray[i];
    while (cookie.charAt(0) === ' ') {
      cookie = cookie.substring(1);
    }
    if (cookie.indexOf(name) === 0) {
      return cookie.substring(name.length, cookie.length);
    }
  }
  return "";
}
</script>

<style scoped>
.message-container {
  max-height: 700px; /* Set a maximum height for the container */
  overflow-y: auto; /* Enable vertical scrolling */
}

.v-text-field {
  
}
</style>
