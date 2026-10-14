process.env.NODE_ENV = "test"
// The real URI comes from mongodb-memory-server (see test/db.ts).
process.env.MONGODB_URI = "mongodb://127.0.0.1:1/unused"
process.env.JWT_ACCESS_SECRET = "test-access-secret-0123456789abcdef0123"
process.env.JWT_REFRESH_SECRET = "test-refresh-secret-0123456789abcdef012"
process.env.CLINIC_TZ = "America/New_York"
process.env.ANY_SLOT_CAPACITY = "2"
process.env.BCRYPT_ROUNDS = "4"
process.env.AUTH_RATE_LIMIT_MAX = "1000"
