'use strict';

/**
 *  subscription controller
 */
const strapi_key = process.env.STRAPI_KEY;
const endpointSecret = process.env.ENDPOINT_SECRET;
const FRONT_DOMAIN = process.env.FRONT_DOMAIN;
const stripe = require('stripe')(strapi_key);
const unparsed = require('koa-body/unparsed.js'); 
const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::subscription.subscription', ({strapi}) => ({
  async find(ctx) {
    // some logic here
    const { data, meta } = await super.find(ctx);
    // some more logic
  
    return { data, meta };
  },
   
  async findOne(ctx) {
    // some logic here
    const response = await super.findOne(ctx);
    // some more logic
  
    return response;
  },
  
  async delete(ctx) {
    // some logic here
    const response = await super.delete(ctx);
    // some more logic
  
    return response;
  },
  
  async update(ctx) {
    // some logic here
    const response = await super.update(ctx);
    // some more logic
  
    return response;
  },  
   

  async sendEmail (ctx) {
    try {
      const req = ctx.request;
      const {
        business_type,
        email,
        name,
        need,
        perfile_type,
        request,
        sector_type,
        phone,
      } = req.body
      await strapi.plugins['email'].services.email.send({
        to: 'edgarlopezmgs@live.com',
        from: 'no-reply@edgxr.com',
        replyTo: 'no-reply@edgxr.com',
        subject: `${name} from OTS website`,
        html: `
          <h1>Correo recibido a traves del sitio web de OTS enviado por ${name}</h1>
          <br>
          <br>
          <h2>Necesidad</h2>
          <p>${need}</p>
          <h2>Requerimiento</h2>
          <p>${request}</p>
          <h2>Información adicional</h2>
          <p>Perfil: <strong>${perfile_type}</strong></p>
          <p>Sector: <strong>${sector_type}</strong></p>
          <p>Giro: <strong>${business_type}</strong></p>
          <h2>Contacto</h2>
          <p>Email: <strong>${email}</strong></p>
          <p>Teléfono: <strong>${phone}</strong></p>
        `,
      });

      ctx.status = 200;
      ctx.body = {
        message: 'Email sent successfully',
      };
    } catch (error) {
      ctx.status = 500;
    }
  },


  async createCheckoutSession(ctx) {
    try {
      const req = ctx.request;

      const prices = await stripe.prices.list({
        lookup_keys: [req.body.lookup_key],
        expand: ['data.product'],
      });

      const session = await stripe.checkout.sessions.create({
        billing_address_collection: 'auto',
        line_items: [
          {
            price: prices.data[0].id,
            // For metered billing, do not pass quantity
            quantity: 1,
          },
        ],
        mode: 'subscription',
        success_url: `${FRONT_DOMAIN}/me?success=true`, // &session_id={CHECKOUT_SESSION_ID}
        cancel_url: `${FRONT_DOMAIN}/me?canceled=true`,
      });
      
      // create subscription
      ctx.request.body.data = {
        amount: Number(session.amount_total) / 100,
        status: session.status,
        session_id: session.id,
        user: req.body.user_id,
      }
      
      await super.create(ctx);

      ctx.body = {
        status: 'success',
        urlSession: session.url,
      };
    } catch (err) {
      console.log('error',err);
      ctx.body = err;
    }
  },

  async createPortalSession(ctx) {
    try {
      const req = ctx.request;

      const session_id = req.body.session_id;
      const sub_id = req.body.sub_id;
      const checkoutSession = await stripe.checkout.sessions.retrieve(session_id);

      const portalSession = await stripe.billingPortal.sessions.create({
        customer: checkoutSession.customer,
        return_url: `${FRONT_DOMAIN}/me?config=true`,
      });
      
      const data = {
        customer_id: checkoutSession.customer,
      }

      await strapi.entityService.update('api::subscription.subscription', sub_id, { data });

      ctx.body = {
        status: 'success',
        urlSession: portalSession.url,
      };
    } catch(err) {
      console.log('error',err);
      ctx.body = err;
    }
  },

  async webhook(ctx) {
    const request = ctx.request;
    const sig = request.headers['stripe-signature'];
    const unparsedBody = ctx.request.body[unparsed];

    let event;
  
    try {
      event = stripe.webhooks.constructEvent(unparsedBody, sig, endpointSecret);
    } catch (err) {
      ctx.body = err;
      return;
    }

    // Handle the event
    switch (event.type) {
      // case 'customer.subscription.trial_will_end': {
      //   const subscription = event.data.object;
      //   const status = subscription.status;
      //   console.log(`Subscription status is ${status}.`);
      //   // Then define and call a method to handle the subscription trial ending.
      //   // handleSubscriptionTrialEnding(subscription);
      //   break;
      // }
      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        const status = subscription.status;
        
        const entries = await strapi.entityService.findMany('api::subscription.subscription', {
          filters: {
            customer_id: subscription.customer,
          },
        });

        if (entries.length > 0) {
        
          const sub_id = entries[0].id;
  
          const data = {
            status,
          }
    
          await strapi.entityService.update('api::subscription.subscription', sub_id, { data });
        }

        console.log(`Subscription deleted`);
        // Then define and call a method to handle the subscription deleted.
        // handleSubscriptionDeleted(subscriptionDeleted);
        break;
      }
      case 'customer.subscription.created': {
        const subscription = event.data.object;
        const status = subscription.status;
        
        const entries = await strapi.entityService.findMany('api::subscription.subscription', {
          filters: {
            customer_id: subscription.customer,
          },
        });

        if (entries.length > 0) {
        
          const sub_id = entries[0].id;
  
          const data = {
            status,
          }
    
          await strapi.entityService.update('api::subscription.subscription', sub_id, { data });
        }

        console.log(`Subscription created`);
        // Then define and call a method to handle the subscription created.
        // handleSubscriptionCreated(subscription);
        break;
      }
      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        const status = subscription.status;

        const entries = await strapi.entityService.findMany('api::subscription.subscription', {
          filters: {
            customer_id: subscription.customer,
          },
        });

        if (entries.length > 0) {
        
          const sub_id = entries[0].id;
  
          const data = {
            status,
          }
    
          await strapi.entityService.update('api::subscription.subscription', sub_id, { data });
        }
        
        console.log(`Subscription updated`);
        // Then define and call a method to handle the subscription update.
        // handleSubscriptionUpdated(subscription);
        break;
      }
      default:
        // Unexpected event type
        console.log(`Unhandled event type ${event.type}.`);
    }
  
    // Return a 200 response to acknowledge receipt of the event
    ctx.body = { received: true };
  }
}));
