export function createGunNodeMock(path = []) {
  const children = new Map();
  const node = {
    path,
    _children: children,
    get: jest.fn((key) => {
      if (!children.has(key)) {
        children.set(key, createGunNodeMock([...path, key]));
      }
      return children.get(key);
    }),
    put: jest.fn()
  };
  return node;
}

export function createGunApiTreeMock() {
  const root = createGunNodeMock();
  return {
    gunApi: {
      get: root.get
    },
    getNode: (...path) => path.reduce((node, key) => node.get(key), root),
    root
  };
}
