import fastify from "fastify"
import fastifyJwt from "@fastify/jwt"
import { env } from 'process'; // Temporarily using process.env directly or we can create an env validation file
import { appRoutes } from "./http/routes/routes"
import { ZodError } from "zod"
import dotenv from 'dotenv';
import cors from '@fastify/cors'

dotenv.config();

export const app = fastify()

import fastifyMultipart from "@fastify/multipart"

app.register(cors, {
    origin: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: false,
    maxAge: 86400,
})

// Garante que headers CORS sempre estejam presentes, mesmo em respostas de erro
app.addHook('onSend', async (request, reply) => {
    const origin = request.headers.origin
    if (origin && !reply.hasHeader('Access-Control-Allow-Origin')) {
        reply.header('Access-Control-Allow-Origin', origin)
    }
})

import fastifyStatic from "@fastify/static"
import path from "node:path"

app.register(fastifyMultipart, {
    attachFieldsToBody: true,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
    }
})

app.register(fastifyStatic, {
    root: path.join(process.cwd(), 'uploads'),
    prefix: '/uploads/',
})

app.register(fastifyJwt, {
    secret: process.env.JWT_SECRET || 'supersecret',
})

app.register(appRoutes)

app.setErrorHandler((error, _, reply) => {
    if (error instanceof ZodError) {
        return reply
            .status(400)
            .send({ message: 'Validation error.', issues: error.format() })
    }

    if (process.env.NODE_ENV !== 'production') {
        console.error(error)
    } else {
        // Here we should log to an external tool like DataDog/NewRelic/Sentry
    }

    return reply.status(500).send({ message: 'Internal server error.' })
})
