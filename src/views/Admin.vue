<template>
  <v-app>
    <v-main>
      <v-navigation-drawer v-model="drawer" permanent :rail="rail" @click="rail = false">
        <v-list-item title="Room list" :prepend-icon="rail ? 'mdi-chevron-right' : ''">
          <template v-slot:append>
            <v-btn
              variant="text"
              :icon="rail ? '' : 'mdi-chevron-left'"
              @click.stop="rail = !rail"
            ></v-btn>
          </template>
        </v-list-item>
        <v-divider></v-divider>
        <!-- Conditional rendering of rooms or message -->
        <v-list-item v-if="rooms.length > 0" v-for="room in rooms" :key="room" @click="openChat(room)">
          <v-icon :icon="getIcon(room)" :color="getColour(room)" slot="prependIcon"></v-icon>
          {{ !rail ? room : '' }}
        </v-list-item>
        <v-list-item v-else>
          <v-icon  v-if="!rail" slot="prependIcon"></v-icon>
          {{ !rail ? 'No rooms open :)' : '' }}
        </v-list-item>
        <template v-slot:append>
          <div class="pa-2">
            <v-btn block @click="closeChat()">
              {{ !rail ? 'Close chat' : '' }}
              <v-icon v-if="rail" icon="mdi-close-circle" slot="prependIcon"></v-icon>
            </v-btn>
            <v-btn href="/generate" class="mt-1" block @click="settings()">
              {{ !rail ? 'Generate QR codes' : '' }}
              <v-icon v-if="rail" icon="mdi-cog" slot="prependIcon"></v-icon>
            </v-btn>
          </div>
        </template>
      </v-navigation-drawer>
      
      <Chatroom
        :key="roomNameString"
        v-if="showChatroom"
        :initialMessage="initialMessage"
        :roomNameString="roomNameString"
      ></Chatroom>
    </v-main>
  </v-app>
</template>

<script setup>
import io from 'socket.io-client';
import Chatroom from "../components/chatroom.vue";
import { ref } from 'vue';

const showChatroom = ref(false);
const roomNameString = ref('');
const initialMessage = ref('');
const roomsWithNewMessages = ref([]);
let intervalId;

const socket = io(`${window.location.protocol}//${window.location.hostname}:3005`);
const rooms = ref([]);
const drawer = ref(true);
const rail = ref(false);

socket.emit('getRoomInfo');

socket.on('giveRoomInfo', (data) => {
  console.log('Received new room data')
  rooms.value = data.map(element => element.roomName);
});

socket.on('newMsgAlert', (_msg, _roomName, _UUID) => {
  console.log(_msg, _roomName);
  const storedUUID = getCookie('UUID');
  if (rooms.value.includes(_roomName) && storedUUID !== _UUID) {
    roomsWithNewMessages.value.push(_roomName);
    intervalId = setInterval(() => {
      document.title = (document.title === 'New message!') ? `${roomNameString.value} chatroom` : 'New message!';
    }, 1000);
  }
});

function getIcon(room) {
  return roomsWithNewMessages.value.includes(room) ? 'mdi-chat-alert' : 'mdi-chat';
}

function getColour(room) {
  return roomsWithNewMessages.value.includes(room) ? 'error' : '';
}

function openChat(room){
  const index = roomsWithNewMessages.value.indexOf(room);
  if (index !== -1) {
    roomsWithNewMessages.value.splice(index, 1);
  }

  showChatroom.value = false;
  initialMessage.value = ''; 
  roomNameString.value = room;
  showChatroom.value = true;

  clearInterval(intervalId);
  document.title = `${room} chatroom`;
}

function closeChat(){
  showChatroom.value = false;
  initialMessage.value = ''; 
  roomNameString.value = '';
  document.title = `Canonical help desk`;
}

function settings(){
  console.log('Open settings')
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
