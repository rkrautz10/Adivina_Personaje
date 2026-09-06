import { buildApp } from './app.js'
import { environment } from './config/env.js'

const app = await buildApp()
await app.listen({ host: '0.0.0.0', port: environment.PORT })