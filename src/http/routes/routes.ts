import { FastifyInstance } from "fastify"
import { register } from "../controllers/register"
import { authenticate } from "../controllers/authenticate"
import { fetchCompanies } from "../controllers/fetch-companies"

import { createTimeRecord } from "../controllers/create-time-record"
import { fetchUserTimeRecords } from "../controllers/fetch-user-time-records"
import { fetchActiveShift } from "../controllers/fetch-active-shift"
import { punchPreview } from "../controllers/punch-preview"
import { updateProfile } from "../controllers/update-profile"
import { updatePassword } from "../controllers/update-password"
import { verifyJwt } from "../middlewares/verify-jwt"
import { startRoute } from "../controllers/start-route"
import { stopRoute } from "../controllers/stop-route"
import { fetchUserRouteLogs } from "../controllers/fetch-user-route-logs"
import { fetchDailyPatrolPoints } from "../controllers/fetch-daily-patrol-points"
import { fetchWallPosts } from "../controllers/fetch-wall-posts"

import { startPatrolCheckin } from "../controllers/start-patrol-checkin"
import { stopPatrolCheckin } from "../controllers/stop-patrol-checkin"

import { registerJustification } from "../controllers/register-justification"
import { fetchUserJustifications } from "../controllers/fetch-user-justifications"
import { updateJustificationStatus } from "../controllers/update-justification-status"
import { updateOutOfRangeStatus } from "../controllers/update-out-of-range-status"
import { updatePushToken } from "../controllers/update-push-token"

import { upload } from "../controllers/upload"
import { fetchWorkPosts } from "../controllers/fetch-work-posts"
import { createWorkPost } from "../controllers/create-work-post"
import { serverTime } from "../controllers/server-time"
import { getProfile } from "../controllers/get-profile"

export async function appRoutes(app: FastifyInstance) {
    app.get('/server-time', serverTime)
    app.post('/users', register)
    app.post('/sessions', authenticate)
    app.post('/upload', upload)
    app.get('/companies', fetchCompanies)
    app.get('/work-posts', fetchWorkPosts)
    app.post('/work-posts', { onRequest: [verifyJwt] }, createWorkPost)

    app.post('/time-records', createTimeRecord)
    app.get('/time-records', fetchUserTimeRecords)
    app.get('/active-shift', fetchActiveShift)
    app.get('/punch-preview', punchPreview)

    /** Authenticated */
    app.get('/me', { onRequest: [verifyJwt] }, getProfile)
    app.patch('/profile', { onRequest: [verifyJwt] }, updateProfile)
    app.patch('/password', { onRequest: [verifyJwt] }, updatePassword)

    app.post('/routes/start', { onRequest: [verifyJwt] }, startRoute)
    app.patch('/routes/stop', { onRequest: [verifyJwt] }, stopRoute)
    app.get('/route-logs', { onRequest: [verifyJwt] }, fetchUserRouteLogs)
    app.get('/patrol-points', { onRequest: [verifyJwt] }, fetchDailyPatrolPoints)
    app.get('/wall-posts', { onRequest: [verifyJwt] }, fetchWallPosts)

    app.post('/patrol/checkin/start', { onRequest: [verifyJwt] }, startPatrolCheckin)
    app.patch('/patrol/checkin/stop', { onRequest: [verifyJwt] }, stopPatrolCheckin)

    app.post('/justifications', { onRequest: [verifyJwt] }, registerJustification)
    app.get('/justifications', { onRequest: [verifyJwt] }, fetchUserJustifications)
    app.patch('/justifications/:id/status', { onRequest: [verifyJwt] }, updateJustificationStatus)

    app.patch('/time-records/:id/out-of-range-status', updateOutOfRangeStatus)

    app.patch('/push-token', { onRequest: [verifyJwt] }, updatePushToken)
}

