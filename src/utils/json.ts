export type JSONValue =
  | string
  | number
  | boolean
  | { [x: string]: JSONValue }
  | Array<JSONValue>;

export type JSONObject = {
  [x: string]: JSONValue;
};

export type JSONArray = Array<JSONValue>;
