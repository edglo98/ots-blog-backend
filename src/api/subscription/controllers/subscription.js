'use strict';

/**
 *  subscription controller
 */
const stripe_key = process.env.STRIPE_KEY;
const endpointSecret = process.env.ENDPOINT_SECRET;
const FRONT_DOMAIN = process.env.FRONT_DOMAIN;
const stripe = require('stripe')(stripe_key);
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
        to: 'edgarlopezmgs@live.com', // change ots@loopempresarial.com.mx
        from: 'no-reply@loopempresarial.com.mx',
        replyTo: 'no-reply@loopempresarial.com.mx',
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
      console.log(error.response.body)
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
        user: req.body.user_id,
        session_id: session.id,
        status: session.status,
        amount: Number(session.amount_total) / 100,
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
      case 'checkout.session.completed': {
        const session = event.data.object;
        console.log('checkout.session.completed',event.data)
        const entries = await strapi.entityService.findMany('api::subscription.subscription', {
          filters: {
            session_id: session.id
          },
        });

        if (entries.length > 0) {
        
          const sub_id = entries[0].id;
  
          const data = {
            status: 'active',
            customer_id: session.customer,
          }
    
          await strapi.entityService.update('api::subscription.subscription', sub_id, { data });
        }
        
        break;
      }

      // case 'invoice.paid': {

      //   // Continue to provision the subscription as payments continue to be made.
      //   // Store the status in your database and check when a user accesses your service.
      //   // This approach helps you avoid hitting rate limits.
        
      // }
      case 'invoice.payment_failed': {
        const subscription = event.data.object;

        const entries = await strapi.entityService.findMany('api::subscription.subscription', {
          filters: {
            customer_id: subscription.customer || '',
          },
        });

        if (entries.length > 0) {
          const sub_id = entries[0].id;
          const data = {
            status: 'payment_failed',
          }
    
          await strapi.entityService.update('api::subscription.subscription', sub_id, { data });
        }
        // The payment failed or the customer does not have a valid payment method.
        // The subscription becomes past_due. Notify your customer and send them to the
        // customer portal to update their payment information.
        break;
      }


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
            status: 'subscription_end',
          }
    
          console.log(event.type, 'status: ', status)
          await strapi.entityService.update('api::subscription.subscription', sub_id, { data });
        }

        console.log(`Subscription deleted`);
        // Then define and call a method to handle the subscription deleted.
        // handleSubscriptionDeleted(subscriptionDeleted);
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
          console.log(event.type, 'status: ', status)
    
          await strapi.entityService.update('api::subscription.subscription', sub_id, { data });
        }
        break;
      }

  
      default:
        console.log(`Unhandled event type ${event.type}.`);
    }
    
    ctx.body = { received: true };
  }
}));
