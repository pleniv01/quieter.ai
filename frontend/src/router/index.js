import { createRouter, createWebHistory } from 'vue-router';
import Home from '../views/Home.vue';
import Privacy from '../views/Privacy.vue';
import PrivacyPolicy from '../views/PrivacyPolicy.vue';
import Signup from '../views/Signup.vue';
import Login from '../views/Login.vue';
import Dashboard from '../views/Dashboard.vue';
import Developers from '../views/Developers.vue';
import ApiKeyGuide from '../views/ApiKeyGuide.vue';
import AdminLogin from '../views/AdminLogin.vue';
import AdminModels from '../views/AdminModels.vue';
import AdminAccounts from '../views/AdminAccounts.vue';
import Pricing from '../views/Pricing.vue';

const routes = [
  { path: '/', name: 'Home', component: Home },
  { path: '/privacy', name: 'Privacy', component: Privacy },
  { path: '/privacy-policy', name: 'PrivacyPolicy', component: PrivacyPolicy },
  { path: '/signup', name: 'Signup', component: Signup },
  { path: '/login', name: 'Login', component: Login },
  { path: '/pricing', name: 'Pricing', component: Pricing },
  { path: '/dashboard', name: 'Dashboard', component: Dashboard },
  { path: '/developers', name: 'Developers', component: Developers },
  { path: '/docs/how-to-use-quieter-api-key', name: 'ApiKeyGuide', component: ApiKeyGuide },
  { path: '/admin', name: 'AdminLogin', component: AdminLogin },
  { path: '/admin/models', name: 'AdminModels', component: AdminModels },
  { path: '/admin/accounts', name: 'AdminAccounts', component: AdminAccounts },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;
