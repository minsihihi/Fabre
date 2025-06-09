const { execSync } = require('child_process');
const path = require('path');

module.exports = async function (context) {
  const appPath = path.join(context.appOutDir, '채찍피티.app');
  try {
    execSync(`xattr -cr "${appPath}"`);
    console.log('xattr removed successfully');
  } catch (e) {
    console.warn('Failed to remove xattr:', e.message);
  }
};
