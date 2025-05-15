module.exports = {
  apps: [
    {
      name: 'backend',
      script: 'app.js',
      cwd: '/home/ubuntu/Fabre/backend',
      watch: true,
      env: {
        NODE_ENV: 'production'
      }
    }
  ]
};