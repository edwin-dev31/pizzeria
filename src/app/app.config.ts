import { ApplicationConfig, InjectionToken } from '@angular/core';
import { provideRouter } from '@angular/router';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { routes } from './app.routes';
import { environment } from '../environments/environment';

export const SUPABASE_CLIENT = new InjectionToken<SupabaseClient>('supabase.client');

function createSupabaseClient(): SupabaseClient {
  return createClient(environment.supabase.url, environment.supabase.anonKey, {
    auth: {
      persistSession: true,
      detectSessionInUrl: false,
      lock: (name, acquireTimeout, fn) => fn(),
    },
  });
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    {
      provide: SUPABASE_CLIENT,
      useFactory: createSupabaseClient,
    },
  ],
};
