import { getData } from "./api";

const storage = require("./storage");

fetch("https://api.example.com/data");

export const boot = () => {
  console.log(getData());
  console.log(storage.ready);
};
