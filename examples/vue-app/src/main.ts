import { createApp } from 'vue'
import { createVueAdapter } from '@codemark/vue'
import App from './App.vue'

const app = createApp(App)
app.use(createVueAdapter({ serverPort: 3001 }))
app.mount('#app')
