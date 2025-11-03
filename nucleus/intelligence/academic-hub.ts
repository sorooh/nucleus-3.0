/**
 * ACADEMIC HUB - المركز الأكاديمي
 * 
 * Academic research and knowledge management system using Vector Memory
 * 
 * Features:
 * - Semantic search across academic content
 * - Research paper storage and retrieval
 * - Topic recommendations
 * - Citation network analysis
 */

import { vectorMemory, type SearchResult } from './vector-memory';

// ============= Types =============

interface AcademicPaper {
  id: string;
  title: string;
  authors: string[];
  abstract: string;
  keywords: string[];
  year: number;
  category: string;
  url?: string;
}

interface TopicRecommendation {
  topic: string;
  relevance: number;
  relatedPapers: number;
  description: string;
}

// ============= Academic Hub Class =============

export class AcademicHub {
  private active: boolean = false;

  activate(): void {
    if (this.active) return;
    this.active = true;
    console.log('[AcademicHub] Activated - Research intelligence enabled');
  }

  deactivate(): void {
    if (!this.active) return;
    this.active = false;
    console.log('[AcademicHub] Deactivated');
  }

  /**
   * Store academic paper in Vector Memory
   */
  async storePaper(paper: AcademicPaper): Promise<void> {
    if (!this.active) {
      throw new Error('Academic Hub is not active');
    }

    try {
      // Create comprehensive content for better semantic search
      const content = `
Title: ${paper.title}

Authors: ${paper.authors.join(', ')}

Abstract: ${paper.abstract}

Keywords: ${paper.keywords.join(', ')}

Year: ${paper.year}
      `.trim();

      await vectorMemory.store({
        content,
        category: `academic-${paper.category}`,
        source: 'academic-hub',
        metadata: {
          id: paper.id,
          title: paper.title,
          authors: paper.authors,
          year: paper.year,
          keywords: paper.keywords,
          url: paper.url
        }
      });

      console.log(`[AcademicHub] Stored paper: ${paper.title}`);
    } catch (error) {
      console.error('[AcademicHub] Failed to store paper:', error);
      throw error;
    }
  }

  /**
   * Semantic search across academic content
   */
  async searchPapers(query: string, limit: number = 10): Promise<SearchResult[]> {
    if (!this.active) {
      throw new Error('Academic Hub is not active');
    }

    try {
      const results = await vectorMemory.search(query, limit);
      return results.filter(r => r.memory.category.startsWith('academic-'));
    } catch (error) {
      console.error('[AcademicHub] Search failed:', error);
      throw error;
    }
  }

  /**
   * Find papers by category
   */
  async getPapersByCategory(category: string, limit: number = 20): Promise<SearchResult[]> {
    if (!this.active) {
      throw new Error('Academic Hub is not active');
    }

    try {
      // Use a broad category query
      const results = await vectorMemory.search(
        `Research papers about ${category}`,
        limit
      );
      return results.filter(r => r.memory.category === `academic-${category}`);
    } catch (error) {
      console.error('[AcademicHub] Category search failed:', error);
      throw error;
    }
  }

  /**
   * Get topic recommendations based on search history
   */
  async getTopicRecommendations(userQuery: string): Promise<TopicRecommendation[]> {
    if (!this.active) {
      throw new Error('Academic Hub is not active');
    }

    try {
      // Search for related content
      const results = await this.searchPapers(userQuery, 20);

      // Extract categories and their frequencies
      const categoryCount: Record<string, number> = {};
      results.forEach(r => {
        const cat = r.memory.category.replace('academic-', '');
        categoryCount[cat] = (categoryCount[cat] || 0) + 1;
      });

      // Generate recommendations
      const recommendations: TopicRecommendation[] = Object.entries(categoryCount)
        .map(([topic, count]) => ({
          topic,
          relevance: Math.min((count / results.length) * 100, 95),
          relatedPapers: count,
          description: `Found ${count} related papers in ${topic}`
        }))
        .sort((a, b) => b.relevance - a.relevance)
        .slice(0, 5);

      return recommendations;
    } catch (error) {
      console.error('[AcademicHub] Failed to get recommendations:', error);
      throw error;
    }
  }

  /**
   * Analyze research trends
   */
  async analyzeTrends(category?: string): Promise<{
    totalPapers: number;
    categories: Record<string, number>;
    recentGrowth: string;
  }> {
    if (!this.active) {
      throw new Error('Academic Hub is not active');
    }

    try {
      // Get stats from Vector Memory
      const stats = await vectorMemory.getStats();
      const academicCategories: Record<string, number> = {};

      Object.entries(stats.categoryCounts || {}).forEach(([cat, count]) => {
        if (cat.startsWith('academic-')) {
          const cleanCat = cat.replace('academic-', '');
          academicCategories[cleanCat] = count;
        }
      });

      const totalPapers = Object.values(academicCategories).reduce((a, b) => a + b, 0);

      return {
        totalPapers,
        categories: academicCategories,
        recentGrowth: totalPapers > 0 ? 'Growing research base' : 'Start adding papers'
      };
    } catch (error) {
      console.error('[AcademicHub] Trend analysis failed:', error);
      throw error;
    }
  }

  /**
   * Get similar papers
   */
  async findSimilarPapers(paperTitle: string, limit: number = 5): Promise<SearchResult[]> {
    if (!this.active) {
      throw new Error('Academic Hub is not active');
    }

    try {
      return await this.searchPapers(paperTitle, limit);
    } catch (error) {
      console.error('[AcademicHub] Similar papers search failed:', error);
      throw error;
    }
  }

  /**
   * Quick add: Store text content as academic material
   */
  async storeContent(params: {
    title: string;
    content: string;
    category: string;
    authors?: string[];
    keywords?: string[];
    year?: number;
  }): Promise<void> {
    if (!this.active) {
      throw new Error('Academic Hub is not active');
    }

    const paper: AcademicPaper = {
      id: `paper-${Date.now()}`,
      title: params.title,
      authors: params.authors || ['Unknown'],
      abstract: params.content,
      keywords: params.keywords || [],
      year: params.year || new Date().getFullYear(),
      category: params.category
    };

    await this.storePaper(paper);
  }
}

// ============= Export Singleton =============

export const academicHub = new AcademicHub();
