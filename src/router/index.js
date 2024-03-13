import { createRouter, createWebHistory } from 'vue-router'
import HelpDesk from '../views/Helpdesk.vue'
import Home from '../views/Home.vue'
import Admin from '../views/Admin.vue'
import Generator from '../views/Generator.vue'
import zzz from '../views/zzz.vue'

let allowedRooms = [];
let chatOpen
let router

async function fetchData() {
  try {
      const response = await fetch(`${window.location.protocol}//${window.location.hostname}:3005/config`);

      if (!response.ok) {
          throw new Error('Network response was not ok');
      }

      const data = await response.json();
      chatOpen = data.chatOpen;
      allowedRooms = data.roomList;

  } catch (error) {
      // Handle errors during the fetch
      console.error('There was a problem with the fetch operation:', error);
  }
}

await fetchData();

const routes = [
  {
    path: '/zzz',
    name: 'zzz',
    component: zzz
  },
  {
    path: '/',
    name: 'home',
    redirect: { name: 'general' }
  },
  {
    path: '/admin',
    name: 'admin',
    component: Admin
  },
  {
    path: '/generate',
    name: 'generate',
    component: Generator
  },
  // Add room list for 
  ...allowedRooms.map(room => ({
    path: `/${room.toLowerCase()}`, // Use lower case for consistency
    name: room.toLowerCase(), // Use lower case for consistency
    component: HelpDesk,
    props: true
  })),
  {
    path: '/general',
    name: 'general',
    component: HelpDesk
  },
  { 
    path: '/:pathMatch(.*)*', 
    redirect: '/general' 
  }
]

router = createRouter({
  history: createWebHistory(process.env.BASE_URL),
  routes
})

router.beforeEach((to, from, next) => {
  // Make a GET request using fetch
 
  if (!chatOpen) {
    if (to.fullPath === '/zzz') { next(); return; }
    next('/zzz');
    console.log(`Chat is closed.`);
    return;
  } else {
    if (to.fullPath === '/zzz') { next('/general'); return; }
  }

  if (to.params.room) {
    to.params.room = to.params.room.toLowerCase();
  }
  
  next();
});

export default router
