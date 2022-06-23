'use strict';

/**
 * subscription router.
 */

// const { createCoreRouter } = require('@strapi/strapi').factories;

// module.exports = createCoreRouter('api::subscription.subscription');


module.exports = {
  routes: [
    {
      method: 'POST',
      path: '/create-checkout-session',
      handler: 'subscription.createCheckoutSession',
    },
    {
      method: 'POST',
      path: '/create-portal-session',
      handler: 'subscription.createPortalSession',
    },
    {
      method: 'POST',
      path: '/webhook',
      handler: 'subscription.webhook',
    },
    {
      method: 'POST',
      path: '/create',
      handler: 'subscription.create',
    },

    {
      method: 'POST',
      path: '/send-email',
      handler: 'subscription.sendEmail',
    },


    {
      method: 'PUT',
      path: '/update',
      handler: 'subscription.update',
    },
    {
      method: 'DELETE',
      path: '/delete',
      handler: 'subscription.delete',
    },
    {
      method: 'GET',
      path: '/find',
      handler: 'subscription.find',
    },
    {
      method: 'GET',
      path: '/findOne',
      handler: 'subscription.findOne',
    },
  ]
}
