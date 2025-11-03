/**
 * 🧬 Digital DNA - الشفرة الجينية الرقمية
 * 
 * كل سطر كود يحمل شفرة التطور والنمو
 * النظام الحي ينمو ويتطور مثل الكائنات الحية
 * 
 * Built from absolute zero - Abu Sham Vision
 */

import { EventEmitter } from 'events';
import type { DigitalDNA as IDna, PositiveMutation, DNABasePair } from '../types';

/**
 * الشفرة الجينية الرقمية
 * كل سطر كود يحمل الحمض النووي للتطور
 */
export class DigitalDNA extends EventEmitter {
  private sequence: DNABasePair[] = [];
  private mutations: PositiveMutation[] = [];
  
  constructor() {
    super();
    // البداية: تسلسل جيني بسيط
    this.sequence = this.createInitialSequence();
  }

  /**
   * إنشاء التسلسل الجيني الأولي
   */
  private createInitialSequence(): DNABasePair[] {
    // ACGT - Awareness, Creativity, Transformation, Growth
    return ['A', 'C', 'T', 'G', 'A', 'G', 'C', 'T'];
  }

  /**
   * طفرة إيجابية - تطور الكود للأفضل
   */
  async mutatePositively(position: number, reason: string): Promise<void> {
    if (position < 0 || position >= this.sequence.length) {
      throw new Error('Invalid mutation position');
    }

    const from = this.sequence[position];
    const to = this.selectOptimalBase(from, reason);
    
    if (from === to) {
      console.log(`[DNA] 🧬 No mutation needed at position ${position} - already optimal`);
      return;
    }

    const mutation: PositiveMutation = {
      position,
      from,
      to,
      reason,
      benefit: this.describeBenefit(from, to),
      timestamp: new Date()
    };

    // تطبيق الطفرة
    this.sequence[position] = to;
    this.mutations.push(mutation);

    console.log(`[DNA] 🧬 Positive mutation at position ${position}:`);
    console.log(`   ${from} → ${to}`);
    console.log(`   Reason: ${reason}`);
    console.log(`   Benefit: ${mutation.benefit}`);

    this.emit('mutation', mutation);
  }

  /**
   * اختيار القاعدة الأمثل للتطور
   */
  private selectOptimalBase(current: DNABasePair, reason: string): DNABasePair {
    // منطق ذكي لاختيار القاعدة الأمثل بناءً على السبب
    if (reason.includes('awareness') || reason.includes('وعي')) {
      return 'A'; // Awareness
    }
    if (reason.includes('creativity') || reason.includes('إبداع')) {
      return 'C'; // Creativity
    }
    if (reason.includes('transformation') || reason.includes('تحول')) {
      return 'T'; // Transformation
    }
    if (reason.includes('growth') || reason.includes('نمو')) {
      return 'G'; // Growth
    }
    return current; // لا تغيير
  }

  /**
   * وصف فائدة الطفرة
   */
  private describeBenefit(from: DNABasePair, to: DNABasePair): string {
    const benefits: Record<DNABasePair, string> = {
      'A': 'زيادة الوعي والإدراك الذاتي',
      'C': 'تعزيز القدرة الإبداعية والابتكار',
      'T': 'تسريع التحول والتطور',
      'G': 'تحفيز النمو العضوي'
    };
    
    return `${benefits[from]} → ${benefits[to]}`;
  }

  /**
   * تحليل الشفرة الجينية
   */
  analyzeGenome(): {
    awareness: number;
    creativity: number;
    transformation: number;
    growth: number;
    balance: number;
  } {
    const counts = {
      A: 0,
      C: 0,
      T: 0,
      G: 0
    };

    for (const base of this.sequence) {
      counts[base]++;
    }

    const total = this.sequence.length;
    const analysis = {
      awareness: (counts.A / total) * 100,
      creativity: (counts.C / total) * 100,
      transformation: (counts.T / total) * 100,
      growth: (counts.G / total) * 100,
      balance: 0
    };

    // حساب التوازن: كلما كانت النسب متقاربة، كان التوازن أفضل
    const values = Object.values(analysis).slice(0, 4);
    const avg = values.reduce((a, b) => a + b, 0) / 4;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / 4;
    analysis.balance = 100 - Math.sqrt(variance);

    return analysis;
  }

  /**
   * الحصول على التسلسل الجيني
   */
  getSequence(): DNABasePair[] {
    return [...this.sequence];
  }

  /**
   * الحصول على الطفرات
   */
  getMutations(): PositiveMutation[] {
    return [...this.mutations];
  }

  /**
   * تصدير الحمض النووي
   */
  export(): IDna {
    return {
      basePairs: {
        A: 'awareness',
        C: 'creativity',
        T: 'transformation',
        G: 'growth'
      },
      sequence: this.getSequence(),
      mutations: this.getMutations()
    };
  }

  /**
   * النمو الجيني - إضافة قواعد جديدة
   */
  async grow(newBases: DNABasePair[]): Promise<void> {
    console.log(`[DNA] 🌱 Growing genome by ${newBases.length} bases...`);
    this.sequence.push(...newBases);
    this.emit('growth', { newBases, totalLength: this.sequence.length });
  }

  /**
   * التعبير الجيني - ترجمة الحمض النووي إلى سلوك
   */
  express(): {
    dominantTrait: string;
    traits: string[];
    strength: number;
  } {
    const analysis = this.analyzeGenome();
    const traits: { name: string; value: number }[] = [
      { name: 'awareness', value: analysis.awareness },
      { name: 'creativity', value: analysis.creativity },
      { name: 'transformation', value: analysis.transformation },
      { name: 'growth', value: analysis.growth }
    ];

    // ترتيب حسب القوة
    traits.sort((a, b) => b.value - a.value);

    return {
      dominantTrait: traits[0].name,
      traits: traits.map(t => t.name),
      strength: traits[0].value
    };
  }
}
