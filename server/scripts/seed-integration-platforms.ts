/**
 * Seed Integration Platforms & Links
 * إضافة بيانات تجريبية حقيقية للمنصات والروابط
 */

import { db } from '../storage';
import { integrationNuclei, platformLinks, integrationsRegistry } from '@shared/schema';

async function seedPlatforms() {
  console.log('🌱 Starting platform seeding...\n');

  try {
    // 1. SIDE Platform (Internal)
    const sideResult = await db.insert(integrationNuclei).values({
      name: 'side',
      displayName: 'SIDE – Intelligent Development Ecosystem',
      arabicName: 'سيدا – النظام التطويري الذكي',
      description: 'Embedded development core for all nuclei',
      type: 'INTERNAL',
      status: 'HEALTHY',
      health: 'Healthy',
      progress: 95,
      version: '3.2.0',
      connectionUrl: 'internal://side',
      capabilities: ['code-generation', 'deployment', 'testing'],
      metadata: { priority: 'critical', team: 'core' },
    }).returning();
    
    const sideId = sideResult[0]?.id;
    console.log('✅ SIDE platform created:', sideId);

    // SIDE Links
    if (sideId) {
      await db.insert(platformLinks).values([
        { platformId: sideId, connectedTo: 'Nicholas', linkType: 'direct', status: 'active' },
        { platformId: sideId, connectedTo: 'Academy', linkType: 'mirrored', status: 'active' },
        { platformId: sideId, connectedTo: 'Phase Ω.9', linkType: 'dependent', status: 'active' },
      ]);
      console.log('  ✓ Added SIDE links\n');
    }

    // 2. Academy Platform
    const academyResult = await db.insert(integrationNuclei).values({
      name: 'academy',
      displayName: 'Surooh Academy',
      arabicName: 'أكاديمية سروح',
      description: 'Educational platform for AI and development training',
      type: 'INTERNAL',
      status: 'HEALTHY',
      health: 'Healthy',
      progress: 78,
      version: '2.1.0',
      connectionUrl: 'https://academy.surooh.com',
      capabilities: ['courses', 'certification', 'mentorship'],
      metadata: { priority: 'high', team: 'education' },
    }).returning();
    
    const academyId = academyResult[0]?.id;
    console.log('✅ Academy platform created:', academyId);

    if (academyId) {
      await db.insert(platformLinks).values([
        { platformId: academyId, connectedTo: 'Nicholas', linkType: 'direct', status: 'active' },
        { platformId: academyId, connectedTo: 'SIDE', linkType: 'mirrored', status: 'active' },
      ]);
      console.log('  ✓ Added Academy links\n');
    }

    // 3. Customer Service Platform (External Integration)
    const csResult = await db.insert(integrationNuclei).values({
      name: 'customer-service',
      displayName: 'Customer Service Platform',
      arabicName: 'منصة خدمة العملاء',
      description: 'Integration with Zendesk API for customer support',
      type: 'EXTERNAL',
      status: 'HEALTHY',
      health: 'Healthy',
      progress: 100,
      version: '1.0.0',
      connectionUrl: 'https://zendesk.com/api/v2',
      capabilities: ['tickets', 'chat', 'analytics'],
      metadata: { provider: 'zendesk', region: 'us-east' },
    }).returning();
    
    const csId = csResult[0]?.id;
    console.log('✅ Customer Service platform created:', csId);

    if (csId) {
      await db.insert(platformLinks).values([
        { platformId: csId, connectedTo: 'Nicholas', linkType: 'direct', status: 'active' },
        { platformId: csId, connectedTo: 'EXTERNAL', linkType: 'direct', status: 'active' },
      ]);
      console.log('  ✓ Added Customer Service links\n');
    }

    // 4. Payment Platform (External Integration)
    const paymentResult = await db.insert(integrationNuclei).values({
      name: 'payment-gateway',
      displayName: 'Payment Gateway',
      arabicName: 'بوابة الدفع',
      description: 'Stripe integration for payment processing',
      type: 'EXTERNAL',
      status: 'DEGRADED',
      health: 'Warning',
      progress: 85,
      version: '2.5.3',
      connectionUrl: 'https://api.stripe.com/v1',
      capabilities: ['payments', 'subscriptions', 'refunds'],
      metadata: { provider: 'stripe', currency: 'USD' },
    }).returning();
    
    const paymentId = paymentResult[0]?.id;
    console.log('✅ Payment Gateway platform created:', paymentId);

    if (paymentId) {
      await db.insert(platformLinks).values([
        { platformId: paymentId, connectedTo: 'Nicholas', linkType: 'direct', status: 'pending' },
        { platformId: paymentId, connectedTo: 'B2C', linkType: 'dependent', status: 'active' },
      ]);
      console.log('  ✓ Added Payment Gateway links\n');
    }

    // 5. AI Models Hub (External Integration)
    const aiHubResult = await db.insert(integrationNuclei).values({
      name: 'ai-models-hub',
      displayName: 'AI Models Hub',
      arabicName: 'مركز النماذج الذكية',
      description: 'OpenAI, Llama, and other AI model integrations',
      type: 'EXTERNAL',
      status: 'HEALTHY',
      health: 'Healthy',
      progress: 100,
      version: '4.0.0',
      connectionUrl: 'https://api.openai.com/v1',
      capabilities: ['chat', 'embeddings', 'completions'],
      metadata: { provider: 'openai', models: ['gpt-4', 'llama-3.3'] },
    }).returning();
    
    const aiHubId = aiHubResult[0]?.id;
    console.log('✅ AI Models Hub platform created:', aiHubId);

    if (aiHubId) {
      await db.insert(platformLinks).values([
        { platformId: aiHubId, connectedTo: 'Nicholas', linkType: 'direct', status: 'active' },
        { platformId: aiHubId, connectedTo: 'Senorbit', linkType: 'direct', status: 'active' },
      ]);
      console.log('  ✓ Added AI Models Hub links\n');
    }

    // 6. B2C Platform
    const b2cResult = await db.insert(integrationNuclei).values({
      name: 'b2c',
      displayName: 'B2C E-Commerce Platform',
      arabicName: 'منصة التجارة الإلكترونية',
      description: 'Consumer-facing e-commerce platform',
      type: 'INTERNAL',
      status: 'OFFLINE',
      health: 'Critical',
      progress: 45,
      version: '1.2.0',
      connectionUrl: 'https://b2c.surooh.com',
      capabilities: ['products', 'orders', 'inventory'],
      metadata: { priority: 'medium', team: 'commerce' },
    }).returning();
    
    const b2cId = b2cResult[0]?.id;
    console.log('✅ B2C platform created:', b2cId);

    if (b2cId) {
      await db.insert(platformLinks).values([
        { platformId: b2cId, connectedTo: 'Nicholas', linkType: 'direct', status: 'broken' },
        { platformId: b2cId, connectedTo: 'Payment Gateway', linkType: 'dependent', status: 'broken' },
      ]);
      console.log('  ✓ Added B2C links\n');
    }

    // Now add integrations to registry
    console.log('\n🔌 Adding integrations to registry...\n');

    // Zendesk Integration
    const zendeskInt = await db.insert(integrationsRegistry).values({
      name: 'Zendesk API',
      provider: 'zendesk',
      category: 'customer-service',
      ownedBy: 'Nicholas',
      shared: 1,
      apiEndpoint: 'https://zendesk.com/api/v2',
      apiVersion: 'v2',
      status: 'active',
      hasApiKey: 1,
      healthStatus: 'healthy',
      description: 'Customer support ticket management',
      usedBy: csId ? [csId] : [],
      tags: ['support', 'tickets', 'external'],
    }).returning();
    console.log('✅ Zendesk integration registered');

    // Stripe Integration
    const stripeInt = await db.insert(integrationsRegistry).values({
      name: 'Stripe Payment Gateway',
      provider: 'stripe',
      category: 'payment',
      ownedBy: 'Nicholas',
      shared: 1,
      apiEndpoint: 'https://api.stripe.com/v1',
      apiVersion: 'v1',
      status: 'active',
      hasApiKey: 1,
      healthStatus: 'degraded',
      description: 'Payment processing and subscription management',
      usedBy: paymentId ? [paymentId, b2cId || ''] : [],
      tags: ['payment', 'stripe', 'external'],
    }).returning();
    console.log('✅ Stripe integration registered');

    // Llama 3.3 Integration
    const llamaInt = await db.insert(integrationsRegistry).values({
      name: 'Llama 3.3 70B (Self-hosted)',
      provider: 'ollama',
      category: 'ai',
      ownedBy: 'Nicholas',
      shared: 1,
      apiEndpoint: 'https://nrr9t7rl1nxsod-11434.proxy.runpod.net',
      apiVersion: 'ollama-v1',
      status: 'active',
      hasApiKey: 1,
      healthStatus: 'healthy',
      description: '100% open-source AI model on GPU server',
      usedBy: aiHubId ? [aiHubId, sideId || ''] : [],
      tags: ['ai', 'llm', 'self-hosted', 'open-source'],
    }).returning();
    console.log('✅ Llama 3.3 integration registered');

    console.log('\n✨ Seeding completed successfully!');
    console.log(`   Platforms: 6`);
    console.log(`   Links: ~12`);
    console.log(`   Integrations: 3\n`);
    
  } catch (error: any) {
    console.error('❌ Seeding failed:', error);
    console.error(error.message);
  }
}

// Run seeding
seedPlatforms().then(() => {
  console.log('🎉 Integration platforms seeded successfully!');
  process.exit(0);
}).catch((error) => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
});
