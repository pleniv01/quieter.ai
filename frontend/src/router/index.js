import { createRouter, createWebHistory } from 'vue-router';
import Home from '../views/Home.vue';
import Privacy from '../views/Privacy.vue';
import PrivacyPolicy from '../views/PrivacyPolicy.vue';
import Signup from '../views/Signup.vue';
import Login from '../views/Login.vue';
import Dashboard from '../views/Dashboard.vue';

const routes = [
  { path: '/', name: 'Home', component: Home },
  { path: '/privacy', name: 'Privacy', component: Privacy },
  { path: '/privacy-policy', name: 'PrivacyPolicy', component: PrivacyPolicy },
  { path: '/signup', name: 'Signup', component: Signup },
  { path: '/login', name: 'Login', component: Login },
  { path: '/dashboard', name: 'Dashboard', component: Dashboard },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;
