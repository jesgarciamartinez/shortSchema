const { pick, omit, map, curry } = require('ramda')
const isObject = x => x !== null && typeof x === 'object'
const isSchemaObject = x =>
  isObject(x) && x.type === 'object' && isObject(x.properties)

const getSchema = arrOrObjOrValue =>
  Array.isArray(arrOrObjOrValue)
    ? {
        type: 'array',
        items: getSchema(arrOrObjOrValue[0]),
      }
    : isObject(arrOrObjOrValue) && !isSchemaObject(arrOrObjOrValue)
      ? {
          type: 'object',
          // @ts-ignore
          properties: Object.entries(arrOrObjOrValue).reduce(
            (acc, [key, value]) => {
              acc[key] = getSchema(value)
              return acc
            },
            {}
          ),
        }
      : typeof arrOrObjOrValue === 'string'
        ? {
            type: arrOrObjOrValue,
          }
        : arrOrObjOrValue

const getPathParam = name => ({
  in: 'path',
  name,
  required: true,
  schema: {
    type: 'string',
  },
})

const responseCodeToDescriptionString = {
  200: 'Success',
  500: 'Internal server error',
}
const getDescriptionStringFromResponseCode = errorCode =>
  responseCodeToDescriptionString[errorCode] || ''

const defaultResponseDescriptions = Object.entries(
  responseCodeToDescriptionString
).reduce((acc, [code, description]) => {
  acc[code] = {
    description,
  }
  return acc
}, {})

// const ensureSchema = schemaOrShorthandSchema =>
//   isSchemaObject(schemaOrShorthandSchema)
//     ? schemaOrShorthandSchema
//     : getSchema(schemaOrShorthandSchema)

//obj tiene default value para que devuelva defaultResponseDescriptions si se llama a getResponses sin obj
const getResponses = (obj = {}) =>
  Object.entries(obj).reduce((acc, [code, value]) => {
    const { shortSchema: schema, example, description } = Array.isArray(value)
      ? {
          shortSchema: [value[0].shortSchema],
          example: [value[0].example],
          description: [value[0].description],
        }
      : value

    acc[code] = {
      description: description || getDescriptionStringFromResponseCode(code),
      content: {
        'application/json': {
          //   schema : ensureSchema(shortSchema),
          schema: getSchema(schema),
          example,
        },
      },
    }
    return acc
  }, defaultResponseDescriptions)

const getRequestBody = ({ shortSchema: schema, example }, config) => ({
  required: true,
  content: {
    'application/json': {
      //   schema : ensureSchema(schema),
      schema: getSchema(schema),
      example,
    },
  },
})

const mapOverFieldsInModelProps = curry(
  (modelProps, fnToMapOverPickedProps, fieldsToPick, model) =>
    map(fnToMapOverPickedProps(fieldsToPick), pick(modelProps, model))
)

const mapOverFieldsInShortSchemaAndExample = mapOverFieldsInModelProps([
  'shortSchema',
  'example',
])

const pickFromShortSchemaAndExample = mapOverFieldsInShortSchemaAndExample(pick)

const omitFromShortSchemaAndExample = mapOverFieldsInShortSchemaAndExample(omit)

module.exports = {
  getSchema,
  getPathParam,
  getResponses,
  getRequestBody,
  pickFromShortSchemaAndExample,
  omitFromShortSchemaAndExample,
}
