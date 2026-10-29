// Copy only the allowed fields from req.body (stops users from setting fields they should not)
module.exports = (obj, keys) =>
  Object.fromEntries(keys.filter((k) => obj[k] !== undefined).map((k) => [k, obj[k]]));