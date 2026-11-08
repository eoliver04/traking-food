import {Provider} from '@nestjs/common';
import {ConfigService} from '@nestjs/config';
import {createClient, SupabaseClient} from '@supabase/supabase-js';
import {Database} from './database.types';
import {SUPABASE_CLIENT} from './supabase.constants';

export type AppSupabaseClient = SupabaseClient<Database>;

export const supabaseProvider: Provider<AppSupabaseClient> = {
    provide: SUPABASE_CLIENT,
    inject: [ConfigService],
    useFactory: (config: ConfigService): AppSupabaseClient =>
        createClient<Database>(
            config.getOrThrow<string>('SUPABASE_URL'),
            config.getOrThrow<string>('SUPABASE_SERVICE_ROLE_KEY'),
            {
                // Clave de servicio : no hay sesión de usuario que mantener
                auth: { persistSession: false, autoRefreshToken: false},
            },
        ),
};