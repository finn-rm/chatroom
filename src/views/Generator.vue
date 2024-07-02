<template>  
    <v-main>
        <v-container fill-height v-if="!showQRCode"> 
          <v-row justify="center" align="center" no-gutters class="grey">
            <v-col align="center" xs12 sm8 md8 lg8 class="grey lighten-5 pa-10">
              <div class="mb-7 text-h2 text-center">What are all your room names?</div>
                <v-form ref="form">
                <v-textarea v-model="rooms" label="Type a list of room names separated with commas"></v-textarea>
                <div height="100px" class="mt-0" dense label="Onthoud mij"></div>
                <v-checkbox v-model="wifi" label="Generate WiFi QR code?"></v-checkbox>
                <v-text-field v-model="ssid" v-if="wifi" label="SSID"></v-text-field>
                <v-text-field v-model="password" v-if="wifi" label="Password"></v-text-field>
                </v-form>
              <v-btn height="50px" tile ripple depressed block color="secondary" @click="generateQRcode">Generate</v-btn>
              <div class="pt-3">
                <v-divider></v-divider>
                <div class="pt-1 d-block caption text-center">Maintained by <a href="https://chat.canonical.com/canonical/messages/@finn-rm">@finn-rm</a>, scream loudly or msg me if it breaks.</div>
              </div>
            </v-col>
          </v-row>
      </v-container>

      <v-container v-for="(room, index) in roomList" :key="index" v-if="showQRCode">
        <div>
          <div class="font-weight-bold text-h2 text-red text-bold" align="center">Need tech support?</div>
          <div class="text-h4 pt-10 pb-10" align="center">Scan the QR code below to get help from event support instantly!</div>
          <qrcode-vue class="pb-15" :size="500" align="center" :text="generateQRCodeUrl(room)"></qrcode-vue>
          <div class="text-h5 pt-15 text-blue-grey-lighten-3" align="center">Or visit <a class="text-blue-grey-lighten-3" :href="`${origin}/${room}`">{{origin}}/{{ room }}</a></div>
          <p :style="{ 'page-break-before': isNotLastRoom(index, 'qr') ? 'always' : 'auto' }"></p>
        </div>
        <div v-if="wifi">
          <div class="pt-4 font-weight-bold text-h2 text-red text-bold" align="center">Need WiFi?</div>
          <div class="text-h4 pt-10 pb-3" align="center">Scan the QR code below to get connected!</div>
          <div style="width: 650px; margin: 0 auto;" v-html="qrCodeData"></div>
          <div class="text-h5 pt-8 text-blue-grey-lighten-3" align="center">SSID: {{ ssid }} | PW: {{ password }}</div>
          <p :style="{ 'page-break-before': isNotLastRoom(index, 'wifi') ? 'always' : 'auto' }"></p>
        </div>
      </v-container>
    </v-main>
</template>
    


<script>
import { ref } from 'vue';
import QrcodeVue from 'vue-qrcode-component';

export default {
    setup() {
        const showQRCode = ref(false);
        const rooms = ref('');
        const wifi = ref('');

        const ssid = ref('');
        const password = ref('');
        const qrCodeData = ref('');

        async function generateQRcode() {

          if ( !rooms.value ) { window.alert('Enter some room names.'); return; }
          if ( (!ssid.value || !password.value) && wifi.value ) { window.alert('Enter a SSID and password.'); return; }
          
          if ( wifi.value ) {
            await fetchQRCodeImage();
          }

          showQRCode.value = true;
          roomList.value = rooms.value.split(',').map(item => item.trim().replace(/ /g, '-'));
          function scroll() {
            console.log(!(window.innerHeight + window.scrollY >= document.documentElement.scrollHeight));
            if (!(window.innerHeight + window.scrollY >= document.documentElement.scrollHeight)) {
              window.scrollTo(0, window.scrollY + 300);
              setTimeout(scroll, 10);
            } else {
              delay(500).then(()=> window.print())
            }
          }
          delay(500).then(() => scroll());
        }

        function generateQRCodeUrl(roomName) {
            return `${window.location.origin}/${roomName}`;
        }

        async function fetchQRCodeImage() {
          try {
              const data = { ssid: ssid.value, password: password.value };
              const response = await fetch(`${window.location.protocol}//${window.location.hostname}:3005/qrcode`, {
                  method: 'POST',
                  headers: {
                      'Content-Type': 'application/json'
                  },
                  body: JSON.stringify(data)
              });

              if (!response.ok) {
                  throw new Error('Network response was not ok');
              }

              const res = await response.json();
              
              qrCodeData.value = res.qrCode;

              console.log(qrCodeData.value);

          } catch (error) {
              // Handle errors during the fetch
              console.error('There was a problem with the fetch operation:', error);
          }
        }

        const roomList = ref([]);
        return {
            showQRCode,
            generateQRcode,
            rooms,
            wifi,
            generateQRCodeUrl,
            roomList,
            ssid,
            password,
            qrCodeData
        };
    },
    components: {
        QrcodeVue
    },
    computed: {
        origin() { return document.location.origin; }
    },
    methods: {
    isNotLastRoom(index, divType) {
      if ( divType === 'qr' ) {
        if ( this.wifi ) {
          return true;
        } else {
          return index < this.roomList.length - 1;
        }
      } else {
        return index < this.roomList.length - 1;
      }
      
    }
  },
}

function delay(time) {
  return new Promise(resolve => setTimeout(resolve, time));
}
</script>
