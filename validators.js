export function validateStringIn(stringArray) {
  return (value) => {
    return {
      success: stringArray.includes(value.toString()),
      value: value.toString()
    }
  };
}

export function validateJson(value) {
  let json;

  try {
    json = JSON.parse(JSON.stringify(value));
  } catch (e) {
    return {
      success: false,
      value: null
    };
  }

  return {
    success: true,
    value: json
  };
}

export function validateJsonShape(shape) {
  return (value) => {
    let v = validateJson(value);
    if (!v.success) return v;
    v = v.value;
    
    for (const key in shape) {
      if (!shape.hasOwnProperty(key)) continue;
      if (!value.hasOwnProperty(key)) {
        return { value: v, success: false };
      }
  
      const validator = shape[key];
      
      const sub = typeof(validator) === 'object' ?
        validateJsonShape(value[key], shape[key]) :
        validateParam(value[key], shape[key]);
  
      if (!sub.success) {
        return { value: v, success: false };
      }
      
      v[key] = sub.value;
    }
  
    return {
      success: true,
      value: v
    };
  };
}

export const validateInt = (minInclusive, maxInclusive) =>
{
  return (value) =>
  {
    value = parseInt(value);
    
    return {
      success: !(isNaN(value) || value < minInclusive || value > maxInclusive),
      value
    };
  };
};

export const validateStringArray = (separator, constraint) =>
{
  return (value) =>
  {
    const array = value.toString().split(separator);
    return validateArray(constraint)(array);
  };
};

export const validateArray = (constraint) =>
{
  return (value) =>
  {
    return {
      success: Array.isArray(value) && value.every(v => validateParam(v, constraint)),
      value
    };
  };
};

function validateParam(param, constraint)
{
  if (typeof(constraint) === "function")
  {
    return constraint(param);
  }
  else
  {
    switch (constraint)
    {
      case "float":
      {
        const value = parseFloat(param);
        return { success: !isNaN(value), value };
      }
      case "int":
      {
        const value = parseInt(param);
        return { success: !isNaN(value), value };
      }
      case "date":
      {
        const value = new Date(param);
        return {
          value,
          success: !isNaN(+value)
        };
      }
      case "string": return { success: true, value: param };
      case "bool": return { success: param === true || param === false, value: param };
      default: return { success: false, value: param }
    }
  }
}

export function validateParams(body, constraints)
{
  const ret = {};
  
  for (const paramName in constraints)
  {
    const paramConstraint = constraints[paramName];
    const printErr = () => console.log(`bad param \`${paramName}\`: ${body[paramName]}`);

    if (!body.hasOwnProperty(paramName))
    {
      printErr();
      return false;
    }
    else
    {
      const result = validateParam(body[paramName], paramConstraint);
      if (result.success)
      {
        ret[paramName] = result.value;
      }
      else
      {
        printErr();
        return false;
      }
    }
  }
  
  return ret;
}