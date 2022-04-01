let store: any = {};

export const getStore = () => store;

export const initStore = () => {
  const s = {
    namePrice: null,
  };
  store = s;
  return s;
};
