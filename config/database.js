module.exports = ({ env }) => ({
  connection: {
    client: 'postgres',
    connection: {
      host: env('DATABASE_HOST', 'containers-us-west-44.railway.app'),
      port: env.int('DATABASE_PORT', 6281),
      database: env('DATABASE_NAME', 'railway'),
      user: env('DATABASE_USERNAME', 'postgres'),
      password: env('DATABASE_PASSWORD', 'KIgtTQAEU8OLwL1S426e'),
      ssl: env.bool('DATABASE_SSL', false),
    },
  },
});
