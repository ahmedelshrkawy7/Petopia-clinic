import { createApp } from "./app"
import { env } from "./config/env"
import { connectDb } from "./db/connect"

await connectDb(env.MONGODB_URI)
createApp().listen(env.PORT, () => {
  console.log(`Petopia API listening on http://localhost:${env.PORT}`)
})
