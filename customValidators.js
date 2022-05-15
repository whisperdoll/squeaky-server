export function validatePath(dirtree) {
  return (value) => {
    if (value.includes('..')) {
      return {
        success: false,
        value: value
      }
    }

    if (value.startsWith('/')) {
      value = value.substr(1);
    }

    const parts = value.split('/');

    let walking = dirtree;

    const valid = parts.every((part) => {
      const walkChild = walking.children?.find(c => c.name === part);

      if (!walkChild) {
        return false;
      }

      walking = walkChild;

      return true;
    });

    return {
      success: valid,
      value: value
    }
  };
}