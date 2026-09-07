import type { FastifyRequest } from 'fastify'
import type { ZodType } from 'zod'

type RequestSchemas = {
  body?: ZodType
  params?: ZodType
  querystring?: ZodType
}

export function validateRequest<TSchemas extends RequestSchemas>(
  request: FastifyRequest,
  schemas: TSchemas,
): {
  body: TSchemas['body'] extends ZodType<infer TBody> ? TBody : undefined
  params: TSchemas['params'] extends ZodType<infer TParams> ? TParams : undefined
  querystring: TSchemas['querystring'] extends ZodType<infer TQuery> ? TQuery : undefined
} {
  return {
    body: schemas.body?.parse(request.body),
    params: schemas.params?.parse(request.params),
    querystring: schemas.querystring?.parse(request.query),
  } as {
    body: TSchemas['body'] extends ZodType<infer TBody> ? TBody : undefined
    params: TSchemas['params'] extends ZodType<infer TParams> ? TParams : undefined
    querystring: TSchemas['querystring'] extends ZodType<infer TQuery> ? TQuery : undefined
  }
}