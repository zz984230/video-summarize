const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {
  entry: {
    popup: './src/popup.js',
    background: './src/background.js',
    content: './src/content.js',
    options: './src/options.js'
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
      {
        test: /\.css$/i,
        use: ['style-loader', 'css-loader'],
      },
    ],
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
  },
  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, 'dist'),
    clean: true,
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './src/popup.html',
      filename: 'popup.html',
      chunks: ['popup']
    }),
    new HtmlWebpackPlugin({
      template: './src/options.html',
      filename: 'options.html',
      chunks: ['options']
    }),
    new CopyWebpackPlugin({
      patterns: [
        { 
          from: 'manifest.json', 
          to: 'manifest.json',
          transform(content, path) {
            // 将Buffer转换为字符串，然后修改路径
            let contentStr = content.toString('utf8');
            // 修改manifest.json中的路径，移除src/前缀
            return contentStr
              .replace(/src\/background\.js/g, 'background.js')
              .replace(/src\/content\.js/g, 'content.js')
              .replace(/src\/popup\.html/g, 'popup.html')
              .replace(/src\/options\.html/g, 'options.html')
              .replace(/src\/popup\.js/g, 'popup.js')
              .replace(/src\/services\/\*/g, 'background.js');
          }
        },
        { from: 'icons', to: 'icons', noErrorOnMissing: true },
        { from: 'styles', to: 'styles', noErrorOnMissing: true }
      ]
    })
  ],
  optimization: {
    minimize: false
  }
};