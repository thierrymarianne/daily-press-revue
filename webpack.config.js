const path = require('path');
const webpack = require('webpack');
const VueLoaderPlugin = require('vue-loader/lib/plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const UglifyJsPlugin = require('uglifyjs-webpack-plugin');
const OptimizeCSSAssetsPlugin = require('optimize-css-assets-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const AssetsPlugin = require('assets-webpack-plugin');
const FaviconsWebpackPlugin = require('favicons-webpack-plugin');

const assetsPluginInstance = new AssetsPlugin({ includeManifest: 'manifest' });

const environment = process.env.NODE_ENV || 'development';
const developmentMode = environment !== 'production';
const productionMode = environment === 'production';
const testMode = environment === 'test';

let mode = environment;
if (testMode) {
  mode = 'development';
}

let styleLoader = MiniCssExtractPlugin.loader;
if (developmentMode) {
  styleLoader = 'vue-style-loader';
}

let sourceMap = 'source-map';
if (developmentMode) {
  sourceMap = 'eval-source-map';
}

if (testMode) {
  sourceMap = 'inline-cheap-module-source-map';
}

let eslintConfig = '.eslintrc-production.json';
if (developmentMode) {
  eslintConfig = '.eslintrc.json';
}
if (testMode) {
  eslintConfig = '.eslintrc-test.json';
}

let outputDirectory = 'docs';
if (developmentMode) {
  outputDirectory = 'dist';
}

const sassLoaderOptions = {
  data: '@import "variables.scss";',
  sourceMap: true,
  includePaths: [path.join(__dirname, 'src/styles')]
};

const envVars = {
  PRODUCTION: JSON.stringify(true),
  RAVEN_DSN: JSON.stringify(process.env.RAVEN_DSN),
  AUTHENTICATION_API_KEY: JSON.stringify(process.env.AUTHENTICATION_API_KEY),
  AUTHENTICATION_AUDIENCE: JSON.stringify(process.env.AUTHENTICATION_AUDIENCE),
  AUTHENTICATION_HOST: JSON.stringify(process.env.AUTHENTICATION_HOST),
  AUTHENTICATION_CLIENT_ID: JSON.stringify(
    process.env.AUTHENTICATION_CLIENT_ID
  ),
  AUTHENTICATION_REDIRECT_URI: JSON.stringify(
    process.env.AUTHENTICATION_REDIRECT_URI
  ),
  AUTHENTICATION_LOGOUT_URI: JSON.stringify(
    process.env.AUTHENTICATION_LOGOUT_URI
  )
};

const plugins = [
  new FaviconsWebpackPlugin('./dist/daily-press-review.png'),
  new VueLoaderPlugin(),
  new HtmlWebpackPlugin({
    template: 'index.html.ejs',
    inject: 'body'
  }),
  // @see https://github.com/webpack/webpack/issues/1151#issuecomment-162792966
  new webpack.HotModuleReplacementPlugin(),
  new webpack.DefinePlugin(envVars)
];

if (productionMode) {
  plugins.concat([
    new MiniCssExtractPlugin({
      filename: '[name].[hash].css',
      chunkFilename: '[id].[hash].css'
    }),
    assetsPluginInstance,
    new webpack.HashedModuleIdsPlugin({
      hashFunction: 'sha256',
      hashDigest: 'hex',
      hashDigestLength: 20
    })
  ]);
}

let optimization = {
  minimizer: [
    new UglifyJsPlugin({
      cache: true,
      parallel: true,
      sourceMap: true,
      uglifyOptions: {
        output: {
          ascii_only: true
        }
      }
    }),
    new OptimizeCSSAssetsPlugin({})
  ],
  splitChunks: {
    chunks: 'all',
    cacheGroups: {
      vendor: {
        test: /[\\/]node_modules[\\/]/,
        name: 'vendors',
        chunks: 'all'
      },
      styles: {
        name: 'styles',
        test: /\.css$/,
        chunks: 'all',
        enforce: true
      }
    }
  },
  runtimeChunk: {
    name: 'manifest'
  }
};

if (testMode) {
  optimization = {
    splitChunks: {
      chunks: 'async'
    }
  };
}

const rules = [
  {
    test: /\.vue$/,
    loader: 'vue-loader'
  },
  {
    test: /\.(sc|c)ss$/,
    oneOf: [
      {
        resourceQuery: /-module/,
        use: [
          styleLoader,
          {
            loader: 'css-loader',
            options: {
              modules: true,
              sourceMap: true,
              localIdentName: '[path]_[local]_[hash:base64:5]'
            }
          }
        ]
      },
      {
        use: [
          'vue-style-loader',
          {
            loader: 'css-loader',
            options: {
              importLoaders: 1,
              sourceMap: true
            }
          },
          'postcss-loader',
          {
            loader: 'sass-loader',
            options: sassLoaderOptions
          }
        ]
      }
    ]
  },
  {
    test: /\.(png|jpe?g|gif)$/i,
    use: [
      {
        loader: 'file-loader'
      }
    ]
  },
  {
    test: /\.js$/,
    exclude: /node_modules/,
    use: {
      loader: 'babel-loader',
      options: {
        presets: [['@babel/preset-env', { modules: false }]],
        plugins: ['@babel/plugin-transform-runtime']
      }
    }
  },
  {
    enforce: 'pre',
    test: /\.js$/,
    exclude: /node_modules/,
    loader: 'eslint-loader',
    options: {
      configFile: path.join(__dirname, eslintConfig)
    }
  }
];

const webpackConfig = {
  node: {
    module: 'empty',
    net: 'empty',
    fs: 'empty'
  },
  mode,
  entry: './src/index.js',
  resolve: {
    modules: ['node_modules'],
    extensions: ['.vue', '.js', '.css', '.scss'],
    alias: {
      vue$: 'vue/dist/vue.esm.js'
    }
  },
  optimization,
  module: {
    rules
  },
  output: {
    path: path.resolve(__dirname, outputDirectory),
    filename: '[name].[hash].js',
    chunkFilename: '[name].[chunkHash].bundle.js'
  },
  devServer: {
    // @see https://webpack.js.org/configuration/dev-server/#devserver-historyapifallback
    historyApiFallback: {
      rewrites: [
        { from: /^\/.+$/, to: '/' },
        { from: /\/logout/, to: '/' }
      ]
    },
    contentBase: path.join(__dirname, 'dist'),
    compress: true,
    // @see https://github.com/webpack/webpack/issues/1151#issuecomment-111972680
    hot: true,
    inline: true,
    open: true,
    port: 8888
  },
  plugins,
  devtool: sourceMap
};

if (testMode) {
  delete webpackConfig.entry;
  webpackConfig.node.module = false;
  webpackConfig.resolveLoader = {
    alias: {
      // necessary to to make lang="scss" work in test when using vue-loader's ?inject option
      // see discussion at https://github.com/vuejs/vue-loader/issues/724
      'scss-loader': 'sass-loader'
    }
  };
}

module.exports = webpackConfig;
