module.exports = {
  apps : [{
    name: 'receiver',
    script: 'dist/server.js',
    // Options reference: https://pm2.keymetrics.io/docs/usage/application-declaration/
    output: '/dev/null',
    error: '/dev/null',
    exec_mode: 'fork',
    // cron_restart: '2 */1 * * *',
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    error_file: "/dev/null",
    out_file: "/dev/null",
    env: {
      NODE_ENV: 'development'
    },
    env_production: {
      NODE_ENV: 'production'
    }
  }],

  deploy : {
    production : {
      user : 'node',
      host : '212.83.163.1',
      ref  : 'origin/master',
      repo : 'git@github.com:repo.git',
      path : '/var/www/production',
      'post-deploy' : 'npm install && pm2 reload ecosystem.config.js --env production'
    }
  }
};
