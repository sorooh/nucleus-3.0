/**
 * Customer Service Integration Adapter
 * 
 * يربط منصة خدمة العملاء الذكية مع النواة المركزية (Nucleus)
 * - استقبال المحادثات المصنفة والردود
 * - تخزينها في قاعدة البيانات
 * - ربطها مع Memory Hub للتحليل والتعلم
 * - توليد إحصائيات وتقارير
 */

import { db } from "../../db";
import { customerConversations } from "../../../shared/schema";
import type { InsertCustomerConversation, CustomerConversation } from "../../../shared/schema";
import { memoryHub } from "../../../nucleus/core/memory-hub";
import { eq } from "drizzle-orm";

export class CustomerServiceAdapter {
  /**
   * حفظ محادثة جديدة من منصة خدمة العملاء
   */
  async saveConversation(data: InsertCustomerConversation): Promise<CustomerConversation> {
    try {
      console.log('[CustomerService] Saving conversation:', {
        account: data.accountName,
        topic: data.classifiedTopic,
        feedback: data.feedback
      });

      // حفظ في قاعدة البيانات
      const [conversation] = await db
        .insert(customerConversations)
        .values(data)
        .returning();

      console.log('[CustomerService] ✅ Conversation saved:', conversation.id);

      // تسجيل في Memory Hub للتحليل والتعلم
      await this.recordInMemoryHub(conversation);

      // تحليل الأنماط المتكررة
      await this.analyzePatterns(conversation);

      return conversation;
    } catch (error: any) {
      console.error('[CustomerService] ❌ Error saving conversation:', error.message);
      throw new Error(`Failed to save conversation: ${error.message}`);
    }
  }

  /**
   * تحديث محادثة موجودة (مثلاً: تغيير الرد النهائي أو feedback)
   */
  async updateConversation(
    id: string,
    updates: Partial<InsertCustomerConversation>
  ): Promise<CustomerConversation> {
    try {
      console.log('[CustomerService] Updating conversation:', id);

      const [updated] = await db
        .update(customerConversations)
        .set({
          ...updates,
          updatedAt: new Date()
        })
        .where(eq(customerConversations.id, id))
        .returning();

      if (!updated) {
        throw new Error('Conversation not found');
      }

      console.log('[CustomerService] ✅ Conversation updated');

      // تسجيل التحديث في Memory Hub
      memoryHub.recordInsight({
        type: 'pattern',
        description: `[Conversation Updated] ${updated.accountName} - ${updated.classifiedTopic}`,
        confidence: 0.7,
        sources: ['customer-service-platform'],
        evidence: {
          conversationId: id,
          updates,
          topic: updated.classifiedTopic
        }
      });

      return updated;
    } catch (error: any) {
      console.error('[CustomerService] ❌ Error updating conversation:', error.message);
      throw new Error(`Failed to update conversation: ${error.message}`);
    }
  }

  /**
   * الحصول على محادثة بواسطة ID
   */
  async getConversation(id: string): Promise<CustomerConversation | null> {
    try {
      const [conversation] = await db
        .select()
        .from(customerConversations)
        .where(eq(customerConversations.id, id))
        .limit(1);

      return conversation || null;
    } catch (error: any) {
      console.error('[CustomerService] ❌ Error fetching conversation:', error.message);
      throw new Error(`Failed to fetch conversation: ${error.message}`);
    }
  }

  /**
   * تسجيل المحادثة في Memory Hub للتحليل والتعلم
   */
  private async recordInMemoryHub(conversation: CustomerConversation): Promise<void> {
    try {
      // تحديد نوع المصدر
      const sourcePrefix = conversation.sourceType === 'image' ? '[Image]' : '[Text]';

      memoryHub.recordInsight({
        type: 'pattern',
        description: `${sourcePrefix} [${conversation.accountName}] ${conversation.classifiedTopic}`,
        confidence: 0.8,
        sources: ['customer-service-platform'],
        evidence: {
          conversationId: conversation.id,
          account: conversation.accountName,
          topic: conversation.classifiedTopic,
          feedback: conversation.feedback,
          originalMessage: conversation.originalMessage,
          finalReply: conversation.finalReply,
          messageTimestamp: conversation.messageTimestamp,
          metadata: conversation.metadata
        }
      });

      console.log(`[CustomerService] [${conversation.feedback}] Recorded in Memory Hub: ${conversation.classifiedTopic}`);
    } catch (error: any) {
      console.error('[CustomerService] ⚠️ Failed to record in Memory Hub:', error.message);
      // لا نرمي خطأ هنا - المحادثة محفوظة في DB على الأقل
    }
  }

  /**
   * تحليل الأنماط المتكررة لنفس الموضوع والحساب
   */
  private async analyzePatterns(conversation: CustomerConversation): Promise<void> {
    try {
      // البحث عن محادثات مشابهة لنفس الحساب ونفس الموضوع
      const similarConversations = await db
        .select()
        .from(customerConversations)
        .where(eq(customerConversations.accountName, conversation.accountName))
        .limit(100);

      // فلترة المحادثات بنفس الموضوع
      const sameTopic = similarConversations.filter(
        c => c.classifiedTopic === conversation.classifiedTopic
      );

      if (sameTopic.length >= 3) {
        // إذا تكرر نفس الموضوع 3 مرات أو أكثر، نسجله كنمط
        memoryHub.recordInsight({
          type: 'pattern',
          description: `[Recurring Pattern] ${conversation.classifiedTopic} in ${conversation.accountName}`,
          confidence: 0.9,
          sources: ['customer-service-platform'],
          evidence: {
            account: conversation.accountName,
            topic: conversation.classifiedTopic,
            occurrences: sameTopic.length,
            latestConversationId: conversation.id,
            suggestion: 'This issue may require a root cause fix or process improvement'
          }
        });

        console.log(`[CustomerService] [Pattern Detected] ${conversation.classifiedTopic} (${sameTopic.length}x)`);
      }
    } catch (error: any) {
      console.error('[CustomerService] ⚠️ Failed to analyze patterns:', error.message);
    }
  }

  /**
   * الحصول على إحصائيات حساب معين
   */
  async getAccountStats(accountName: string) {
    try {
      const conversations = await db
        .select()
        .from(customerConversations)
        .where(eq(customerConversations.accountName, accountName));

      // تجميع حسب الموضوع
      const topicCounts: Record<string, number> = {};
      const feedbackCounts: Record<string, number> = {
        approved: 0,
        edited: 0,
        pending: 0
      };

      conversations.forEach(conv => {
        topicCounts[conv.classifiedTopic] = (topicCounts[conv.classifiedTopic] || 0) + 1;
        feedbackCounts[conv.feedback] = (feedbackCounts[conv.feedback] || 0) + 1;
      });

      // ترتيب المواضيع حسب الأكثر تكراراً
      const topTopics = Object.entries(topicCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([topic, count]) => ({ topic, count }));

      return {
        account: accountName,
        totalConversations: conversations.length,
        topTopics,
        feedbackStats: feedbackCounts,
        approvalRate: conversations.length > 0 
          ? ((feedbackCounts.approved / conversations.length) * 100).toFixed(1) + '%'
          : '0%'
      };
    } catch (error: any) {
      console.error('[CustomerService] ❌ Error getting stats:', error.message);
      throw new Error(`Failed to get account stats: ${error.message}`);
    }
  }

  /**
   * الحصول على إحصائيات عامة لجميع الحسابات
   */
  async getOverallStats() {
    try {
      const allConversations = await db
        .select()
        .from(customerConversations);

      // تجميع حسب الحساب
      const accountCounts: Record<string, number> = {};
      const topicCounts: Record<string, number> = {};

      allConversations.forEach(conv => {
        accountCounts[conv.accountName] = (accountCounts[conv.accountName] || 0) + 1;
        topicCounts[conv.classifiedTopic] = (topicCounts[conv.classifiedTopic] || 0) + 1;
      });

      const topAccounts = Object.entries(accountCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([account, count]) => ({ account, count }));

      const topTopics = Object.entries(topicCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([topic, count]) => ({ topic, count }));

      return {
        totalConversations: allConversations.length,
        totalAccounts: Object.keys(accountCounts).length,
        topAccounts,
        topTopics
      };
    } catch (error: any) {
      console.error('[CustomerService] ❌ Error getting overall stats:', error.message);
      throw new Error(`Failed to get overall stats: ${error.message}`);
    }
  }
}
