const path = require('path');

module.exports = {
  mode: "development",
  entry: "./src/public/src/index.js",
  output: {
    path: path.resolve(__dirname, "src/public/js"), // string
    filename: "script.js",
  },
  watch: true
}