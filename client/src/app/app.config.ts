import { HttpClient, provideHttpClient, withInterceptors, withInterceptorsFromDi } from '@angular/common/http';
import { APP_INITIALIZER, ApplicationConfig, importProvidersFrom } from '@angular/core';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { TranslateLoader, TranslateModule, TranslateService } from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';
import { firstValueFrom } from 'rxjs';
import { routes } from './app.routes';
import { authInterceptor } from './core/interceptors/auth-interceptor';
import { httpErrorInterceptor } from './core/interceptors/http-error.interceptor';
import { ServerConfigService } from './core/services/server-config/server-config.service';

export function HttpLoaderFactory(http: HttpClient) {
    return new TranslateHttpLoader(http, './assets/i18n/', '.json');
}

export function preloadTranslations(translate: TranslateService) {
    return () => {
        translate.setDefaultLang('en');
        return firstValueFrom(translate.use('en'));
    };
}

export const appConfig: ApplicationConfig = {
    providers: [
        provideRouter(routes),
        provideHttpClient(withInterceptorsFromDi(), withInterceptors([httpErrorInterceptor, authInterceptor])),
        provideAnimations(),
        ServerConfigService,
        { provide: APP_INITIALIZER, useFactory: (config: ServerConfigService) => () => config.load(), deps: [ServerConfigService], multi: true },
        importProvidersFrom(
            TranslateModule.forRoot({
                loader: {
                    provide: TranslateLoader,
                    useFactory: HttpLoaderFactory,
                    deps: [HttpClient]
                }
            })
        ),
        { provide: APP_INITIALIZER, useFactory: preloadTranslations, deps: [TranslateService], multi: true },
    ],
};
