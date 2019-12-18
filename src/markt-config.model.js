const { validate } = require('jsonschema');
const OPTIONS = {
  throwError   : false,
  propertyName : 'DATA'
};

module.exports = function( INDEX ) {
  const AllBranches = function( data ) {
    return validate(data, {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          'brancheId': { type: 'string', required: true },
          'description': { type: 'string', required: true },
          'color': { type: 'string', required: true }
        },
        additionalProperties: false
      }
    }, OPTIONS);
  };

  const MarketBranches = function( data ) {
    return validate(data, {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          'id'              : {
            type: 'string',
            enum: INDEX.branches,
            required: true
          },
          'verplicht': { type: 'boolean', required: true },
          'maximumPlaatsen': { type: 'number', minimum: 1 }
        },
        additionalProperties: false
      }
    }, OPTIONS);
  };

  const MarketGeografie = function( data ) {
    return validate(data, {
      type: 'object',
      properties: {
        'obstakels': {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              'kraamA': { type: 'string', required: true },
              'kraamB': { type: 'string', required: true },
              'obstakel': {
                type: 'array',
                items: {
                  type: 'string'
                  // TODO: enum by loading `obstakeltypes.json`
                },
                required: true
              }
            },
            additionalProperties: false
          }
        }
      }
    }, OPTIONS);
  };

  const MarketLocaties = function( data ) {
    return validate(data, {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          'plaatsId': { type: 'string', required: true },
          'inactive': { type: 'boolean' },
          'branches': {
            type: 'array',
            items: {
              type: 'string',
              enum: INDEX.branches
            }
          },
          'verkoopinrichting' : {
            type: 'array',
            items: {
              type: 'string',
              enum: ['eigen-materieel']
            }
          },
          'properties': { type: 'array' },
          'tags': { type: 'array' }
        },
        additionalProperties: false
      }
    }, OPTIONS);
  };

  const Market = function( data ) {
    return validate(data, {
      type: 'object',
      additionalProperties: false,
      properties: {
        'expansionLimit': { type: 'number', minimum: 0 },
        'rows': {
          type: 'array',
          required: true,
          items: {
            type: 'array',
            minItems: 1,
            items: { type: 'string' }
          }
        }
      }
    }, OPTIONS);
  };

  return {
    AllBranches,
    MarketBranches,
    MarketGeografie,
    MarketLocaties,
    Market
  };
};
