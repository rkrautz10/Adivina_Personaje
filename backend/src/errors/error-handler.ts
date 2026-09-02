import type { FastifyError, FastifyInstance } from 'fastify'
import { ZodError } from 'zod'

import { AppError } from './app-error.js'

export function registerErrorHandler(app: FastifyInstance): void {
  app.setErrorHandler((error: FastifyError | AppError | ZodError, request, reply) => {
    request.log.error(error)

    if (error instanceof ZodError) {
      return reply.status(400).send({
        statusCode: 400,
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: error.issues.map(({ path, message }) => ({ path: path.join('.'), message })),
      })
    }

    if (error instanceof AppError) {
      return reply.status(error.statusCode).send({
        statusCode: error.statusCode,
        code: error.code,
        message: error.message,
        ...(error.details === undefined ? {} : { details: error.details }),
      })
    }

    return reply.status(500).send({
      statusCode: 500,
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
    })
  })

  app.setNotFoundHandler((_request, reply) =>
    reply.status(404).send({
      statusCode: 404,
      code: 'NOT_FOUND',
      message: 'Resource not found',
    }),
  )
}