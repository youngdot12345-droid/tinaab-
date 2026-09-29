const Stripe = require('stripe');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  if (!process.env.STRIPE_SECRET_KEY) {
    return res.status(500).json({ error: 'Stripe is not configured on the server' });
  }

  try {
    const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
    const { amount, currency = 'usd', description = 'Tinaab payment' } = req.body || {};
    const numericAmount = Number(amount);

    if (!Number.isInteger(numericAmount) || numericAmount < 50) {
      return res.status(400).json({ error: 'amount must be an integer in the smallest currency unit and at least 50' });
    }

    const origin = req.headers.origin || process.env.PUBLIC_APP_URL || 'https://tinaab.name.ng';
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{
        price_data: {
          currency: String(currency).toLowerCase(),
          product_data: { name: description },
          unit_amount: numericAmount,
        },
        quantity: 1,
      }],
      success_url: `${origin}/?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/?payment=cancelled`,
    });

    return res.status(200).json({ id: session.id, url: session.url });
  } catch (error) {
    console.error('Stripe checkout error:', error);
    return res.status(500).json({ error: 'Unable to create Stripe checkout session' });
  }
};
