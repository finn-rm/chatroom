<template>
  <v-app>
    <v-main>
      <!-- Conditionally render InitialHelp or Chatroom based on showChatroom property -->
      <InitialHelp v-if="!showChatroom" @startChatTest="startChatA"></InitialHelp>
      <Chatroom v-if="showChatroom" :initialMessage="initialMessage" :roomNameString="roomNameString"></Chatroom>
    </v-main>
  </v-app>
</template>

<script setup>
import Chatroom from "../components/chatroom.vue"
import InitialHelp from "../components/initialhelp.vue"
import { ref } from 'vue';

// Define a reactive property to control the visibility of components
const showChatroom = ref(false);
const initialMessage = ref('');
const roomNameString = ref('');

function startChatA(_msg, _room) {
  initialMessage.value = _msg; // Set the initial message
  roomNameString.value = _room;
  showChatroom.value = true;
}

</script>
