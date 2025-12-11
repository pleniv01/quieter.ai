import { createRouter, createWebHistory } from 'vue-router';
import Home from '../views/Home.vue';
import Privacy from '../views/Privacy.vue';
import PrivacyPolicy from '../views/PrivacyPolicy.vue';

const routes = [
  { path: '/', name: 'Home', component: Home },
  { path: '/privacy', name: 'Privacy', component: Privacy },
  { path: '/privacy-policy', name: 'PrivacyPolicy', component: PrivacyPolicy },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;
