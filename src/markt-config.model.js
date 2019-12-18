const { validate } = require('jsonschema');
const options = {
  throwError   : false,
  propertyName : '.'
};

exports.AllBranches = function( data ) {
  return validate(data, {
    type: 'array',
    items: {
      type: 'object',
      properties: {
        'brancheId'   : { type: 'string', required: true },
        'description' : { type: 'string', required: true },
        'color'       : { type: 'string', required: true }
      },
      additionalProperties: false
    }
  }, options);
};

exports.MarketBranches = function( data ) {
  return validate(data, {
    type: 'array',
    items: {
      type: 'object',
      properties: {
        'id'              : { type: 'string', required: true },
        'verplicht'       : { type: 'boolean', required: true },
        'maximumPlaatsen' : { type: 'number', minimum: 1 }
      },
      additionalProperties: false
    }
  }, options);
};
