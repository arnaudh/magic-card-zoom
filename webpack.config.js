var webpack = require("webpack"),
    path = require("path"),
    fileSystem = require("fs"),
    CleanWebpackPlugin = require("clean-webpack-plugin"),
    CopyWebpackPlugin = require("copy-webpack-plugin"),
    HtmlWebpackPlugin = require("html-webpack-plugin"),
    WriteFilePlugin = require("write-file-webpack-plugin");


const config = require('./config.json');
const mtg_sets = require('./src/js/mtg_sets.js');

var fileExtensions = ["jpg", "jpeg", "png", "gif", "eot", "otf", "svg", "ttf", "woff", "woff2"];

var options = {
  entry: {
    popup: path.join(__dirname, "src", "js", "extension", "popup.js"),
    background: path.join(__dirname, "src", "js", "extension", "background.js"),
    main: path.join(__dirname, "src", "js", "extension", "main.js"),
    pre_main: path.join(__dirname, "src", "js", "extension", "pre_main.js")
  },
  chromeExtensionBoilerplate: {
    notHotReload: ["main"]
  },
  output: {
    path: path.join(__dirname, "build"),
    filename: "[name].bundle.js"
  },
  module: {
    rules: [
      {
        test: /\.css$/,
        loader: "style-loader!css-loader",
        exclude: /node_modules/
      },
      {
        test: new RegExp('\.(' + fileExtensions.join('|') + ')$'),
        loader: "file-loader?name=[name].[ext]",
        exclude: /node_modules/
      },
      {
        test: /\.html$/,
        loader: "html-loader",
        exclude: /node_modules/
      }
    ]
  },
  plugins: [
    // clean the build folder
    new CleanWebpackPlugin(["build"]),
    new CopyWebpackPlugin([
      {from: "src/manifest.json"},
      {from: "LICENSE-3RD-PARTY.txt"},
    ]),
    new CopyWebpackPlugin(
      mtg_sets.allAvailableSets.map(mtgSet => {
        return {
          from: `assets/images/sets/${mtgSet}.svg`,
          to:   `assets/images/sets/${mtgSet}.svg`
        };
      })
    ),
    new CopyWebpackPlugin(
      mtg_sets.allAvailableSets.map(mtgSet => {
        return {
          from: `assets/indexes/${config.descriptorIndexName}/${mtgSet}.json`,
          to:   `assets/indexes/${mtgSet}.json`
        };
      })
    ),
    new CopyWebpackPlugin(
      mtg_sets.allAvailableSets.map(mtgSet => {
        return {
          from: `assets/metadata/cards/display_urls/${mtgSet}.json`,
          to:   `assets/metadata/cards/display_urls/${mtgSet}.json`
        };
      })
    ),
    new HtmlWebpackPlugin({
      template: path.join(__dirname, "src", "html", "popup.html"),
      filename: "popup.html",
      chunks: ["popup"]
    }),
    // new WriteFilePlugin()
  ]
};

module.exports = options;
