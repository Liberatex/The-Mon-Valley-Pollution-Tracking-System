import { db } from '../firebase';
import { collection, addDoc, getDocs, query, orderBy, where } from 'firebase/firestore';

export interface UserFeedback {
  id: string;
  timestamp: Date;
  userId: string;
  component: string;
  rating: number;
  feedback: string;
  usability: {
    easeOfUse: number;
    clarity: number;
    accessibility: number;
    performance: number;
  };
  suggestions: string;
  sessionDuration: number;
  interactions: UserInteraction[];
}

export interface UserInteraction {
  timestamp: Date;
  action: string;
  component: string;
  success: boolean;
  timeToComplete: number;
}

export interface FeedbackAnalytics {
  totalFeedback: number;
  averageRating: number;
  componentRatings: { [key: string]: number };
  usabilityScores: {
    easeOfUse: number;
    clarity: number;
    accessibility: number;
    performance: number;
  };
  commonSuggestions: string[];
  sessionDurationStats: {
    average: number;
    min: number;
    max: number;
  };
}

class FeedbackService {
  private readonly COLLECTION_NAME = 'userFeedback';

  /**
   * Submit user feedback to Firestore
   */
  async submitFeedback(feedback: UserFeedback): Promise<string> {
    try {
      const feedbackData = {
        ...feedback,
        timestamp: new Date(),
        createdAt: new Date(),
      };

      const docRef = await addDoc(collection(db, this.COLLECTION_NAME), feedbackData);
      console.log('Feedback submitted successfully:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('Error submitting feedback:', error);
      throw new Error('Failed to submit feedback');
    }
  }

  /**
   * Get all feedback for analysis
   */
  async getAllFeedback(): Promise<UserFeedback[]> {
    try {
      const q = query(
        collection(db, this.COLLECTION_NAME),
        orderBy('timestamp', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const feedback: UserFeedback[] = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        feedback.push({
          id: doc.id,
          ...data,
          timestamp: data.timestamp.toDate(),
        } as UserFeedback);
      });
      
      return feedback;
    } catch (error) {
      console.error('Error fetching feedback:', error);
      throw new Error('Failed to fetch feedback');
    }
  }

  /**
   * Get feedback for a specific component
   */
  async getFeedbackByComponent(component: string): Promise<UserFeedback[]> {
    try {
      const q = query(
        collection(db, this.COLLECTION_NAME),
        where('component', '==', component),
        orderBy('timestamp', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const feedback: UserFeedback[] = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        feedback.push({
          id: doc.id,
          ...data,
          timestamp: data.timestamp.toDate(),
        } as UserFeedback);
      });
      
      return feedback;
    } catch (error) {
      console.error('Error fetching component feedback:', error);
      throw new Error('Failed to fetch component feedback');
    }
  }

  /**
   * Get recent feedback (last 30 days)
   */
  async getRecentFeedback(days: number = 30): Promise<UserFeedback[]> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);
      
      const q = query(
        collection(db, this.COLLECTION_NAME),
        where('timestamp', '>=', cutoffDate),
        orderBy('timestamp', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const feedback: UserFeedback[] = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        feedback.push({
          id: doc.id,
          ...data,
          timestamp: data.timestamp.toDate(),
        } as UserFeedback);
      });
      
      return feedback;
    } catch (error) {
      console.error('Error fetching recent feedback:', error);
      throw new Error('Failed to fetch recent feedback');
    }
  }

  /**
   * Generate analytics from feedback data
   */
  async generateAnalytics(): Promise<FeedbackAnalytics> {
    try {
      const allFeedback = await this.getAllFeedback();
      
      if (allFeedback.length === 0) {
        return {
          totalFeedback: 0,
          averageRating: 0,
          componentRatings: {},
          usabilityScores: {
            easeOfUse: 0,
            clarity: 0,
            accessibility: 0,
            performance: 0,
          },
          commonSuggestions: [],
          sessionDurationStats: {
            average: 0,
            min: 0,
            max: 0,
          },
        };
      }

      // Calculate average rating
      const totalRating = allFeedback.reduce((sum, feedback) => sum + feedback.rating, 0);
      const averageRating = totalRating / allFeedback.length;

      // Calculate component ratings
      const componentRatings: { [key: string]: number[] } = {};
      allFeedback.forEach(feedback => {
        if (!componentRatings[feedback.component]) {
          componentRatings[feedback.component] = [];
        }
        componentRatings[feedback.component].push(feedback.rating);
      });

      const componentAverages: { [key: string]: number } = {};
      Object.keys(componentRatings).forEach(component => {
        const ratings = componentRatings[component];
        componentAverages[component] = ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length;
      });

      // Calculate usability scores
      const totalUsability = allFeedback.reduce(
        (sum, feedback) => ({
          easeOfUse: sum.easeOfUse + feedback.usability.easeOfUse,
          clarity: sum.clarity + feedback.usability.clarity,
          accessibility: sum.accessibility + feedback.usability.accessibility,
          performance: sum.performance + feedback.usability.performance,
        }),
        { easeOfUse: 0, clarity: 0, accessibility: 0, performance: 0 }
      );

      const usabilityScores = {
        easeOfUse: totalUsability.easeOfUse / allFeedback.length,
        clarity: totalUsability.clarity / allFeedback.length,
        accessibility: totalUsability.accessibility / allFeedback.length,
        performance: totalUsability.performance / allFeedback.length,
      };

      // Extract common suggestions
      const suggestions = allFeedback
        .map(feedback => feedback.suggestions)
        .filter(suggestion => suggestion.trim().length > 0);

      // Calculate session duration stats
      const durations = allFeedback.map(feedback => feedback.sessionDuration);
      const sessionDurationStats = {
        average: durations.reduce((sum, duration) => sum + duration, 0) / durations.length,
        min: Math.min(...durations),
        max: Math.max(...durations),
      };

      return {
        totalFeedback: allFeedback.length,
        averageRating,
        componentRatings: componentAverages,
        usabilityScores,
        commonSuggestions: suggestions,
        sessionDurationStats,
      };
    } catch (error) {
      console.error('Error generating analytics:', error);
      throw new Error('Failed to generate analytics');
    }
  }

  /**
   * Get feedback summary for dashboard
   */
  async getFeedbackSummary(): Promise<{
    totalFeedback: number;
    averageRating: number;
    recentFeedback: number;
    topComponent: string;
  }> {
    try {
      const analytics = await this.generateAnalytics();
      const recentFeedback = await this.getRecentFeedback(7); // Last 7 days
      
      const topComponent = Object.keys(analytics.componentRatings).reduce((a, b) => 
        analytics.componentRatings[a] > analytics.componentRatings[b] ? a : b
      );

      return {
        totalFeedback: analytics.totalFeedback,
        averageRating: Math.round(analytics.averageRating * 10) / 10,
        recentFeedback: recentFeedback.length,
        topComponent,
      };
    } catch (error) {
      console.error('Error getting feedback summary:', error);
      throw new Error('Failed to get feedback summary');
    }
  }
}

export const feedbackService = new FeedbackService();
export default feedbackService; 