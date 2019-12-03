const path = require('path');

module.exports = {
  mode: "development",
  entry: "./src/public/js/index.js",
  output: {
    path: path.resolve(__dirname, "src/public/dist"), // string
    filename: "script.js",
  },
  watch: true
}