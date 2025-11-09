import { db } from './db';
import { companyDomains } from '../shared/schema';
import { eq } from 'drizzle-orm';

// Common company domains mapping
const COMPANY_DOMAINS = [
  // Tech Giants
  { domain: 'google.com', companyName: 'Google', logo: 'https://logo.clearbit.com/google.com' },
  { domain: 'microsoft.com', companyName: 'Microsoft', logo: 'https://logo.clearbit.com/microsoft.com' },
  { domain: 'apple.com', companyName: 'Apple', logo: 'https://logo.clearbit.com/apple.com' },
  { domain: 'amazon.com', companyName: 'Amazon', logo: 'https://logo.clearbit.com/amazon.com' },
  { domain: 'meta.com', companyName: 'Meta', logo: 'https://logo.clearbit.com/meta.com' },
  { domain: 'facebook.com', companyName: 'Meta', logo: 'https://logo.clearbit.com/facebook.com' },
  { domain: 'instagram.com', companyName: 'Meta', logo: 'https://logo.clearbit.com/instagram.com' },
  { domain: 'netflix.com', companyName: 'Netflix', logo: 'https://logo.clearbit.com/netflix.com' },
  { domain: 'tesla.com', companyName: 'Tesla', logo: 'https://logo.clearbit.com/tesla.com' },
  { domain: 'spacex.com', companyName: 'SpaceX', logo: 'https://logo.clearbit.com/spacex.com' },
  
  // AI Companies
  { domain: 'openai.com', companyName: 'OpenAI', logo: 'https://logo.clearbit.com/openai.com' },
  { domain: 'anthropic.com', companyName: 'Anthropic', logo: 'https://logo.clearbit.com/anthropic.com' },
  { domain: 'deepmind.com', companyName: 'DeepMind', logo: 'https://logo.clearbit.com/deepmind.com' },
  
  // Streaming & Entertainment
  { domain: 'spotify.com', companyName: 'Spotify', logo: 'https://logo.clearbit.com/spotify.com' },
  { domain: 'uber.com', companyName: 'Uber', logo: 'https://logo.clearbit.com/uber.com' },
  { domain: 'airbnb.com', companyName: 'Airbnb', logo: 'https://logo.clearbit.com/airbnb.com' },
  { domain: 'lyft.com', companyName: 'Lyft', logo: 'https://logo.clearbit.com/lyft.com' },
  
  // Financial & Fintech
  { domain: 'paypal.com', companyName: 'PayPal', logo: 'https://logo.clearbit.com/paypal.com' },
  { domain: 'stripe.com', companyName: 'Stripe', logo: 'https://logo.clearbit.com/stripe.com' },
  { domain: 'square.com', companyName: 'Square', logo: 'https://logo.clearbit.com/square.com' },
  { domain: 'coinbase.com', companyName: 'Coinbase', logo: 'https://logo.clearbit.com/coinbase.com' },
  { domain: 'robinhood.com', companyName: 'Robinhood', logo: 'https://logo.clearbit.com/robinhood.com' },
  
  // Enterprise Software
  { domain: 'salesforce.com', companyName: 'Salesforce', logo: 'https://logo.clearbit.com/salesforce.com' },
  { domain: 'oracle.com', companyName: 'Oracle', logo: 'https://logo.clearbit.com/oracle.com' },
  { domain: 'sap.com', companyName: 'SAP', logo: 'https://logo.clearbit.com/sap.com' },
  { domain: 'adobe.com', companyName: 'Adobe', logo: 'https://logo.clearbit.com/adobe.com' },
  { domain: 'slack.com', companyName: 'Slack', logo: 'https://logo.clearbit.com/slack.com' },
  { domain: 'zoom.us', companyName: 'Zoom', logo: 'https://logo.clearbit.com/zoom.us' },
  { domain: 'atlassian.com', companyName: 'Atlassian', logo: 'https://logo.clearbit.com/atlassian.com' },
  
  // Cloud Providers
  { domain: 'amazonaws.com', companyName: 'Amazon Web Services', logo: 'https://logo.clearbit.com/aws.amazon.com' },
  { domain: 'digitalocean.com', companyName: 'DigitalOcean', logo: 'https://logo.clearbit.com/digitalocean.com' },
  { domain: 'linode.com', companyName: 'Linode', logo: 'https://logo.clearbit.com/linode.com' },
  
  // Social Media & Communication
  { domain: 'twitter.com', companyName: 'Twitter', logo: 'https://logo.clearbit.com/twitter.com' },
  { domain: 'x.com', companyName: 'X (Twitter)', logo: 'https://logo.clearbit.com/x.com' },
  { domain: 'linkedin.com', companyName: 'LinkedIn', logo: 'https://logo.clearbit.com/linkedin.com' },
  { domain: 'discord.com', companyName: 'Discord', logo: 'https://logo.clearbit.com/discord.com' },
  { domain: 'reddit.com', companyName: 'Reddit', logo: 'https://logo.clearbit.com/reddit.com' },
  { domain: 'snapchat.com', companyName: 'Snapchat', logo: 'https://logo.clearbit.com/snapchat.com' },
  { domain: 'tiktok.com', companyName: 'TikTok', logo: 'https://logo.clearbit.com/tiktok.com' },
  
  // E-commerce
  { domain: 'shopify.com', companyName: 'Shopify', logo: 'https://logo.clearbit.com/shopify.com' },
  { domain: 'ebay.com', companyName: 'eBay', logo: 'https://logo.clearbit.com/ebay.com' },
  { domain: 'etsy.com', companyName: 'Etsy', logo: 'https://logo.clearbit.com/etsy.com' },
  
  // Gaming
  { domain: 'valve.com', companyName: 'Valve', logo: 'https://logo.clearbit.com/valvesoftware.com' },
  { domain: 'riotgames.com', companyName: 'Riot Games', logo: 'https://logo.clearbit.com/riotgames.com' },
  { domain: 'epic.com', companyName: 'Epic Games', logo: 'https://logo.clearbit.com/epic.com' },
  { domain: 'blizzard.com', companyName: 'Blizzard Entertainment', logo: 'https://logo.clearbit.com/blizzard.com' },
  { domain: 'ea.com', companyName: 'Electronic Arts', logo: 'https://logo.clearbit.com/ea.com' },
  
  // Consulting & Services
  { domain: 'mckinsey.com', companyName: 'McKinsey & Company', logo: 'https://logo.clearbit.com/mckinsey.com' },
  { domain: 'bain.com', companyName: 'Bain & Company', logo: 'https://logo.clearbit.com/bain.com' },
  { domain: 'bcg.com', companyName: 'Boston Consulting Group', logo: 'https://logo.clearbit.com/bcg.com' },
  { domain: 'deloitte.com', companyName: 'Deloitte', logo: 'https://logo.clearbit.com/deloitte.com' },
  { domain: 'pwc.com', companyName: 'PwC', logo: 'https://logo.clearbit.com/pwc.com' },
  { domain: 'ey.com', companyName: 'Ernst & Young', logo: 'https://logo.clearbit.com/ey.com' },
  { domain: 'kpmg.com', companyName: 'KPMG', logo: 'https://logo.clearbit.com/kpmg.com' },
  
  // Investment Banks
  { domain: 'goldmansachs.com', companyName: 'Goldman Sachs', logo: 'https://logo.clearbit.com/goldmansachs.com' },
  { domain: 'morganstanley.com', companyName: 'Morgan Stanley', logo: 'https://logo.clearbit.com/morganstanley.com' },
  { domain: 'jpmorgan.com', companyName: 'JPMorgan Chase', logo: 'https://logo.clearbit.com/jpmorgan.com' },
  { domain: 'jpmorganchase.com', companyName: 'JPMorgan Chase', logo: 'https://logo.clearbit.com/jpmorganchase.com' },
  
  // Healthcare & Biotech
  { domain: 'pfizer.com', companyName: 'Pfizer', logo: 'https://logo.clearbit.com/pfizer.com' },
  { domain: 'jnj.com', companyName: 'Johnson & Johnson', logo: 'https://logo.clearbit.com/jnj.com' },
  { domain: 'moderna.com', companyName: 'Moderna', logo: 'https://logo.clearbit.com/moderna.com' },
  
  // Automotive
  { domain: 'ford.com', companyName: 'Ford', logo: 'https://logo.clearbit.com/ford.com' },
  { domain: 'gm.com', companyName: 'General Motors', logo: 'https://logo.clearbit.com/gm.com' },
  { domain: 'toyota.com', companyName: 'Toyota', logo: 'https://logo.clearbit.com/toyota.com' },
  
  // Universities (some major ones)
  { domain: 'stanford.edu', companyName: 'Stanford University', logo: 'https://logo.clearbit.com/stanford.edu' },
  { domain: 'mit.edu', companyName: 'MIT', logo: 'https://logo.clearbit.com/mit.edu' },
  { domain: 'harvard.edu', companyName: 'Harvard University', logo: 'https://logo.clearbit.com/harvard.edu' },
  { domain: 'berkeley.edu', companyName: 'UC Berkeley', logo: 'https://logo.clearbit.com/berkeley.edu' },
  { domain: 'cmu.edu', companyName: 'Carnegie Mellon University', logo: 'https://logo.clearbit.com/cmu.edu' },
];

export async function seedCompanyDomains() {
  console.log('🏢 Seeding company domains...');
  
  try {
    let insertedCount = 0;
    let updatedCount = 0;

    for (const domainData of COMPANY_DOMAINS) {
      // Check if domain already exists
      const existing = await db
        .select()
        .from(companyDomains)
        .where(eq(companyDomains.domain, domainData.domain))
        .limit(1);

      if (existing.length > 0) {
        // Update existing mapping if company name is different
        if (existing[0].companyName !== domainData.companyName || existing[0].logo !== domainData.logo) {
          await db
            .update(companyDomains)
            .set({
              companyName: domainData.companyName,
              logo: domainData.logo,
              updatedAt: new Date(),
            })
            .where(eq(companyDomains.domain, domainData.domain));
          updatedCount++;
        }
      } else {
        // Insert new mapping
        await db.insert(companyDomains).values({
          domain: domainData.domain,
          companyName: domainData.companyName,
          logo: domainData.logo,
          isVerified: true,
        });
        insertedCount++;
      }
    }

    console.log(`✅ Company domains seeded: ${insertedCount} inserted, ${updatedCount} updated`);
  } catch (error) {
    console.error('❌ Error seeding company domains:', error);
    throw error;
  }
}

// Run seeding if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedCompanyDomains()
    .then(() => {
      console.log('🎉 Company domains seeding completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Company domains seeding failed:', error);
      process.exit(1);
    });
}
