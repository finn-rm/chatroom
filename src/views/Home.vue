<template>  
    <v-main>
      <v-container fill-height>
        <v-row justify="center" align="center" no-gutters class="grey">
          <v-col cols="7" align="center" xs12 sm8 md8 lg8 class="grey lighten-5 pa-10">
            <div class="mb-7 text-h2 text-center">Welcome to the Canonical help desk!</div>
            <v-img style="max-height: 300px" src="/logo.png"></v-img>
            <v-form ref="form">
              <v-text-field
                class="pt-10"
                label="Which room are you in?"
                v-model="roomName"
              ></v-text-field>
              <div height="100px" class="mt-0" dense></div>
            </v-form>
            <v-btn 
              height="50px" 
              tile 
              ripple 
              depressed 
              block 
              color="secondary" 
              @click="joinChat"
              :disabled="roomName.length === 0 || roomName.trim().length === 0"
            >
              Join chatroom
            </v-btn>
            <div class="pt-3"></div>
          </v-col>
        </v-row>
      </v-container>
    </v-main>
  </template>
      
  <script>
  export default {
    data() {
      return {
        roomName: '', // Add a data property to hold the content of the textarea
      };
    },
    methods: {
      joinChat() {
        if (this.roomName) {
          window.location.assign(`${window.location.href}${this.roomName.replace(/ /g, '-')}`);
        }
      }
    }
  };
  </script>
  