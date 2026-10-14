import { MongoMemoryServer } from "mongodb-memory-server"
import mongoose from "mongoose"
import { afterAll, afterEach, beforeAll } from "vitest"

/** One in-memory MongoDB per test file; collections are emptied between tests. */
export function useTestDb() {
  let server: MongoMemoryServer | undefined

  beforeAll(async () => {
    server = await MongoMemoryServer.create()
    await mongoose.connect(server.getUri())
    // Unique indexes are what enforce slot rules, so they must exist before tests run.
    await Promise.all(
      mongoose.modelNames().map((name) => mongoose.model(name).syncIndexes())
    )
  })

  afterEach(async () => {
    await Promise.all(
      Object.values(mongoose.connection.collections).map((c) => c.deleteMany({}))
    )
  })

  afterAll(async () => {
    await mongoose.disconnect()
    await server?.stop()
  })
}
