/**
 * validate({ body: ['email','password'] }) checks those fields exist and
 * are non-empty on req.body before the controller ever runs. Keeps
 * "missing field" checks out of every controller/service.
 */
function validate({ body = [], params = [], query = [] } = {}) {
  return (req, res, next) => {
    const missing = [];

    body.forEach(field => {
      const val = req.body?.[field];
      if (val === undefined || val === null || val === '') missing.push(field);
    });
    params.forEach(field => {
      if (!req.params?.[field]) missing.push(field);
    });
    query.forEach(field => {
      if (!req.query?.[field]) missing.push(field);
    });

    if (missing.length) {
      return res.status(400).json({
        success: false,
        message: `Missing required field(s): ${missing.join(', ')}`
      });
    }
    next();
  };
}

function validateEnum(field, allowedValues, source = 'body') {
  return (req, res, next) => {
    const val = req[source]?.[field];
    if (val !== undefined && !allowedValues.includes(val)) {
      return res.status(400).json({
        success: false,
        message: `Invalid ${field}. Must be one of: ${allowedValues.join(', ')}`
      });
    }
    next();
  };
}

module.exports = { validate, validateEnum };
