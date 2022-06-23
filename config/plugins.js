module.exports = ({ env }) => ({
  // ...
  email: {
    config: {
      provider: 'sendgrid',
      providerOptions: {
        apiKey: env('SENDGRID_API_KEY'),
      },
      settings: {
        defaultFrom: 'contacto@edgxr.com',
        defaultReplyTo: 'contacto@edgxr.com',
      },
    },
  },
  // ...
});
