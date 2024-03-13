<template>  
  <v-main>
     <v-container fill-height>
        <v-row justify="center"
              align="center"
              no-gutters
                class="grey">
          <v-col align="center" xs12 sm8 md8 lg8 class="grey lighten-5 pa-10">
            <div class="mb-7 text-h2 text-center">What do you need assistance with in {{pageName}}?</div>
              <v-form ref="form">
              <v-textarea label="Ask a question" v-model="question"></v-textarea>
              <div height="100px" class="mt-0" dense label="Onthoud mij"></div>
              </v-form>
            <v-btn height="50px" tile ripple depressed block color="secondary" @click="startChat">Send</v-btn>
            <div class="pt-3">
              <v-divider></v-divider>
              <div class="d-block caption text-center">Still no reply? Tag sup-events in <a href="https://chat.canonical.com/">Mattermost</a></div>
            </div>
          </v-col>
        </v-row>
    </v-container>
  </v-main>
</template>
  
<script>
  export default {
    data() {
      return {
        question: '' // Add a data property to hold the content of the textarea
      };
    },
    computed: {
      pageName() {
        return window.location.pathname.substring(1);
      },
    },
    methods: {
      startChat() {
        this.$emit("startChatTest", this.question, this.pageName); // Emit the content of the textarea
      }
    }
  };
</script>
  