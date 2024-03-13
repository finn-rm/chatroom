<template>
  <v-app>
    <v-main>
      <router-view/>
    </v-main>
  </v-app>
</template>

<script>
    export default {
        name: 'vue-title',
        props: ['title'],
        watch: {
            title: {
                immediate: true,
                handler() {
                    document.title = 'Canonical help desk';
                }
            }
        },
        render () {
        },
    }
</script>