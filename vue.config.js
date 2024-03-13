const { defineConfig } = require('@vue/cli-service')
const config = require('config');
const fs = require('fs')

const fullChain = config.get('certs.fullChain');
const privkey = config.get('certs.privkey');

module.exports = defineConfig({
  transpileDependencies: true,
  devServer:{
    https: {
      cert: readFileSyncSafe(fullChain),
      key: readFileSyncSafe(privkey),
    },
    port: 443,
    allowedHosts: "all",
  },

  pluginOptions: {
    vuetify: {
			// https://github.com/vuetifyjs/vuetify-loader/tree/next/packages/vuetify-loader
		}
  }
})

function readFileSyncSafe(filePath) {
  try {
    return fs.readFileSync(filePath);
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.error(turnBackgroundRed(' ERROR '), turnTextRed(`Please update your config/production.json file to include a valid certificate path, currently set to:`), filePath);
    } else {
      console.error(turnBackgroundRed(' ERROR '), turnTextRed(`Please update your config/production.json file to include a valid certificate, currently set to:`), filePath);
    }
    process.exit(1); // Exit the process or handle the error according to your application's logic
  }
}

function turnTextRed(text) {
  return `\x1b[31m${text}\x1b[0m`;
}

function turnBackgroundRed(text) {
  return `\x1b[41m\x1b[37m${text}\x1b[0m`;
}