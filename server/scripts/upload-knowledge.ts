#!/usr/bin/env tsx
/**
 * Upload Knowledge Document Script
 * رفع وثيقة إلى نظام تغذية المعرفة بدون الحاجة لـ authentication
 */

import { knowledgeFeed } from '../../nucleus/core/knowledge-feed';
import '../../nucleus/network/knowledge-gateway'; // ✅ Import to register event listeners
import { db } from '../db';
import { knowledgeFeeds } from '../../shared/schema';
import { eq } from 'drizzle-orm';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

// Deterministic counter for file naming (100% honesty - no Math.random())
let fileCounter = 0;

async function uploadKnowledgeDocument(filePath: string, title?: string) {
  try {
    console.log('🚀 بدء رفع الوثيقة إلى نظام تغذية المعرفة...');

    // Activate knowledge feed if not active
    if (!knowledgeFeed.isActive()) {
      console.log('⚡ تفعيل محرك تغذية المعرفة...');
      await knowledgeFeed.activate();
    }

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      throw new Error(`الملف غير موجود: ${filePath}`);
    }

    // Read file
    const fileBuffer = await fs.promises.readFile(filePath);
    const originalName = path.basename(filePath);
    const fileType = path.extname(filePath).substring(1).toLowerCase();
    const fileSize = fileBuffer.length;

    // Generate hash
    const contentHash = crypto.createHash('sha256')
      .update(fileBuffer)
      .digest('hex');

    console.log(`📄 الملف: ${originalName}`);
    console.log(`📊 الحجم: ${(fileSize / 1024).toFixed(2)} KB`);
    console.log(`🔑 Hash: ${contentHash.substring(0, 16)}...`);

    // Check for duplicates
    const [existing] = await db
      .select()
      .from(knowledgeFeeds)
      .where(eq(knowledgeFeeds.contentHash, contentHash))
      .limit(1);

    if (existing) {
      console.log('⚠️ الملف مكرر - موجود بالفعل في قاعدة المعرفة');
      console.log(`   📌 Feed ID: ${existing.id}`);
      console.log(`   📅 تاريخ الرفع: ${existing.createdAt}`);
      return existing;
    }

    // Copy file to uploads directory
    const uploadsDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const uniqueSuffix = `${Date.now()}-${(fileCounter++).toString(36).padStart(6, '0')}`;
    const ext = path.extname(originalName);
    const fileName = `feed-${uniqueSuffix}${ext}`;
    const destPath = path.join(uploadsDir, fileName);

    await fs.promises.copyFile(filePath, destPath);

    // Get or create system user
    const { users } = await import('../../shared/schema');
    let systemUser = await db.select().from(users).where(eq(users.username, 'sam')).limit(1);
    
    if (!systemUser || systemUser.length === 0) {
      // Fallback to any user
      systemUser = await db.select().from(users).limit(1);
    }

    const uploaderId = systemUser[0]?.id || '9ea5031e-c930-43d8-98ac-fe117b890bce';
    const uploaderName = systemUser[0]?.username || 'System';

    // Create feed record
    const [feedRecord] = await db.insert(knowledgeFeeds).values({
      fileName,
      originalName: title || originalName,
      fileType,
      fileSize,
      uploaderId,
      uploaderName,
      status: 'queued',
      contentHash
    }).returning();

    console.log(`✅ تم إنشاء سجل Feed ID: ${feedRecord.id}`);

    // Process file
    console.log('🔄 جاري معالجة الملف...');
    
    const processingResult = await knowledgeFeed.processFeed({
      id: feedRecord.id,
      originalName: title || originalName,
      fileName,
      filePath: destPath,
      fileType,
      fileSize,
      uploaderId,
      uploaderName
    });

    console.log('✅ تم رفع ومعالجة الوثيقة بنجاح!');
    console.log(`   📌 Feed ID: ${feedRecord.id}`);
    console.log(`   📝 العنوان: ${title || originalName}`);
    console.log(`   📦 القطع المستخرجة: ${processingResult?.chunksCount || 'N/A'}`);

    return feedRecord;

  } catch (error: any) {
    console.error('❌ خطأ في رفع الوثيقة:', error.message);
    throw error;
  }
}

// Main execution
const args = process.argv.slice(2);
const filePath = args[0];
const title = args[1];

if (!filePath) {
  console.error('❌ الاستخدام: tsx server/scripts/upload-knowledge.ts <file_path> [title]');
  process.exit(1);
}

uploadKnowledgeDocument(filePath, title)
  .then(() => {
    console.log('\n🎉 العملية مكتملة!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 فشلت العملية:', error.message);
    process.exit(1);
  });
