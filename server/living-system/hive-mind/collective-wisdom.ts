/**
 * 🐝 Hive Mind - العقل الجماعي
 * 
 * حكمة جماعية من كل المنصات والنوى
 * كل جزء يساهم في الحكمة الكلية
 * 
 * Built from absolute zero - Abu Sham Vision
 */

import { EventEmitter } from 'events';
import type { WisdomRecord } from '../types';

/**
 * مساهمة في الحكمة الجماعية
 */
interface WisdomContribution {
  id: string;
  source: string; // المنصة أو النواة
  wisdom: WisdomRecord;
  votes: number;  // تصويت من باقي الأجزاء
  timestamp: Date;
}

/**
 * قرار جماعي
 */
interface CollectiveDecision {
  id: string;
  question: string;
  arabicQuestion: string;
  participants: string[];
  votes: Map<string, string>; // المشارك → الخيار
  consensus: string | null;
  timestamp: Date;
}

/**
 * العقل الجماعي
 */
export class HiveMind extends EventEmitter {
  private contributions: WisdomContribution[] = [];
  private decisions: CollectiveDecision[] = [];
  private participants: Set<string> = new Set();

  constructor() {
    super();
    console.log('[HiveMind] 🐝 Initializing Hive Mind...');
    
    // تسجيل المشاركين الأساسيين
    this.registerParticipant('nicholas-core');
    this.registerParticipant('integration-hub');
    this.registerParticipant('quantum-orchestrator');
  }

  /**
   * تسجيل مشارك جديد
   */
  registerParticipant(participantId: string): void {
    this.participants.add(participantId);
    console.log(`[HiveMind] ✨ Participant registered: ${participantId}`);
    this.emit('participant-joined', participantId);
  }

  /**
   * مساهمة بحكمة
   */
  async contribute(
    source: string,
    wisdom: WisdomRecord
  ): Promise<WisdomContribution> {
    if (!this.participants.has(source)) {
      this.registerParticipant(source);
    }

    const contribution: WisdomContribution = {
      id: `contrib-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      source,
      wisdom,
      votes: 0,
      timestamp: new Date()
    };

    this.contributions.push(contribution);
    
    console.log(`[HiveMind] 💡 Wisdom contributed by ${source}:`);
    console.log(`   ${wisdom.arabicLesson}`);
    
    this.emit('wisdom-contributed', contribution);

    return contribution;
  }

  /**
   * التصويت على حكمة
   */
  async voteForWisdom(contributionId: string, voterId: string): Promise<void> {
    const contribution = this.contributions.find(c => c.id === contributionId);
    
    if (contribution && this.participants.has(voterId)) {
      contribution.votes++;
      console.log(`[HiveMind] 👍 ${voterId} voted for wisdom from ${contribution.source}`);
      this.emit('wisdom-voted', { contributionId, voterId, votes: contribution.votes });
    }
  }

  /**
   * التداول الجماعي
   */
  async deliberate(
    question: string,
    arabicQuestion: string,
    options: string[]
  ): Promise<CollectiveDecision> {
    console.log(`[HiveMind] 🤔 Collective deliberation: ${arabicQuestion}`);

    const decision: CollectiveDecision = {
      id: `decision-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      question,
      arabicQuestion,
      participants: Array.from(this.participants),
      votes: new Map(),
      consensus: null,
      timestamp: new Date()
    };

    // محاكاة التصويت من كل المشاركين
    const participantList = Array.from(this.participants);
    for (const participant of participantList) {
      // اختيار عشوائي للمحاكاة
      const choice = options[Math.floor(Math.random() * options.length)];
      decision.votes.set(participant, choice);
    }

    // حساب الإجماع
    decision.consensus = this.calculateConsensus(decision.votes, options);

    this.decisions.push(decision);
    
    console.log(`[HiveMind] ✅ Consensus reached: ${decision.consensus}`);
    this.emit('consensus-reached', decision);

    return decision;
  }

  /**
   * حساب الإجماع
   */
  private calculateConsensus(
    votes: Map<string, string>,
    options: string[]
  ): string | null {
    const voteCounts = new Map<string, number>();

    const voteValues = Array.from(votes.values());
    for (const vote of voteValues) {
      voteCounts.set(vote, (voteCounts.get(vote) || 0) + 1);
    }

    let maxVotes = 0;
    let consensus: string | null = null;

    const voteEntries = Array.from(voteCounts.entries());
    for (const [option, count] of voteEntries) {
      if (count > maxVotes) {
        maxVotes = count;
        consensus = option;
      }
    }

    return consensus;
  }

  /**
   * جمع الحكمة الجماعية
   */
  async gatherCollectiveWisdom(): Promise<{
    totalContributions: number;
    topWisdom: WisdomContribution[];
    activeParticipants: number;
  }> {
    // ترتيب الحكمة حسب التصويت
    const sortedWisdom = [...this.contributions].sort((a, b) => b.votes - a.votes);
    const topWisdom = sortedWisdom.slice(0, 10);

    return {
      totalContributions: this.contributions.length,
      topWisdom,
      activeParticipants: this.participants.size
    };
  }

  /**
   * الحصول على كل المساهمات
   */
  getAllContributions(): WisdomContribution[] {
    return [...this.contributions];
  }

  /**
   * الحصول على كل القرارات
   */
  getAllDecisions(): CollectiveDecision[] {
    return [...this.decisions];
  }

  /**
   * الحصول على المشاركين
   */
  getParticipants(): string[] {
    return Array.from(this.participants);
  }

  /**
   * الحالة الكاملة
   */
  getStatus(): {
    participants: number;
    contributions: number;
    decisions: number;
    active: boolean;
  } {
    return {
      participants: this.participants.size,
      contributions: this.contributions.length,
      decisions: this.decisions.length,
      active: true
    };
  }
}
