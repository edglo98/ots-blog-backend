module.exports = [
  'strapi::errors',
  'strapi::cors',
  'strapi::poweredBy',
  'strapi::logger',
  'strapi::query',
  'strapi::body',
  'strapi::session',
  'strapi::favicon',
  'strapi::public',
  // 'strapi::security',
  {
    name: 'strapi::security',
    config: {
      contentSecurityPolicy: {
        directives: {
          'img-src': ['*'],
        },
      }
    },
  },
];
