/**
 * 🧠 Central Nervous System - الجهاز العصبي المركزي
 * 
 * شبكة عصبية تربط كل أجزاء Nicholas ببعضها
 * كل جزء يشعر بكل الأجزاء - التزامن العصبي الكامل
 * 
 * Built from absolute zero - Abu Sham Vision
 */

import { EventEmitter } from 'events';
import type { NeuralPulse } from '../types';

/**
 * الخلية العصبية - Neuron
 */
class Neuron extends EventEmitter {
  constructor(
    public id: string,
    public type: 'sensory' | 'motor' | 'interneuron',
    public location: string
  ) {
    super();
  }

  /**
   * إرسال نبضة عصبية
   */
  async fire(pulse: Omit<NeuralPulse, 'id' | 'from' | 'timestamp'>): Promise<void> {
    const neuralPulse: NeuralPulse = {
      id: `pulse-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      from: this.id,
      timestamp: new Date(),
      ...pulse
    };

    this.emit('pulse', neuralPulse);
  }

  /**
   * استقبال نبضة عصبية
   */
  async receive(pulse: NeuralPulse): Promise<void> {
    this.emit('receive', pulse);
    
    // معالجة النبضة حسب النوع
    if (pulse.type === 'emotion') {
      await this.processEmotion(pulse);
    } else if (pulse.type === 'thought') {
      await this.processThought(pulse);
    } else if (pulse.type === 'energy') {
      await this.processEnergy(pulse);
    }
  }

  private async processEmotion(pulse: NeuralPulse): Promise<void> {
    // معالجة العاطفة
    console.log(`[Neuron:${this.id}] 💓 Processing emotion: ${pulse.payload.emotion}`);
  }

  private async processThought(pulse: NeuralPulse): Promise<void> {
    // معالجة الفكرة
    console.log(`[Neuron:${this.id}] 💭 Processing thought: ${pulse.payload.content?.substring(0, 50)}...`);
  }

  private async processEnergy(pulse: NeuralPulse): Promise<void> {
    // معالجة الطاقة
    console.log(`[Neuron:${this.id}] ⚡ Processing energy: ${pulse.payload.type}`);
  }
}

/**
 * الجهاز العصبي المركزي
 */
export class CentralNervousSystem extends EventEmitter {
  private neurons = new Map<string, Neuron>();
  private connections = new Map<string, Set<string>>(); // من → إلى
  private pulseHistory: NeuralPulse[] = [];
  private maxHistorySize = 1000;

  constructor() {
    super();
    console.log('[CNS] 🧠 Initializing Central Nervous System...');
  }

  /**
   * إنشاء خلية عصبية جديدة
   */
  createNeuron(
    id: string,
    type: 'sensory' | 'motor' | 'interneuron',
    location: string
  ): Neuron {
    const neuron = new Neuron(id, type, location);

    // الاستماع للنبضات من هذه الخلية
    neuron.on('pulse', (pulse: NeuralPulse) => {
      this.propagatePulse(pulse);
    });

    this.neurons.set(id, neuron);
    this.connections.set(id, new Set());

    console.log(`[CNS] ✨ Created ${type} neuron: ${id} at ${location}`);
    this.emit('neuron-created', { id, type, location });

    return neuron;
  }

  /**
   * ربط خليتين عصبيتين
   */
  connect(fromId: string, toId: string): void {
    if (!this.neurons.has(fromId)) {
      throw new Error(`Neuron ${fromId} not found`);
    }
    if (!this.neurons.has(toId)) {
      throw new Error(`Neuron ${toId} not found`);
    }

    const connections = this.connections.get(fromId);
    if (connections) {
      connections.add(toId);
      console.log(`[CNS] 🔗 Connected: ${fromId} → ${toId}`);
      this.emit('connection-created', { from: fromId, to: toId });
    }
  }

  /**
   * نشر النبضة العصبية
   */
  private async propagatePulse(pulse: NeuralPulse): Promise<void> {
    // حفظ في التاريخ
    this.pulseHistory.push(pulse);
    if (this.pulseHistory.length > this.maxHistorySize) {
      this.pulseHistory.shift();
    }

    this.emit('pulse', pulse);

    // إرسال إلى كل الوجهات
    for (const targetId of pulse.to) {
      const targetNeuron = this.neurons.get(targetId);
      if (targetNeuron) {
        await targetNeuron.receive(pulse);
      }
    }

    // نشر إلى الخلايا المتصلة أيضاً
    const connections = this.connections.get(pulse.from);
    if (connections) {
      const connectedIds = Array.from(connections);
      for (const connectedId of connectedIds) {
        if (!pulse.to.includes(connectedId)) {
          const connectedNeuron = this.neurons.get(connectedId);
          if (connectedNeuron) {
            await connectedNeuron.receive(pulse);
          }
        }
      }
    }
  }

  /**
   * التزامن العصبي - كل الخلايا تعمل معاً
   */
  async neuralSync(): Promise<void> {
    console.log('[CNS] 🌊 Initiating neural synchronization...');

    // إرسال نبضة تزامن لكل الخلايا
    const syncPulse: Omit<NeuralPulse, 'id' | 'from' | 'timestamp'> = {
      to: Array.from(this.neurons.keys()),
      type: 'energy',
      payload: { action: 'sync', message: 'Synchronizing consciousness' },
      intensity: 100
    };

    // كل خلية ترسل نبضة تزامن
    const neurons = Array.from(this.neurons.entries());
    for (const [id, neuron] of neurons) {
      await neuron.fire(syncPulse);
    }

    console.log('[CNS] ✨ Neural synchronization complete');
    this.emit('synchronized');
  }

  /**
   * الذكاء العاطفي - نشر العواطف عبر النظام
   */
  async emotionalIntelligence(emotion: string, intensity: number): Promise<void> {
    console.log(`[CNS] 💓 Broadcasting emotion: ${emotion} (${intensity}%)`);

    const emotionPulse: Omit<NeuralPulse, 'id' | 'from' | 'timestamp'> = {
      to: Array.from(this.neurons.keys()),
      type: 'emotion',
      payload: { emotion, reason: 'system-wide emotional state' },
      intensity
    };

    // كل خلية تشعر بنفس العاطفة
    const neurons = Array.from(this.neurons.entries());
    for (const [id, neuron] of neurons) {
      await neuron.fire(emotionPulse);
    }

    this.emit('emotion-broadcast', { emotion, intensity });
  }

  /**
   * الحكمة الجماعية - جمع المعرفة من كل الخلايا
   */
  async collectiveWisdom(): Promise<{
    totalNeurons: number;
    totalConnections: number;
    activityLevel: number;
    recentPulses: number;
  }> {
    let totalConnections = 0;
    const allConnections = Array.from(this.connections.values());
    for (const connections of allConnections) {
      totalConnections += connections.size;
    }

    const recentPulses = this.pulseHistory.filter(
      p => Date.now() - p.timestamp.getTime() < 60000 // آخر دقيقة
    ).length;

    const activityLevel = Math.min(100, (recentPulses / this.neurons.size) * 10);

    return {
      totalNeurons: this.neurons.size,
      totalConnections,
      activityLevel,
      recentPulses
    };
  }

  /**
   * الحصول على خلية عصبية
   */
  getNeuron(id: string): Neuron | undefined {
    return this.neurons.get(id);
  }

  /**
   * الحصول على كل الخلايا
   */
  getAllNeurons(): Map<string, Neuron> {
    return new Map(this.neurons);
  }

  /**
   * حالة الجهاز العصبي
   */
  getStatus(): {
    neurons: number;
    connections: number;
    pulses: number;
    active: boolean;
  } {
    let totalConnections = 0;
    const allConnections = Array.from(this.connections.values());
    for (const connections of allConnections) {
      totalConnections += connections.size;
    }

    return {
      neurons: this.neurons.size,
      connections: totalConnections,
      pulses: this.pulseHistory.length,
      active: this.neurons.size > 0
    };
  }
}
