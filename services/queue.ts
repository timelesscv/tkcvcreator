
import { supabase } from './supabaseClient';
import { GoogleGenAI } from "@google/genai";

export type JobType = 'remove-bg' | 'passport-scan';

export interface BackgroundJob {
  id: string;
  user_id: string;
  type: JobType;
  status: 'pending' | 'completed' | 'failed';
  payload: any;
  result: any;
  error: string | null;
  created_at: string;
}

/**
 * Creates a new background job record
 */
export const createJob = async (userId: string, type: JobType, payload: any) => {
  const { data, error } = await supabase
    .from('background_jobs')
    .insert([{
      user_id: userId,
      type,
      status: 'pending',
      payload
    }])
    .select()
    .single();

  if (error) throw error;
  return data;
};

/**
 * Syncs statuses for a specific user's pending jobs
 */
export const syncUserJobStatuses = async (userId: string) => {
  // Get pending jobs for this user
  const { data: pendingJobs, error } = await supabase
    .from('background_jobs')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'pending');

  if (error || !pendingJobs || pendingJobs.length === 0) return;

  // Fix: Removed deprecated ai.models.get call and unused GoogleGenAI instance to follow guidelines
  for (const job of pendingJobs) {
    try {
      // In a real production scenario with long-running operations (like Video), 
      // we would check the operation status here. 
      // For current features (image processing), we can just re-trigger or wait.
      // Since image processing is usually fast, 'pending' usually means it was interrupted.
      // For now, we'll just check if they are stuck and mark them as failed after 10 mins.
      const createdAt = new Date(job.created_at).getTime();
      const now = new Date().getTime();
      const diffMinutes = (now - createdAt) / (1000 * 60);

      if (diffMinutes > 10) {
        await supabase
          .from('background_jobs')
          .update({ status: 'failed', error: 'Job timed out' })
          .eq('id', job.id);
      }
    } catch (e: any) {
      console.error(`Error syncing job ${job.id}:`, e);
    }
  }
};

/**
 * Global sync for all pending jobs (usually called by Cron)
 */
export const syncJobStatuses = async () => {
  const { data: pendingJobs } = await supabase
    .from('background_jobs')
    .select('*')
    .eq('status', 'pending');

  if (!pendingJobs) return;

  // Logic to process/check status of pending operations
  // ... similar to syncUserJobStatuses but for all
};
